/**
 * Image Caching Utilities
 * 
 * Provides cache-busting functionality to prevent browser from caching images
 * that are frequently updated (like training images being regenerated).
 */

/**
 * Add a cache-busting timestamp query parameter to an image URL
 * This forces the browser to fetch fresh images instead of using cached versions
 * 
 * @param url - The original image URL
 * @param forceRefresh - If true, always adds new timestamp. If false, preserves existing timestamp.
 * @returns URL with cache-busting parameter
 */
export function addCacheBustingParam(url: string | undefined | null, forceRefresh = false): string {
  // Handle null/undefined/empty strings
  if (!url || typeof url !== 'string') {
    console.warn('[CacheBusting] Invalid URL provided:', url);
    return url || '';
  }
  
  // Don't add cache busting to data URLs or external URLs
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If forceRefresh is false and URL already has a timestamp, return as-is
  if (!forceRefresh && url.includes('_t=')) {
    return url;
  }
  
  try {
    // Parse URL to preserve other query parameters
    const [basePath, queryString] = url.split('?');
    const timestamp = Date.now();
    
    if (forceRefresh && queryString) {
      // Remove old _t= parameter if it exists, keep other params
      const params = queryString.split('&').filter(param => !param.startsWith('_t='));
      const otherParams = params.length > 0 ? params.join('&') + '&' : '';
      return `${basePath}?${otherParams}_t=${timestamp}`;
    }
    
    // Add timestamp with appropriate separator
    const separator = queryString ? '&' : '?';
    const result = queryString 
      ? `${basePath}?${queryString}${separator}_t=${timestamp}`
      : `${basePath}${separator}_t=${timestamp}`;
    
    return result;
  } catch (error) {
    console.error('[CacheBusting] Error processing URL:', url, error);
    // Return original URL on error to avoid breaking images
    return url;
  }
}

/**
 * Create a cache-busting key for React component keys
 * Useful for forcing re-renders when images change
 * 
 * @param identifier - A unique identifier for the image (e.g., filename)
 * @param refreshKey - A refresh counter or timestamp
 * @returns A unique key string
 */
export function createImageKey(identifier: string, refreshKey: number | string): string {
  return `${identifier}-${refreshKey}`;
}

/**
 * Global image refresh counter
 * Can be incremented to force all images to refresh
 */
let globalRefreshCounter = 0;

export function getGlobalRefreshCounter(): number {
  return globalRefreshCounter;
}

export function incrementGlobalRefreshCounter(): number {
  globalRefreshCounter++;
  return globalRefreshCounter;
}
