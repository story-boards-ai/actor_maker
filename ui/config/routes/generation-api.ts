import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { executePython } from '../utils/python-executor'
import { extractImageUrl, isBase64Data, saveBase64Image, downloadImage, replaceImageUrlInResponse } from '../utils/image-processor'
import { getStyleFolderName } from '../utils/path-helpers'

/**
 * API routes for image generation
 */
export function createGenerationApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // API endpoint to generate images with RunPod serverless
    if (url === '/api/generate-image' && req.method === 'POST') {
      handleImageGeneration(req, projectRoot, res)
      return
    }
    
    // API endpoint to generate training images in batch
    if (url === '/api/training-data/generate' && req.method === 'POST') {
      handleTrainingDataGeneration(req, projectRoot, res)
      return
    }
    
    // API endpoint to delete a training image
    if (url.startsWith('/api/training-data/delete') && req.method === 'POST') {
      handleTrainingDataDelete(req, projectRoot, res)
      return
    }
    
    // API endpoint to save a generated image as training image
    if (url === '/api/training-data/save-generated' && req.method === 'POST') {
      handleSaveGeneratedImage(req, projectRoot, res)
      return
    }
    
    next()
  }
}

function handleImageGeneration(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const requestData = JSON.parse(body)
      const { payload, styleId, imageName, mode } = requestData
      
      console.log('='.repeat(80))
      console.log('[IMAGE-GEN] Image generation request received')
      console.log('[IMAGE-GEN] Mode:', mode || 'text-to-image')
      console.log('[IMAGE-GEN] Style ID:', styleId)
      console.log('[IMAGE-GEN] Image Name:', imageName)
      console.log('[IMAGE-GEN] Payload workflow nodes:', Object.keys(payload.input?.workflow || {}).length)
      console.log('[IMAGE-GEN] Model URLs:', payload.input?.model_urls?.length || 0)
      
      // Save request to debug file
      const debugDir = path.join(projectRoot, 'debug')
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true })
      }
      const requestPath = path.join(debugDir, 'generation_request.json')
      fs.writeFileSync(requestPath, JSON.stringify(requestData, null, 2))
      console.log('[IMAGE-GEN] Request saved to:', requestPath)
      
      // Execute Python script
      const pythonPath = path.join(projectRoot, 'scripts', 'generate_image.py')
      const result = await executePython({
        scriptPath: pythonPath,
        cwd: projectRoot,
        stdinData: payload,
        logPrefix: '[IMAGE-GEN]',
      })
      
      if (result.exitCode !== 0) {
        console.error('[IMAGE-GEN] Generation FAILED')
        console.error('[IMAGE-GEN] Exit code:', result.exitCode)
        console.error('[IMAGE-GEN] STDERR:', result.stderr)
        console.error('[IMAGE-GEN] STDOUT (first 500 chars):', result.stdout.substring(0, 500))
        console.log('='.repeat(80))
        res.statusCode = 500
        res.end(JSON.stringify({ 
          error: result.stderr || 'Image generation failed',
          details: {
            exitCode: result.exitCode,
            stderr: result.stderr,
            stdout: result.stdout.substring(0, 500),
          },
        }))
        return
      }
      
      const parsedResult = JSON.parse(result.stdout)
      console.log('[IMAGE-GEN] ✅ SUCCESS')
      console.log('[IMAGE-GEN] Result status:', parsedResult.status)
      
      // Save response to debug file
      const responsePath = path.join(debugDir, 'generation_response.json')
      fs.writeFileSync(responsePath, JSON.stringify(parsedResult, null, 2))
      console.log('[IMAGE-GEN] Response saved to:', responsePath)
      
      // Download and save the generated image
      if (parsedResult.status === 'COMPLETED' && parsedResult.output) {
        const imageUrl = extractImageUrl(parsedResult)
        
        if (imageUrl) {
          console.log('[IMAGE-GEN] Processing generated image...')
          
          const imagePath = path.join(debugDir, 'generated_result.jpg')
          const localUrl = '/debug/generated_result.jpg'
          
          if (isBase64Data(imageUrl)) {
            // It's base64 data - decode and save directly
            console.log('[IMAGE-GEN] Image is base64 data, decoding...')
            try {
              saveBase64Image(imageUrl, imagePath)
              console.log('[IMAGE-GEN] Image saved to:', imagePath)
              replaceImageUrlInResponse(parsedResult, localUrl)
              console.log('[IMAGE-GEN] Returning local URL:', localUrl)
            } catch (err) {
              console.error('[IMAGE-GEN] Error decoding base64:', err)
            }
          } else {
            // It's a URL - download it
            console.log('[IMAGE-GEN] Image is URL, downloading...')
            try {
              const urlObj = new URL(imageUrl)
              console.log('[IMAGE-GEN] Image URL host:', urlObj.host)
            } catch (e) {
              console.log('[IMAGE-GEN] Image URL (first 100 chars):', imageUrl.substring(0, 100) + '...')
            }
            
            try {
              await downloadImage(imageUrl, imagePath)
              console.log('[IMAGE-GEN] Image saved to:', imagePath)
              replaceImageUrlInResponse(parsedResult, localUrl)
              console.log('[IMAGE-GEN] Returning local URL:', localUrl)
            } catch (err) {
              console.error('[IMAGE-GEN] Error downloading image:', err)
            }
          }
        } else {
          console.log('[IMAGE-GEN] No image URL found in response')
        }
      }
      
      console.log('='.repeat(80))
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(parsedResult))
    } catch (err) {
      console.error('[IMAGE-GEN] Request processing error:', err)
      console.log('='.repeat(80))
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(err) }))
    }
  })
}

function handleTrainingDataGeneration(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const requestData = JSON.parse(body)
      const { images, workflow, settings, styleId, styleLoraName, loraStrengthModel, loraStrengthClip, promptFrontpad, promptBackpad, isMonochrome, monochromeContrast, monochromeBrightness } = requestData
      
      console.log('='.repeat(80))
      console.log('[TRAINING-DATA] Batch generation request received')
      console.log('[TRAINING-DATA] Style ID:', styleId)
      console.log('[TRAINING-DATA] Images to process:', images.length)
      console.log('[TRAINING-DATA] LoRA:', styleLoraName)
      console.log('[TRAINING-DATA] Monochrome:', isMonochrome)
      if (isMonochrome) {
        console.log('[TRAINING-DATA]   - Contrast:', monochromeContrast)
        console.log('[TRAINING-DATA]   - Brightness:', monochromeBrightness)
      }
      
      // Execute Python script
      const pythonPath = path.join(projectRoot, 'scripts', 'generate_training_images.py')
      const stdinData = {
        images,
        workflow,
        settings,
        styleLoraName,
        loraStrengthModel,
        loraStrengthClip,
        promptFrontpad,
        promptBackpad,
        isMonochrome: isMonochrome || false,
        monochromeContrast: monochromeContrast || 1.0,
        monochromeBrightness: monochromeBrightness || 1.0,
      }
      
      const result = await executePython({
        scriptPath: pythonPath,
        cwd: projectRoot,
        stdinData,
        logPrefix: '[TRAINING-DATA]',
      })
      
      if (result.exitCode !== 0) {
        console.error('[TRAINING-DATA] Generation FAILED')
        console.log('='.repeat(80))
        res.statusCode = 500
        res.end(JSON.stringify({ 
          error: result.stderr || 'Training data generation failed',
          details: { exitCode: result.exitCode, stderr: result.stderr },
        }))
        return
      }
      
      const parsedResult = JSON.parse(result.stdout)
      console.log('[TRAINING-DATA] ✅ Batch complete')
      console.log('[TRAINING-DATA] Success:', parsedResult.successful, 'Failed:', parsedResult.failed)
      
      // Save successful images to training data folder
      const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
        const style = registry.styles.find((s: any) => s.id === styleId)
        
        if (style) {
          const folderName = getStyleFolderName(styleId, style.title)
          const trainingDir = path.join(projectRoot, 'resources', 'style_images', folderName)
          
          // Create directory if it doesn't exist
          if (!fs.existsSync(trainingDir)) {
            fs.mkdirSync(trainingDir, { recursive: true })
          }
          
          // Save each successful image
          for (const item of parsedResult.results) {
            if (item.success && item.result) {
              const genResult = item.result
              const imageUrl = extractImageUrl(genResult)
              
              if (imageUrl && isBase64Data(imageUrl)) {
                try {
                  const basename = item.filename.replace(/\.[^.]+$/, '')
                  const trainingFilename = `${basename}_training.jpg`
                  const savePath = path.join(trainingDir, trainingFilename)
                  
                  const fileExists = fs.existsSync(savePath)
                  if (fileExists) {
                    console.log('[TRAINING-DATA] 🔄 Recreating: deleting old files...')
                    // Delete old training image and caption when recreating
                    deleteTrainingImageWithCaption(savePath)
                  }
                  
                  saveBase64Image(imageUrl, savePath)
                  console.log('[TRAINING-DATA] ✅ Saved:', savePath)
                  item.trainingFilename = trainingFilename
                } catch (saveErr) {
                  console.error('[TRAINING-DATA] ❌ Failed to save:', item.filename, saveErr)
                }
              }
            }
          }
        }
      }
      
      console.log('='.repeat(80))
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(parsedResult))
    } catch (err) {
      console.error('[TRAINING-DATA] Request processing error:', err)
      console.log('='.repeat(80))
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(err) }))
    }
  })
}

/**
 * Delete training image and its caption file
 */
function deleteTrainingImageWithCaption(imagePath: string): void {
  // Delete the image file
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath)
    console.log('[TRAINING-DATA] ✅ Deleted image:', imagePath)
  }
  
  // Delete the caption file (.txt)
  const captionPath = imagePath.replace(/\.(jpg|jpeg|png|webp)$/i, '.txt')
  if (fs.existsSync(captionPath)) {
    fs.unlinkSync(captionPath)
    console.log('[TRAINING-DATA] ✅ Deleted caption:', captionPath)
  }
}

function handleTrainingDataDelete(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const { styleId, filename } = JSON.parse(body)
      
      const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
        const style = registry.styles.find((s: any) => s.id === styleId)
        
        if (style) {
          const folderName = getStyleFolderName(styleId, style.title)
          const filePath = path.join(projectRoot, 'resources', 'style_images', folderName, filename)
          
          if (fs.existsSync(filePath)) {
            // Delete both image and caption file
            deleteTrainingImageWithCaption(filePath)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
            return
          }
        }
      }
      
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'File not found' }))
    } catch (err) {
      console.error('[TRAINING-DATA] Delete error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to delete file' }))
    }
  })
}

function handleSaveGeneratedImage(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const { styleId, baseImageFilename, generatedImageUrl } = JSON.parse(body)
      
      console.log('[SAVE-TRAINING] Request received')
      console.log('[SAVE-TRAINING] Style ID:', styleId)
      console.log('[SAVE-TRAINING] Base image:', baseImageFilename)
      console.log('[SAVE-TRAINING] Generated image URL:', generatedImageUrl?.substring(0, 100) + '...')
      
      const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
      if (!fs.existsSync(registryPath)) {
        throw new Error('Styles registry not found')
      }
      
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      const style = registry.styles.find((s: any) => s.id === styleId)
      
      if (!style) {
        throw new Error(`Style ${styleId} not found`)
      }
      
      // Create training directory
      const folderName = getStyleFolderName(styleId, style.title)
      const trainingDir = path.join(projectRoot, 'resources', 'style_images', folderName)
      
      if (!fs.existsSync(trainingDir)) {
        fs.mkdirSync(trainingDir, { recursive: true })
        console.log('[SAVE-TRAINING] Created directory:', trainingDir)
      }
      
      // Generate training filename
      const basename = baseImageFilename.replace(/\.[^.]+$/, '')
      const trainingFilename = `${basename}_training.jpg`
      const savePath = path.join(trainingDir, trainingFilename)
      
      // Download or decode the image
      if (generatedImageUrl.startsWith('/debug/')) {
        // It's a local file, copy it
        const cleanUrl = generatedImageUrl.split('?')[0]
        const sourcePath = path.join(projectRoot, cleanUrl)
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, savePath)
          console.log('[SAVE-TRAINING] ✅ Copied from:', sourcePath)
          console.log('[SAVE-TRAINING] ✅ Saved to:', savePath)
        } else {
          throw new Error(`Source file not found: ${sourcePath}`)
        }
      } else if (generatedImageUrl.startsWith('data:') || !generatedImageUrl.startsWith('http')) {
        // It's base64 data
        saveBase64Image(generatedImageUrl, savePath)
        console.log('[SAVE-TRAINING] ✅ Saved from base64:', savePath)
      } else {
        // It's a URL, download it
        await downloadImage(generatedImageUrl, savePath)
        console.log('[SAVE-TRAINING] ✅ Downloaded and saved:', savePath)
      }
      
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ 
        success: true, 
        filename: trainingFilename,
        path: `/resources/style_images/${folderName}/${encodeURIComponent(trainingFilename)}`,
      }))
    } catch (err) {
      console.error('[SAVE-TRAINING] Error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(err) }))
    }
  })
}
