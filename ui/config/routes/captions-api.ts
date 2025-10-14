import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { IncomingMessage, ServerResponse } from 'http'
import { executePython } from '../utils/python-executor'
import { getStyleFolderName } from '../utils/path-helpers'

/**
 * Calculate MD5 hash of a file (matches S3 ETag for non-multipart uploads)
 */
function calculateMD5(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(fileBuffer).digest('hex')
}

/**
 * API routes for caption management (style-specific training data)
 */
export function createCaptionsApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // API endpoint to get training images for a style with caption status
    if (url.startsWith('/api/styles/') && url.includes('/training-images-with-captions')) {
      const styleMatch = url.match(/\/api\/styles\/(\d+)\/training-images-with-captions/)
      if (styleMatch) {
        handleStyleTrainingImagesWithCaptions(styleMatch[1], projectRoot, res)
        return
      }
    }
    
    // API endpoint to read a caption file from style folder
    if (url.startsWith('/api/styles/') && url.includes('/caption/read/')) {
      const match = url.match(/\/api\/styles\/(\d+)\/caption\/read\/(.+)/)
      if (match) {
        handleStyleCaptionRead(match[1], match[2], projectRoot, res)
        return
      }
    }
    
    // API endpoint to save a caption file to style folder
    if (url.startsWith('/api/styles/') && url.includes('/caption/save/') && req.method === 'POST') {
      const match = url.match(/\/api\/styles\/(\d+)\/caption\/save\/(.+)/)
      if (match) {
        handleStyleCaptionSave(match[1], match[2], req, projectRoot, res)
        return
      }
    }
    
    // API endpoint to generate captions for style training images
    if (url.startsWith('/api/styles/') && url.includes('/caption/generate') && req.method === 'POST') {
      const match = url.match(/\/api\/styles\/(\d+)\/caption\/generate/)
      if (match) {
        handleStyleCaptionGenerate(match[1], req, projectRoot, res)
        return
      }
    }
    
    next()
  }
}

function handleStyleTrainingImagesWithCaptions(styleId: string, projectRoot: string, res: ServerResponse) {
  const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
  
  if (!fs.existsSync(registryPath)) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Styles registry not found' }))
    return
  }
  
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
    const style = registry.styles.find((s: any) => s.id === styleId)
    
    if (!style) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Style not found' }))
      return
    }
    
    const folderName = getStyleFolderName(styleId, style.title)
    const dirPath = path.join(projectRoot, 'resources', 'style_images', folderName)
    
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ 
        images: [], 
        count: 0,
        style: { id: styleId, title: style.title },
        message: 'No training images found for this style'
      }))
      return
    }
    
    const files = fs.readdirSync(dirPath)
      .filter(file => /\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(file))
      .sort()
      .map(file => {
        const basename = file.replace(/\.[^.]+$/, '')
        const captionFilename = `${basename}.txt`
        const captionPath = path.join(dirPath, captionFilename)
        const hasCaption = fs.existsSync(captionPath)
        const encodedFile = encodeURIComponent(file)
        const filePath = path.join(dirPath, file)
        const stats = fs.statSync(filePath)
        
        // Calculate MD5 hash for the image
        const md5 = calculateMD5(filePath)
        
        // Calculate MD5 hash for caption if it exists
        let captionMd5: string | undefined
        if (hasCaption) {
          captionMd5 = calculateMD5(captionPath)
        }
        
        return {
          filename: file,
          path: `/resources/style_images/${encodeURIComponent(folderName)}/${encodedFile}`,
          captionFile: captionFilename,
          hasCaption,
          size: stats.size,
          md5,
          captionMd5,
        }
      })
    
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ 
      images: files, 
      count: files.length,
      style: { id: styleId, title: style.title, folderName },
    }))
  } catch (err) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to load training images' }))
  }
}

function handleStyleCaptionRead(styleId: string, filename: string, projectRoot: string, res: ServerResponse) {
  const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
  
  if (!fs.existsSync(registryPath)) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Styles registry not found' }))
    return
  }
  
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
    const style = registry.styles.find((s: any) => s.id === styleId)
    
    if (!style) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Style not found' }))
      return
    }
    
    const folderName = getStyleFolderName(styleId, style.title)
    // Decode the filename to handle spaces and special characters properly
    const decodedFilename = decodeURIComponent(filename)
    const captionPath = path.join(projectRoot, 'resources', 'style_images', folderName, decodedFilename)
    
    if (fs.existsSync(captionPath)) {
      const content = fs.readFileSync(captionPath, 'utf-8')
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ caption: content }))
      return
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ caption: '' }))
  } catch (err) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to read caption' }))
  }
}

function handleStyleCaptionSave(styleId: string, filename: string, req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
  
  if (!fs.existsSync(registryPath)) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Styles registry not found' }))
    return
  }
  
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      const style = registry.styles.find((s: any) => s.id === styleId)
      
      if (!style) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Style not found' }))
        return
      }
      
      const folderName = getStyleFolderName(styleId, style.title)
      // Decode the filename to handle spaces and special characters properly
      const decodedFilename = decodeURIComponent(filename)
      const captionPath = path.join(projectRoot, 'resources', 'style_images', folderName, decodedFilename)
      
      const { caption } = JSON.parse(body)
      fs.writeFileSync(captionPath, caption, 'utf-8')
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true }))
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to save caption' }))
    }
  })
}

function handleStyleCaptionGenerate(styleId: string, req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
  
  if (!fs.existsSync(registryPath)) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Styles registry not found' }))
    return
  }
  
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      const style = registry.styles.find((s: any) => s.id === styleId)
      
      if (!style) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Style not found' }))
        return
      }
      
      const folderName = getStyleFolderName(styleId, style.title)
      const styleFolderPath = path.join(projectRoot, 'resources', 'style_images', folderName)
      
      const { images, systemPrompt, userPrompt, model } = JSON.parse(body)
      
      // Validate that prompts are provided
      if (!systemPrompt || !userPrompt) {
        res.statusCode = 400
        res.end(JSON.stringify({ 
          error: 'Missing required prompts',
          details: {
            hasSystemPrompt: !!systemPrompt,
            hasUserPrompt: !!userPrompt,
            message: 'Both systemPrompt and userPrompt are required. Make sure the UI is sending them correctly.'
          }
        }))
        return
      }
      
      // Get trigger words from style registry (format: "style SBai_style_16")
      const triggerWords = style.trigger_words || `style SBai_style_${styleId}`
      
      // Replace [TRIGGER] placeholder with actual trigger words in prompts
      const finalSystemPrompt = systemPrompt.replace(/\[TRIGGER\]/g, triggerWords)
      const finalUserPrompt = userPrompt.replace(/\[TRIGGER\]/g, triggerWords)
      
      console.log(`📌 [CAPTION-GEN] Using trigger words from registry: "${triggerWords}"`)
      
      // Convert paths to filesystem paths
      const imagesWithFsPaths = images.map((img: any) => {
        const filename = img.filename
        const fs_path = path.join(styleFolderPath, filename)
        return {
          ...img,
          path: fs_path,
        }
      })
      
      const pythonPath = path.join(projectRoot, 'scripts', 'generate_captions.py')
      const stdinData = { 
        images: imagesWithFsPaths, 
        systemPrompt: finalSystemPrompt, 
        userPrompt: finalUserPrompt, 
        model: model || 'gpt-4o' 
      }
      
      const result = await executePython({
        scriptPath: pythonPath,
        cwd: projectRoot,
        stdinData,
        logPrefix: '[CAPTION-GEN]',
      })
      
      if (result.exitCode !== 0) {
        console.error('==========================================')
        console.error('CAPTION GENERATION FAILED')
        console.error('Exit code:', result.exitCode)
        console.error('STDERR output:', result.stderr)
        console.error('STDOUT output:', result.stdout)
        console.error('==========================================')
        res.statusCode = 500
        res.end(JSON.stringify({ 
          error: result.stderr || 'Failed to generate captions',
          details: {
            exitCode: result.exitCode,
            stderr: result.stderr,
            stdout: result.stdout,
          },
        }))
        return
      }
      
      try {
        const parsedResult = JSON.parse(result.stdout)
        
        // Log based on actual success/failure
        if (parsedResult.successful > 0) {
          console.log(`✅ Caption generation: ${parsedResult.successful} succeeded, ${parsedResult.failed} failed (${parsedResult.total} total)`)
        } else {
          console.error(`❌ Caption generation FAILED: ${parsedResult.failed} failed (${parsedResult.total} total)`)
          if (parsedResult.results && parsedResult.results.length > 0) {
            parsedResult.results.forEach((r: any) => {
              if (!r.success) {
                console.error(`   - ${r.filename}: ${r.error}`)
              }
            })
          }
        }
        
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(parsedResult))
      } catch (err) {
        console.error('==========================================')
        console.error('FAILED TO PARSE PYTHON OUTPUT')
        console.error('Parse error:', err)
        console.error('Raw output:', result.stdout)
        console.error('Raw stderr:', result.stderr)
        console.error('==========================================')
        res.statusCode = 500
        res.end(JSON.stringify({ 
          error: 'Failed to parse generation results',
          details: {
            parseError: String(err),
            rawOutput: result.stdout.substring(0, 500),
            rawStderr: result.stderr.substring(0, 500),
          },
        }))
      }
    } catch (err) {
      console.error('==========================================')
      console.error('CAPTION GENERATION REQUEST ERROR')
      console.error('Error:', err)
      console.error('Stack:', err instanceof Error ? err.stack : 'N/A')
      console.error('==========================================')
      res.statusCode = 500
      res.end(JSON.stringify({ 
        error: String(err),
        details: {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
      }))
    }
  })
}
