/**
 * MIME type mapping for various file extensions
 */
export const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
}

/**
 * Get content type for a file extension
 */
export function getContentType(ext: string): string {
  return CONTENT_TYPES[ext.toLowerCase()] || 'application/octet-stream'
}
