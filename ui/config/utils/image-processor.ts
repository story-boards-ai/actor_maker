import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { URL } from 'url'

/**
 * Extract image URL from RunPod response (handles multiple response formats)
 */
export function extractImageUrl(result: any): string | null {
  if (!result.output) return null
  
  // Try various response formats
  const locations = [
    result.output.job_results?.images?.[0],
    result.output.output?.images?.[0],
    result.output.images?.[0],
    result.output.message?.images?.[0],
    result.output.image,
  ]
  
  for (const img of locations) {
    if (!img) continue
    const url = typeof img === 'string' ? img : img.url
    if (url) return url
  }
  
  return null
}

/**
 * Check if a string is base64 data (not a URL)
 */
export function isBase64Data(data: string): boolean {
  return !data.startsWith('http://') && !data.startsWith('https://')
}

/**
 * Extract base64 data from data URL or raw base64
 */
export function extractBase64(data: string): string {
  return data.includes(',') ? data.split(',')[1] : data
}

/**
 * Save base64 image to file
 */
export function saveBase64Image(base64Data: string, filePath: string): void {
  const cleanBase64 = extractBase64(base64Data)
  const imageBuffer = Buffer.from(cleanBase64, 'base64')
  fs.writeFileSync(filePath, imageBuffer)
}

/**
 * Download image from URL and save to file
 */
export async function downloadImage(imageUrl: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(imageUrl)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    
    protocol.get(imageUrl, (imgRes) => {
      const fileStream = fs.createWriteStream(filePath)
      imgRes.pipe(fileStream)
      
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
      
      fileStream.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * Replace image URL in RunPod response with local path
 */
export function replaceImageUrlInResponse(result: any, localUrl: string): void {
  if (!result.output) return
  
  const replacements = [
    { path: 'output.job_results.images[0]', obj: result.output.job_results?.images },
    { path: 'output.output.images[0]', obj: result.output.output?.images },
    { path: 'output.images[0]', obj: result.output.images },
  ]
  
  for (const { obj } of replacements) {
    if (!obj?.[0]) continue
    
    if (typeof obj[0] === 'string') {
      obj[0] = localUrl
    } else if (obj[0].url) {
      obj[0].url = localUrl
    }
  }
}
