import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { executePython } from '../utils/python-executor'
import { extractImageUrl, isBase64Data, saveBase64Image } from '../utils/image-processor'

/**
 * API routes for base image generation
 */
export function createBaseImageApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // POST /api/generate-base-image - Generate a new base image for an actor
    if (url === '/api/generate-base-image' && req.method === 'POST') {
      handleGenerateBaseImage(req, projectRoot, res)
      return
    }
    
    next()
  }
}

/**
 * Generate a base image for an actor
 * 
 * Request body:
 * {
 *   actorName: string,      // e.g., "0100_european_25_male"
 *   description: string,    // e.g., "european 25 year old male with short brown hair"
 *   width?: number,         // default: 1024
 *   height?: number,        // default: 1536
 *   steps?: number,         // default: 25
 *   seed?: number          // default: -1 (random)
 * }
 */
function handleGenerateBaseImage(
  req: IncomingMessage,
  projectRoot: string,
  res: ServerResponse
) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const requestData = JSON.parse(body)
      const { 
        actorName, 
        description, 
        width = 1024, 
        height = 1536, 
        steps = 25, 
        seed = -1 
      } = requestData
      
      // Validate required fields
      if (!actorName || !description) {
        res.statusCode = 400
        res.end(JSON.stringify({ 
          error: 'Missing required fields: actorName and description are required' 
        }))
        return
      }
      
      console.log('='.repeat(80))
      console.log('[BASE-IMAGE] Base image generation request received')
      console.log('[BASE-IMAGE] Actor Name:', actorName)
      console.log('[BASE-IMAGE] Description:', description)
      console.log('[BASE-IMAGE] Dimensions:', `${width}x${height}`)
      console.log('[BASE-IMAGE] Steps:', steps)
      console.log('[BASE-IMAGE] Seed:', seed)
      
      // Execute Python script
      const pythonPath = path.join(projectRoot, 'scripts', 'generate_base_image.py')
      const args = [actorName, description, width.toString(), height.toString(), steps.toString(), seed.toString()]
      
      console.log('[BASE-IMAGE] Executing:', pythonPath)
      console.log('[BASE-IMAGE] Args:', args)
      
      const result = await executePython({
        scriptPath: pythonPath,
        args,
        cwd: projectRoot,
        logPrefix: '[BASE-IMAGE]',
      })
      
      if (result.exitCode !== 0) {
        console.error('[BASE-IMAGE] Generation FAILED')
        console.error('[BASE-IMAGE] Exit code:', result.exitCode)
        console.error('[BASE-IMAGE] STDERR:', result.stderr)
        console.error('[BASE-IMAGE] STDOUT:', result.stdout)
        console.log('='.repeat(80))
        res.statusCode = 500
        res.end(JSON.stringify({ 
          error: result.stderr || 'Base image generation failed',
          details: {
            exitCode: result.exitCode,
            stderr: result.stderr,
            stdout: result.stdout,
          },
        }))
        return
      }
      
      const parsedResult = JSON.parse(result.stdout)
      console.log('[BASE-IMAGE] ✅ SUCCESS')
      console.log('[BASE-IMAGE] Result status:', parsedResult.status)
      
      // Process and save the generated image
      if (parsedResult.status === 'COMPLETED' && parsedResult.output) {
        const imageUrl = extractImageUrl(parsedResult)
        
        if (imageUrl) {
          console.log('[BASE-IMAGE] Processing generated image...')
          
          // Create actor's base_image directory
          const actorDir = path.join(projectRoot, 'data', 'actors', actorName)
          const baseImageDir = path.join(actorDir, 'base_image')
          
          if (!fs.existsSync(baseImageDir)) {
            fs.mkdirSync(baseImageDir, { recursive: true })
            console.log('[BASE-IMAGE] Created directory:', baseImageDir)
          }
          
          // Save with standard naming: {actorName}_base.jpg
          const filename = `${actorName}_base.jpg`
          const imagePath = path.join(baseImageDir, filename)
          const relativeUrl = `/data/actors/${actorName}/base_image/${filename}`
          
          if (isBase64Data(imageUrl)) {
            // It's base64 data - decode and save directly
            console.log('[BASE-IMAGE] Image is base64 data, decoding...')
            try {
              saveBase64Image(imageUrl, imagePath)
              console.log('[BASE-IMAGE] ✅ Image saved to:', imagePath)
              
              // Add local path to response
              parsedResult.localPath = relativeUrl
              parsedResult.filename = filename
              
            } catch (err) {
              console.error('[BASE-IMAGE] Error decoding base64:', err)
            }
          } else {
            console.log('[BASE-IMAGE] Unexpected image format:', typeof imageUrl)
          }
        } else {
          console.log('[BASE-IMAGE] No image URL found in response')
        }
      }
      
      console.log('='.repeat(80))
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(parsedResult))
      
    } catch (err) {
      console.error('[BASE-IMAGE] Request processing error:', err)
      console.log('='.repeat(80))
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(err) }))
    }
  })
}
