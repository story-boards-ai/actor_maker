/**
 * Cache API Routes
 * 
 * Handles image caching operations:
 * - GET /api/cache/manifest - Get cache manifest
 * - GET /api/cache/image - Serve cached image
 * - GET /api/cache/exists - Check if cache file exists
 * - POST /api/cache/prefetch - Prefetch images
 * - POST /api/cache/invalidate - Invalidate cache entry
 * - POST /api/cache/clear/:actorId - Clear actor cache
 * - POST /api/cache/clear-all - Clear all cache
 */

import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';

const CACHE_DIR = '.image-cache';
const MANIFEST_FILE = path.join(CACHE_DIR, 'manifest.json');

interface CacheEntry {
  s3_url: string;
  local_path: string;
  cached_at: number;
  size_bytes: number;
  actor_id: string;
  filename: string;
  etag?: string;
}

interface CacheManifest {
  version: string;
  entries: Record<string, CacheEntry>;
  last_updated: number;
}

/**
 * Load cache manifest
 */
function loadManifest(projectRoot: string): CacheManifest {
  const manifestPath = path.join(projectRoot, MANIFEST_FILE);
  
  if (fs.existsSync(manifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (error) {
      console.error('Failed to load cache manifest:', error);
    }
  }

  return {
    version: '1.0',
    entries: {},
    last_updated: Date.now()
  };
}

/**
 * Save cache manifest
 */
function saveManifest(projectRoot: string, manifest: CacheManifest): void {
  const manifestPath = path.join(projectRoot, MANIFEST_FILE);
  const cacheDir = path.join(projectRoot, CACHE_DIR);

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  manifest.last_updated = Date.now();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Check if URL is an S3 URL
 */
function isS3Url(url: string): boolean {
  return url.includes('.s3.') || url.includes('.s3-') || url.includes('s3.amazonaws.com');
}

/**
 * Download image from S3 and cache locally
 */
async function downloadAndCache(
  s3_url: string,
  actorId: string,
  filename: string,
  projectRoot: string
): Promise<CacheEntry | null> {
  try {
    // Generate cache path
    const hash = crypto.createHash('md5').update(s3_url).digest('hex');
    const ext = path.extname(filename) || '.jpg';
    const cacheFilename = `${actorId}_${hash}${ext}`;
    const cachePath = path.join(CACHE_DIR, 'images', actorId, cacheFilename);
    const fullPath = path.join(projectRoot, cachePath);

    // Ensure directory exists
    const cacheDir = path.dirname(fullPath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    if (isS3Url(s3_url)) {
      // Use Python script with boto3 for authenticated S3 download
      const scriptPath = path.join(projectRoot, 'scripts', 'cache_s3_image.py');
      
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', [scriptPath, s3_url, fullPath]);
        
        let output = '';
        let errorOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          if (code === 0 && output) {
            try {
              const result = JSON.parse(output);
              
              if (result.success) {
                const entry: CacheEntry = {
                  s3_url,
                  local_path: cachePath,
                  cached_at: Date.now(),
                  size_bytes: result.size_bytes,
                  actor_id: actorId,
                  filename,
                  etag: result.etag || undefined
                };
                
                console.log(`✓ Cached ${filename} (${(result.size_bytes / 1024).toFixed(1)}KB)`);
                resolve(entry);
              } else {
                console.error(`S3 download failed for ${filename}:`, result.error);
                reject(new Error(result.error));
              }
            } catch (e) {
              console.error('Failed to parse Python output:', output);
              reject(new Error('Failed to parse download result'));
            }
          } else {
            console.error(`Python script failed for ${filename}:`, errorOutput);
            reject(new Error(errorOutput || 'Download failed'));
          }
        });
      });
    } else {
      // Fallback to HTTP download for non-S3 URLs
      const urlObj = new URL(s3_url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(fullPath);
        
        protocol.get(s3_url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
          if (response.statusCode !== 200) {
            file.close();
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }

          let size = 0;
          response.on('data', (chunk) => {
            size += chunk.length;
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve({
              s3_url,
              local_path: cachePath,
              cached_at: Date.now(),
              size_bytes: size,
              actor_id: actorId,
              filename,
              etag: response.headers.etag || undefined
            });
          });
        }).on('error', (err) => {
          file.close();
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
          reject(err);
        });
      });
    }
  } catch (error) {
    console.error(`Download failed for ${filename}:`, error);
    return null;
  }
}

/**
 * GET /api/cache/manifest
 */
export function handleGetManifest(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) {
  try {
    const manifest = loadManifest(projectRoot);
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(manifest));
  } catch (error) {
    console.error('Error getting manifest:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to get manifest' }));
  }
}

/**
 * GET /api/cache/image?path=...
 */
export function handleGetCachedImage(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const cachePath = url.searchParams.get('path');

    if (!cachePath) {
      res.statusCode = 400;
      res.end('Missing path parameter');
      return;
    }

    const fullPath = path.join(projectRoot, cachePath);

    // Security: ensure path is within cache directory
    const normalizedPath = path.normalize(fullPath);
    const cacheDir = path.join(projectRoot, CACHE_DIR);
    if (!normalizedPath.startsWith(cacheDir)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(fullPath)) {
      res.statusCode = 404;
      res.end('Image not found in cache');
      return;
    }

    // Determine content type
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Stream file
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (error) {
    console.error('Error serving cached image:', error);
    res.statusCode = 500;
    res.end('Internal server error');
  }
}

/**
 * GET /api/cache/exists?path=...
 */
export function handleCheckExists(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const cachePath = url.searchParams.get('path');

    if (!cachePath) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing path parameter' }));
      return;
    }

    const fullPath = path.join(projectRoot, cachePath);
    const exists = fs.existsSync(fullPath);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ exists }));
  } catch (error) {
    console.error('Error checking cache exists:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to check cache' }));
  }
}

/**
 * POST /api/cache/prefetch
 */
export function handlePrefetch(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { actor_id, images } = JSON.parse(body);

      if (!actor_id || !Array.isArray(images)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid request' }));
        return;
      }

      const manifest = loadManifest(projectRoot);
      let cached = 0;
      let failed = 0;

      for (const img of images) {
        // Skip if already cached
        if (manifest.entries[img.s3_url]) {
          const fullPath = path.join(projectRoot, manifest.entries[img.s3_url].local_path);
          if (fs.existsSync(fullPath)) {
            cached++;
            continue;
          }
        }

        // Download and cache with error handling
        try {
          const entry = await downloadAndCache(img.s3_url, actor_id, img.filename, projectRoot);
          if (entry) {
            manifest.entries[img.s3_url] = entry;
            cached++;
          } else {
            console.warn(`Failed to cache ${img.filename} for actor ${actor_id}`);
            failed++;
          }
        } catch (error) {
          console.error(`Error caching ${img.filename}:`, error instanceof Error ? error.message : error);
          failed++;
        }
      }

      // Save updated manifest
      saveManifest(projectRoot, manifest);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ cached, failed, total: images.length }));
    } catch (error) {
      console.error('Prefetch error:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Prefetch failed' }));
    }
  });
}

/**
 * POST /api/cache/invalidate
 */
export function handleInvalidate(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { s3_url } = JSON.parse(body);

      if (!s3_url) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing s3_url' }));
        return;
      }

      const manifest = loadManifest(projectRoot);
      const entry = manifest.entries[s3_url];

      if (entry) {
        // Delete cached file
        const fullPath = path.join(projectRoot, entry.local_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }

        // Remove from manifest
        delete manifest.entries[s3_url];
        saveManifest(projectRoot, manifest);
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('Invalidate error:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Invalidate failed' }));
    }
  });
}

/**
 * POST /api/cache/clear/:actorId
 */
export function handleClearActor(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    const manifest = loadManifest(projectRoot);
    let cleared = 0;

    // Find and delete all entries for this actor
    for (const [s3_url, entry] of Object.entries(manifest.entries)) {
      if (entry.actor_id === actorId) {
        const fullPath = path.join(projectRoot, entry.local_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        delete manifest.entries[s3_url];
        cleared++;
      }
    }

    saveManifest(projectRoot, manifest);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ cleared }));
  } catch (error) {
    console.error('Clear actor cache error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to clear actor cache' }));
  }
}

/**
 * POST /api/cache/clear-all
 */
export function handleClearAll(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) {
  try {
    const cacheDir = path.join(projectRoot, CACHE_DIR);

    // Delete entire cache directory
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }

    // Recreate with empty manifest
    fs.mkdirSync(cacheDir, { recursive: true });
    const manifest: CacheManifest = {
      version: '1.0',
      entries: {},
      last_updated: Date.now()
    };
    saveManifest(projectRoot, manifest);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Clear all cache error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to clear cache' }));
  }
}
