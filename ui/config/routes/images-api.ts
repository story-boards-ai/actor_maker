import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { IncomingMessage, ServerResponse } from 'http'
import { getStyleFolderName } from '../utils/path-helpers'

/**
 * Calculate MD5 hash of a file (matches S3 ETag for non-multipart uploads)
 */
function calculateMD5(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(fileBuffer).digest('hex')
}

/**
 * API routes for image listing and serving
 */
export function createImagesApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // API endpoint to get training images for a specific style by ID and version
    if (url.startsWith('/api/styles/')) {
      const styleMatch = url.match(/\/api\/styles\/(\d+)\/training-images\?version=(.+)/)
      if (styleMatch) {
        handleStyleTrainingImages(styleMatch[1], styleMatch[2], projectRoot, res)
        return
      }
    }
    
    // Legacy API endpoint to list training images for a style folder
    if (url.startsWith('/api/training-images/')) {
      const styleFolderMatch = url.match(/\/api\/training-images\/(.+)/)
      if (styleFolderMatch) {
        handleLegacyTrainingImages(styleFolderMatch[1], projectRoot, res)
        return
      }
    }
    
    // API endpoint to list input images with prompts
    if (url === '/api/input-images') {
      handleInputImages(projectRoot, res)
      return
    }
    
    next()
  }
}

function handleStyleTrainingImages(styleId: string, version: string, projectRoot: string, res: ServerResponse) {
  // V2: Show baseline input images for all styles
  if (version === 'v2') {
    const inputImagesPath = path.join(projectRoot, 'resources', 'input_images')
    
    if (fs.existsSync(inputImagesPath) && fs.statSync(inputImagesPath).isDirectory()) {
      // Load prompt_metadata.json for the actor to get good status
      const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json')
      let promptMetadata: any = { images: {} }
      
      if (fs.existsSync(actorsDataPath)) {
        try {
          const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'))
          const actor = actorsData.find((a: any) => a.id === parseInt(styleId))
          
          if (actor) {
            const promptMetadataPath = path.join(
              projectRoot,
              'data',
              'actors',
              actor.name,
              'training_data',
              'prompt_metadata.json'
            )
            
            if (fs.existsSync(promptMetadataPath)) {
              promptMetadata = JSON.parse(fs.readFileSync(promptMetadataPath, 'utf-8'))
            }
          }
        } catch (err) {
          console.error('[Images API] Error loading prompt metadata:', err)
        }
      }
      
      const files = fs.readdirSync(inputImagesPath)
        .filter(file => /\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(file))
        .sort()
        .map(file => {
          const encodedFile = encodeURIComponent(file)
          const basename = file.replace(/\.[^.]+$/, '')
          const promptPath = path.join(inputImagesPath, `${basename}.txt`)
          const hasPrompt = fs.existsSync(promptPath)
          
          // Get good status from prompt_metadata
          const goodStatus = promptMetadata.images?.[file]?.good || false
          
          return {
            filename: file,
            path: `/resources/input_images/${encodedFile}`,
            hasPrompt,
            isBaseline: true,
            good: goodStatus,
          }
        })
      
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ 
        images: files, 
        count: files.length,
        isBaseline: true,
        message: 'Baseline input images - will be replaced with styled versions',
      }))
      return
    }
  }
  
  // V1: Load style-specific training images
  const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
  
  if (fs.existsSync(registryPath)) {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      const style = registry.styles.find((s: any) => s.id === styleId)
      
      if (style) {
        const folderName = getStyleFolderName(styleId, style.title)
        const dirPath = path.join(projectRoot, 'resources', 'style_images', folderName)
        
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
          const files = fs.readdirSync(dirPath)
            .filter(file => /\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(file))
            .sort()
            .map(file => {
              const encodedFile = encodeURIComponent(file)
              const filePath = path.join(dirPath, file)
              const stats = fs.statSync(filePath)
              
              // Check for caption file
              const captionFilename = file.replace(/\.(jpg|jpeg|png|webp|gif|avif|bmp)$/i, '.txt')
              const captionPath = path.join(dirPath, captionFilename)
              const hasCaption = fs.existsSync(captionPath)
              
              // Calculate MD5 hash for the image
              const md5 = calculateMD5(filePath)
              
              // Calculate MD5 hash for caption if it exists
              let captionMd5: string | undefined
              if (hasCaption) {
                captionMd5 = calculateMD5(captionPath)
              }
              
              return {
                filename: file,
                path: `/resources/style_images/${folderName}/${encodedFile}`,
                isBaseline: false,
                size: stats.size,
                md5,
                hasCaption,
                captionFile: hasCaption ? captionFilename : undefined,
                captionMd5,
              }
            })
          
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ 
            images: files,
            count: files.length,
            isBaseline: false,
          }))
          return
        }
      }
    } catch (err) {
      console.error('[Images API] Error reading styles registry:', err)
    }
  }
  
  res.statusCode = 404
  res.end(JSON.stringify({ error: 'Training images not found', images: [] }))
}

function handleLegacyTrainingImages(styleFolder: string, projectRoot: string, res: ServerResponse) {
  const dirPath = path.join(projectRoot, 'resources', 'style_images', styleFolder)
  
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath)
      .filter(file => /\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(file))
      .map(file => {
        const encodedFile = encodeURIComponent(file)
        return `/resources/style_images/${styleFolder}/${encodedFile}`
      })
    
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ images: files, count: files.length }))
    return
  }
  
  res.statusCode = 404
  res.end(JSON.stringify({ error: 'Style folder not found' }))
}

function handleInputImages(projectRoot: string, res: ServerResponse) {
  const dirPath = path.join(projectRoot, 'resources', 'input_images')
  
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath)
      .filter(file => /\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(file))
      .map(file => {
        const basename = file.replace(/\.[^.]+$/, '')
        const promptPath = path.join(dirPath, `${basename}.txt`)
        const hasPrompt = fs.existsSync(promptPath)
        const encodedFile = encodeURIComponent(file)
        
        return {
          filename: file,
          path: `/resources/input_images/${encodedFile}`,
          promptFile: `${basename}.txt`,
          hasPrompt,
        }
      })
    
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ images: files, count: files.length }))
    return
  }
  
  res.statusCode = 404
  res.end(JSON.stringify({ error: 'Input images folder not found' }))
}
