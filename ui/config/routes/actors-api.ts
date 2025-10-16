import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import * as crypto from 'crypto';

/**
 * API routes for actor training data management
 */
export function createActorsApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // GET /api/actors/:actorId/training-data
    if (url?.startsWith('/api/actors/') && url.includes('/training-data') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data$/);
      if (match) {
        handleGetTrainingData(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/sync-from-s3
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/sync-from-s3') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/sync-from-s3/);
      if (match) {
        handleSyncFromS3(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/sync-to-s3
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/sync-to-s3') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/sync-to-s3/);
      if (match) {
        handleSyncToS3(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/generate
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/generate') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/generate/);
      if (match) {
        handleGenerateTrainingImages(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/delete
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/delete') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/delete/);
      if (match) {
        handleDeleteTrainingImage(req, res, projectRoot, match[1]);
        return;
      }
    }

    next();
  };
}

/**
 * GET /api/actors/:actorId/training-data
 * Returns training data info including S3 URLs and local status with hash comparison
 */
function handleGetTrainingData(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    // Load actorsData to get actor info
    const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    const actor = actorsData.find((a: any) => a.id === parseInt(actorId));

    if (!actor) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Load manifest for hash information
    const manifestPath = path.join(
      projectRoot,
      'data',
      'actor_manifests',
      `${actorId.padStart(4, '0')}_manifest.json`
    );
    let manifest: any = null;
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }

    // Load training data response.json to get S3 URLs
    const trainingDataPath = path.join(
      projectRoot,
      'data',
      'actors',
      actor.name,
      'training_data',
      'response.json'
    );

    let s3Urls: string[] = [];
    if (fs.existsSync(trainingDataPath)) {
      const trainingData = JSON.parse(fs.readFileSync(trainingDataPath, 'utf-8'));
      s3Urls = trainingData.output?.output?.s3_image_urls || [];
    }

    // Check for base/poster image in multiple locations
    const possibleImagePaths = [
      // Try base_image folder first
      path.join(projectRoot, 'data', 'actors', actor.name, 'base_image', `${actor.name}_base.png`),
      // Try poster_frame folder
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}_poster.png`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}_poster.jpg`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}.png`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}.jpg`),
      // Try training_data folder for first image
      path.join(projectRoot, 'data', 'actors', actor.name, 'training_data', `${actor.name}_0.png`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'training_data', `${actor.name}_1.png`)
    ];
    
    let baseImagePath: string | null = null;
    let baseImageRelativePath: string | null = null;
    
    for (const imagePath of possibleImagePaths) {
      if (fs.existsSync(imagePath)) {
        baseImagePath = imagePath;
        // Convert to relative path for serving
        const relativePath = imagePath.replace(path.join(projectRoot, 'data'), '/data');
        baseImageRelativePath = relativePath;
        break;
      }
    }
    
    const hasBaseImage = baseImagePath !== null;

    // Get local images with hash calculation (only if manifest exists for comparison)
    const localImagesDir = path.join(
      projectRoot,
      'data',
      'actors',
      actor.name,
      'training_data'
    );
    
    const localImageMap = new Map<string, { path: string; hash: string | null }>();
    const shouldCalculateHashes = manifest && manifest.training_data;
    
    if (fs.existsSync(localImagesDir)) {
      const files = fs.readdirSync(localImagesDir)
        .filter(f => (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) && f !== 'response.json');
      
      for (const filename of files) {
        const filePath = path.join(localImagesDir, filename);
        
        // Only calculate hash if we have manifest data to compare against
        let hash: string | null = null;
        if (shouldCalculateHashes) {
          const fileBuffer = fs.readFileSync(filePath);
          hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
        }
        
        localImageMap.set(filename, { path: filePath, hash });
      }
    }

    // Build training images array with status indicators
    const trainingImages = s3Urls.map((s3Url, index) => {
      const filename = s3Url.split('/').pop() || `image_${index}.png`;
      const localFile = localImageMap.get(filename);
      
      // Get hash from manifest if available
      let manifestHash: string | null = null;
      if (manifest?.training_data) {
        const manifestEntry = manifest.training_data.find((td: any) => 
          td.filename === filename || td.s3_url === s3Url
        );
        if (manifestEntry) {
          manifestHash = manifestEntry.md5_hash;
        }
      }

      // Determine status based on available information
      let status: 's3_only' | 'local_only' | 'synced' | 'mismatch';
      if (!localFile) {
        status = 's3_only';
      } else if (!manifestHash) {
        // No manifest hash available, assume synced if local exists
        status = 'synced';
      } else if (localFile.hash === manifestHash) {
        status = 'synced';
      } else if (localFile.hash === null) {
        // Hash not calculated (optimization), assume synced
        status = 'synced';
      } else {
        status = 'mismatch';
      }

      return {
        index,
        filename,
        s3_url: s3Url,
        local_exists: !!localFile,
        local_path: localFile ? `/data/actors/${actor.name}/training_data/${filename}` : null,
        local_hash: localFile?.hash || null,
        s3_hash: manifestHash,
        hash_match: localFile && manifestHash && localFile.hash ? localFile.hash === manifestHash : null,
        status
      };
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      actor_id: actor.id,
      actor_name: actor.name,
      training_images: trainingImages,
      base_image_path: baseImageRelativePath,
      total_count: trainingImages.length,
      local_count: trainingImages.filter(img => img.local_exists).length,
      synced_count: trainingImages.filter(img => img.status === 'synced').length
    }));
  } catch (error) {
    console.error('Error loading actor training data:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load training data', details: (error as Error).message }));
  }
}

/**
 * POST /api/actors/:actorId/training-data/sync-from-s3
 * Downloads training images from S3 to local storage
 */
function handleSyncFromS3(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { actor_name, s3_urls } = JSON.parse(body);

      // Call Python script to download from S3
      const scriptPath = path.join(projectRoot, 'scripts', 'sync_actor_training_from_s3.py');
      const pythonProcess = spawn('python3', [
        scriptPath,
        actor_name,
        JSON.stringify(s3_urls)
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (e) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ downloaded: s3_urls.length, message: 'Sync completed' }));
          }
        } else {
          console.error('Sync from S3 failed:', errorOutput);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorOutput || 'Sync failed' }));
        }
      });
    } catch (error) {
      console.error('Error parsing request:', error);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  });
}

/**
 * POST /api/actors/:actorId/training-data/sync-to-s3
 * Uploads local training images to S3
 */
function handleSyncToS3(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { actor_name } = JSON.parse(body);

      // Call Python script to upload to S3
      const scriptPath = path.join(projectRoot, 'scripts', 'sync_actor_training_to_s3.py');
      const pythonProcess = spawn('python3', [scriptPath, actor_name]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (e) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ uploaded: 0, message: 'Sync completed' }));
          }
        } else {
          console.error('Sync to S3 failed:', errorOutput);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorOutput || 'Sync failed' }));
        }
      });
    } catch (error) {
      console.error('Error parsing request:', error);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  });
}

/**
 * POST /api/actors/:actorId/training-data/generate
 * Generates training images from base image
 */
function handleGenerateTrainingImages(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { actor_name, base_image_path, count } = JSON.parse(body);

      // Call Python script to generate training images
      const scriptPath = path.join(projectRoot, 'scripts', 'generate_actor_training_images.py');
      const pythonProcess = spawn('python3', [
        scriptPath,
        actor_name,
        base_image_path,
        count.toString()
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (e) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ generated: count, message: 'Generation completed' }));
          }
        } else {
          console.error('Generation failed:', errorOutput);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorOutput || 'Generation failed' }));
        }
      });
    } catch (error) {
      console.error('Error parsing request:', error);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  });
}

/**
 * POST /api/actors/:actorId/training-data/delete
 * Deletes a training image from both local storage and S3
 */
function handleDeleteTrainingImage(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { actor_name, filename, s3_url } = JSON.parse(body);

      // Call Python script to delete from local and S3
      const scriptPath = path.join(projectRoot, 'scripts', 'delete_actor_training_image.py');
      const pythonProcess = spawn('python3', [
        scriptPath,
        actor_name,
        filename,
        s3_url
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (e) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ deleted: true, message: 'Delete completed' }));
          }
        } else {
          console.error('Delete failed:', errorOutput);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorOutput || 'Delete failed' }));
        }
      });
    } catch (error) {
      console.error('Error deleting training image:', error);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  });
}
