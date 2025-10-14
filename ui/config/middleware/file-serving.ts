import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { getContentType } from '../utils/content-types'

/**
 * Middleware to serve files from multiple directories
 */
export function createFileServingMiddleware(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // Serve styles_registry.json from ../data
    if (url === '/styles_registry.json') {
      const filePath = path.join(projectRoot, 'data', 'styles_registry.json')
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-cache')
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }
    
    // Serve workflows from ../workflows
    if (url.startsWith('/workflows/')) {
      const filePath = path.join(projectRoot, url)
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/json')
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }
    
    // Serve debug files from ../debug
    if (url.startsWith('/debug/')) {
      const urlWithoutQuery = url.split('?')[0]
      const decodedUrl = decodeURIComponent(urlWithoutQuery)
      const filePath = path.join(projectRoot, decodedUrl)
      
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase()
        res.setHeader('Content-Type', getContentType(ext))
        // Aggressive no-cache headers for debug files
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.setHeader('Surrogate-Control', 'no-store')
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }
    
    // Serve resources (images) from ../resources
    if (url.startsWith('/resources/')) {
      const urlWithoutQuery = url.split('?')[0]
      const decodedUrl = decodeURIComponent(urlWithoutQuery)
      const filePath = path.join(projectRoot, decodedUrl)
      
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase()
        res.setHeader('Content-Type', getContentType(ext))
        
        // Use no-cache for training images (they change frequently), cache others
        if (decodedUrl.includes('_training.')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          res.setHeader('Pragma', 'no-cache')
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000')
        }
        
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }
    
    // Serve style poster images from public folder
    if (url.startsWith('/public/')) {
      const decodedUrl = decodeURIComponent(url)
      const filePath = path.join(projectRoot, 'ui', decodedUrl)
      
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase()
        res.setHeader('Content-Type', getContentType(ext))
        res.setHeader('Cache-Control', 'public, max-age=31536000')
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }
    
    next()
  }
}
