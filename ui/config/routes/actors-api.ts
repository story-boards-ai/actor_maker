import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, execSync } from 'child_process';
import * as crypto from 'crypto';

/**
 * API routes for actor training data management
 */
export function createActorsApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // GET /api/actors - Get all actors
    if (url === '/api/actors' && req.method === 'GET') {
      handleGetAllActors(req, res, projectRoot);
      return;
    }

    // GET /api/actors/:actorId/training-data/prompts
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/prompts') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/prompts$/);
      if (match) {
        handleGetTrainingPrompts(req, res, projectRoot, match[1]);
        return;
      }
    }

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

    // POST /api/actors/:actorId/training-data/generate-all-prompts (MUST come before /generate)
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/generate-all-prompts') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/generate-all-prompts$/);
      if (match) {
        handleGenerateAllPromptImages(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/generate-single (MUST come before /generate)
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/generate-single') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/generate-single$/);
      if (match) {
        handleGenerateSingleTrainingImage(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/generate
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/generate') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/generate$/);
      if (match) {
        handleGenerateTrainingImages(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/delete
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/delete') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/delete$/);
      if (match) {
        handleDeleteTrainingImage(req, res, projectRoot, match[1]);
        return;
      }
    }

    // GET /api/actors/:actorId/training-prompts
    if (url?.startsWith('/api/actors/') && url.includes('/training-prompts') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-prompts$/);
      if (match) {
        handleGetPresetTrainingPrompts(req, res, projectRoot, match[1]);
        return;
      }
    }

    // GET /api/actors/:actorId/prompt-usage
    if (url?.startsWith('/api/actors/') && url.includes('/prompt-usage') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/prompt-usage$/);
      if (match) {
        handleGetPromptUsage(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/toggle-good
    if (url?.startsWith('/api/actors/') && url.includes('/toggle-good') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/toggle-good$/);
      if (match) {
        handleToggleGood(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/mark-good
    if (url?.startsWith('/api/actors/') && url.includes('/mark-good') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/mark-good$/);
      if (match) {
        handleMarkGood(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/:filename/toggle-good
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/') && url.includes('/toggle-good') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/([^/]+)\/toggle-good$/);
      if (match) {
        handleToggleTrainingImageGood(req, res, projectRoot, match[1], match[2]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/delete-all
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/delete-all') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/delete-all/);
      if (match) {
        handleDeleteAllTrainingData(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/regenerate-poster-frame
    if (url?.startsWith('/api/actors/') && url.includes('/regenerate-poster-frame') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/regenerate-poster-frame$/);
      if (match) {
        handleRegeneratePosterFrame(req, res, projectRoot, match[1]);
        return;
      }
    }

    // GET /api/actors/:actorId/training-versions
    if (url?.startsWith('/api/actors/') && url.includes('/training-versions') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-versions$/);
      if (match) {
        handleGetActorTrainingVersions(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-versions
    if (url?.startsWith('/api/actors/') && url.includes('/training-versions') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-versions$/);
      if (match) {
        handleSaveActorTrainingVersions(req, res, projectRoot, match[1]);
        return;
      }
    }

    next();
  };
}

/**
 * Handle GET /api/actors/:actorId/training-data/prompts
 * Returns all prompts from prompt_metadata.json for stylized image detection
 */
function handleGetTrainingPrompts(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    // Load actors data to get actor name
    const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
    if (!fs.existsSync(actorsDataPath)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Actors data not found' }));
      return;
    }

    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    const actor = actorsData.find((a: any) => a.id === parseInt(actorId));

    if (!actor) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Check for prompt_metadata.json
    const promptMetadataPath = path.join(
      projectRoot,
      'data',
      'actors',
      actor.name,
      'training_data',
      'prompt_metadata.json'
    );

    if (!fs.existsSync(promptMetadataPath)) {
      // No prompt metadata, return empty array
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ prompts: [] }));
      return;
    }

    // Read and parse prompt metadata
    const promptMetadata = JSON.parse(fs.readFileSync(promptMetadataPath, 'utf-8'));
    const prompts: string[] = [];

    // Extract all prompts from the images object
    if (promptMetadata.images) {
      Object.values(promptMetadata.images).forEach((imageData: any) => {
        if (imageData.prompt) {
          prompts.push(imageData.prompt);
        }
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ prompts }));
  } catch (error) {
    console.error('Error fetching training prompts:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch training prompts' }));
  }
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

    // Load prompt_metadata.json to get good status
    const promptMetadataPath = path.join(
      projectRoot,
      'data',
      'actors',
      actor.name,
      'training_data',
      'prompt_metadata.json'
    );
    let promptMetadata: any = { images: {} };
    if (fs.existsSync(promptMetadataPath)) {
      promptMetadata = JSON.parse(fs.readFileSync(promptMetadataPath, 'utf-8'));
    }

    // Check for base/poster image in multiple locations
    // NOTE: Only check base_image and poster_frame folders
    // Training images (_0, _1, etc.) should NOT be considered as base images
    const possibleImagePaths = [
      // Try base_image folder first (both .jpg and .png)
      path.join(projectRoot, 'data', 'actors', actor.name, 'base_image', `${actor.name}_base.jpg`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'base_image', `${actor.name}_base.png`),
      // Try poster_frame folder
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}_poster.png`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}_poster.jpg`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}.png`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}.jpg`)
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

      // Get good status from prompt_metadata
      const goodStatus = promptMetadata.images?.[filename]?.good || false;

      return {
        index,
        filename,
        s3_url: s3Url,
        local_exists: !!localFile,
        local_path: localFile ? `/data/actors/${actor.name}/training_data/${filename}` : null,
        local_hash: localFile?.hash || null,
        s3_hash: manifestHash,
        hash_match: localFile && manifestHash && localFile.hash ? localFile.hash === manifestHash : null,
        status,
        good: goodStatus
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
 * POST /api/actors/:actorId/training-data/generate-all-prompts
 * Generates one image for each available prompt
 */
function handleGenerateAllPromptImages(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      console.log('[Generate All Prompts] Received body length:', body.length);
      
      if (!body || body.length === 0) {
        throw new Error('Empty request body');
      }

      const { actor_name, base_image_path, actor_type, actor_sex } = JSON.parse(body);
      
      console.log('[Generate All Prompts] Parsed data:', { actor_name, base_image_path });

      // Convert relative path to absolute path
      const absoluteImagePath = base_image_path.startsWith('/data') 
        ? path.join(projectRoot, base_image_path)
        : base_image_path;

      console.log('[Generate All Prompts] Absolute path:', absoluteImagePath);

      // Call Python script to generate all prompt images
      const scriptPath = path.join(projectRoot, 'scripts', 'generate_all_prompt_images.py');
      const args = [scriptPath, actor_name, absoluteImagePath];
      if (actor_type) args.push(actor_type);
      if (actor_sex) args.push(actor_sex);

      console.log('[Generate All Prompts] Spawning Python with args:', args);

      const pythonProcess = spawn('python3', args);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        // Stream logs to console in real-time
        console.log('[Generate All Prompts - Python]', chunk.trim());
      });

      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        // Stream error/info logs to console in real-time (Python logging goes to stderr)
        console.log('[Generate All Prompts - Python Info]', chunk.trim());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            console.log('[Generate All Prompts] Completed successfully:', result);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (e) {
            console.log('[Generate All Prompts] Completed (no JSON output)');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Generation completed' }));
          }
        } else {
          console.error('All prompts generation failed:', errorOutput);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorOutput || 'Generation failed' }));
        }
      });
    } catch (error) {
      console.error('[Generate All Prompts] Error:', error);
      console.error('[Generate All Prompts] Body was:', body);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Invalid request body', 
        details: error instanceof Error ? error.message : 'Unknown error',
        bodyLength: body.length
      }));
    }
  });
}

/**
 * POST /api/actors/:actorId/training-data/generate-single
 * Generates a single training image using Replicate flux-kontext-pro
 */
function handleGenerateSingleTrainingImage(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      console.log('[Generate Single] Received body length:', body.length);
      console.log('[Generate Single] Body content:', body);
      
      if (!body || body.length === 0) {
        throw new Error('Empty request body');
      }

      const { actor_name, base_image_path, prompt, actor_type, actor_sex } = JSON.parse(body);
      
      console.log('[Generate Single] Parsed data:', { actor_name, base_image_path, prompt });

      // Convert relative path to absolute path
      const absoluteImagePath = base_image_path.startsWith('/data') 
        ? path.join(projectRoot, base_image_path)
        : base_image_path;

      console.log('[Generate Single] Absolute path:', absoluteImagePath);

      // Call Python script to generate single training image
      const scriptPath = path.join(projectRoot, 'scripts', 'generate_single_training_image.py');
      const args = [scriptPath, actor_name, absoluteImagePath, prompt];
      if (actor_type) args.push(actor_type);
      if (actor_sex) args.push(actor_sex);

      console.log('[Generate Single] Spawning Python with args:', args);

      const pythonProcess = spawn('python3', args);

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
            res.end(JSON.stringify({ success: true, message: 'Generation completed' }));
          }
        } else {
          console.error('Single image generation failed:', errorOutput);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorOutput || 'Generation failed' }));
        }
      });
    } catch (error) {
      console.error('[Generate Single] Error:', error);
      console.error('[Generate Single] Body was:', body);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Invalid request body', 
        details: error instanceof Error ? error.message : 'Unknown error',
        bodyLength: body.length
      }));
    }
  });
}

/**
 * GET /api/actors/:actorId/prompt-usage
 * Returns prompt usage statistics from metadata
 */
function handleGetPromptUsage(
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

    // Load prompt metadata
    const metadataPath = path.join(projectRoot, 'data', 'actors', actor.name, 'training_data', 'prompt_metadata.json');
    
    let promptUsage: Record<string, number> = {};
    
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      
      // Count usage per prompt
      Object.values(metadata.images || {}).forEach((img: any) => {
        const prompt = img.prompt;
        if (prompt) {
          promptUsage[prompt] = (promptUsage[prompt] || 0) + 1;
        }
      });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      actor_id: actor.id,
      actor_name: actor.name,
      prompt_usage: promptUsage
    }));
  } catch (error) {
    console.error('Error loading prompt usage:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load prompt usage', details: (error as Error).message }));
  }
}

/**
 * GET /api/actors/:actorId/training-prompts
 * Returns available training prompts for the actor
 */
function handleGetPresetTrainingPrompts(
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

    // Get prompts from Python module
    const actorType = actor.type?.toLowerCase() || 'human';
    const actorSex = actor.sex?.toLowerCase();
    
    // Call Python function to get training prompts
    const pythonScript = path.join(projectRoot, 'src', 'get_training_prompts.py');
    
    let promptsJson: string;
    try {
      promptsJson = execSync(
        `python3 "${pythonScript}" "${actorType}" "${actorSex || ''}"`,
        { encoding: 'utf-8', cwd: projectRoot }
      ).toString();
    } catch (error) {
      console.error('Error calling Python script:', error);
      throw new Error('Failed to load training prompts from Python');
    }
    
    const rawPrompts = JSON.parse(promptsJson);
    
    // Convert Python prompts to frontend format with IDs and labels
    const prompts = rawPrompts.map((prompt: string, index: number) => {
      // Determine category based on index (15 photo + 11 bw + 9 color = 35 total)
      let category: string;
      let label: string;
      
      if (index < 15) {
        category = 'photorealistic';
        label = `Photo ${index + 1}`;
      } else if (index < 26) {
        category = 'bw_stylized';
        label = `B&W ${index - 14}`;
      } else {
        category = 'color_stylized';
        label = `Color ${index - 25}`;
      }
      
      // Extract a short label from the prompt
      const firstSentence = prompt.split('.')[0];
      const shortLabel = firstSentence.length > 40 
        ? firstSentence.substring(0, 37) + '...'
        : firstSentence;
      
      return {
        id: `prompt_${index}`,
        category,
        label: shortLabel,
        prompt
      };
    });
    
    // Calculate descriptor for response
    const sex = actor.sex?.toLowerCase();
    const descriptor = sex === 'male' ? 'man' : sex === 'female' ? 'woman' : 'person';

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      actor_id: actor.id,
      actor_name: actor.name,
      descriptor,
      prompts
    }));
  } catch (error) {
    console.error('Error loading training prompts:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load training prompts', details: (error as Error).message }));
  }
}

/**
 * POST /api/actors/:actorId/toggle-good
 * Toggle actor as good/not good
 */
function handleToggleGood(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    // Load actorsData
    const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    const actorIndex = actorsData.findIndex((a: any) => a.id === parseInt(actorId));

    if (actorIndex === -1) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Toggle the 'good' flag
    const currentGood = actorsData[actorIndex].good || false;
    actorsData[actorIndex].good = !currentGood;

    // Save back to file
    fs.writeFileSync(actorsDataPath, JSON.stringify(actorsData, null, 2));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      actor_id: parseInt(actorId),
      good: actorsData[actorIndex].good
    }));
  } catch (error) {
    console.error('Error toggling good status:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to toggle good status' }));
  }
}

/**
 * POST /api/actors/:actorId/mark-good
 * Mark actor model as good (set to true, not toggle)
 */
function handleMarkGood(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    // Load actorsData
    const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    const actorIndex = actorsData.findIndex((a: any) => a.id === parseInt(actorId));

    if (actorIndex === -1) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Set the 'good' flag to true
    actorsData[actorIndex].good = true;

    // Save back to file
    fs.writeFileSync(actorsDataPath, JSON.stringify(actorsData, null, 2));

    console.log(`[Actors] Marked actor ${actorId} as good`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      actor_id: parseInt(actorId),
      good: true
    }));
  } catch (error) {
    console.error('Error marking actor as good:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to mark actor as good' }));
  }
}

/**
 * POST /api/actors/:actorId/training-data/:filename/toggle-good
 * Toggle training image as good/not good
 */
function handleToggleTrainingImageGood(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string,
  filename: string
) {
  try {
    // Decode the filename (it may be URL-encoded)
    const decodedFilename = decodeURIComponent(filename);
    
    // Load actorsData to get actor name
    const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    const actor = actorsData.find((a: any) => a.id === parseInt(actorId));

    if (!actor) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Path to prompt_metadata.json
    const metadataPath = path.join(
      projectRoot,
      'data',
      'actors',
      actor.name,
      'training_data',
      'prompt_metadata.json'
    );

    // Load or create metadata
    let metadata: any = { images: {} };
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }

    // Ensure images object exists
    if (!metadata.images) {
      metadata.images = {};
    }

    // Ensure the image entry exists
    if (!metadata.images[decodedFilename]) {
      metadata.images[decodedFilename] = {};
    }

    // Toggle the 'good' flag
    const currentGood = metadata.images[decodedFilename].good || false;
    metadata.images[decodedFilename].good = !currentGood;

    // Ensure directory exists
    const metadataDir = path.dirname(metadataPath);
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }

    // Save back to file
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      filename: decodedFilename,
      good: metadata.images[decodedFilename].good
    }));
  } catch (error) {
    console.error('Error toggling training image good status:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to toggle training image good status' }));
  }
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

/**
 * POST /api/actors/:actorId/training-data/delete-all
 * Deletes all training data from both local storage and S3
 */
function handleDeleteAllTrainingData(
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

      // Call Python script to delete all training data
      const scriptPath = path.join(projectRoot, 'scripts', 'delete_all_actor_training_data.py');
      const pythonProcess = spawn('python3', [
        scriptPath,
        actor_name
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
            res.end(JSON.stringify({ deleted: true, message: 'All training data deleted' }));
          }
        } else {
          console.error('Delete all failed:', errorOutput);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorOutput || 'Delete all failed' }));
        }
      });
    } catch (error) {
      console.error('Error deleting all training data:', error);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  });
}

/**
 * POST /api/actors/:actorId/regenerate-poster-frame
 * Regenerates poster frame for an actor using their trained LoRA model
 */
function handleRegeneratePosterFrame(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      console.log('[Regenerate Poster Frame] Received request for actor:', actorId);
      
      const { actor_name, lora_model_url, actor_description } = JSON.parse(body);

      console.log('[Regenerate Poster Frame] Parsed data:', { actor_name, lora_model_url });

      // Call Python script to regenerate poster frame
      const scriptPath = path.join(projectRoot, 'scripts', 'regenerate_poster_frame.py');
      const pythonProcess = spawn('python3', [
        scriptPath,
        actorId,
        actor_name,
        lora_model_url || '',
        actor_description || ''
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log('[Regenerate Poster Frame - Python]', chunk.trim());
      });

      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.log('[Regenerate Poster Frame - Python Info]', chunk.trim());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            console.log('[Regenerate Poster Frame] Completed successfully:', result);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (e) {
            console.log('[Regenerate Poster Frame] Completed (no JSON output)');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Poster frame regenerated' }));
          }
        } else {
          console.error('Poster frame regeneration failed:', errorOutput);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorOutput || 'Regeneration failed' }));
        }
      });
    } catch (error) {
      console.error('[Regenerate Poster Frame] Error:', error);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Invalid request body', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  });
}

/**
 * GET /api/actors
 * Get all actors from actorsData.json enriched with training data information
 */
function handleGetAllActors(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) {
  try {
    const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
    
    if (!fs.existsSync(actorsDataPath)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'actorsData.json not found' }));
      return;
    }

    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    
    // Enrich each actor with training data information
    const enrichedActors = actorsData.map((actor: any) => {
      const trainingDataDir = path.join(projectRoot, 'data', 'actors', actor.name, 'training_data');
      
      // Check if training data directory exists
      if (fs.existsSync(trainingDataDir)) {
        // Count training images (png and jpg files, excluding metadata files)
        const files = fs.readdirSync(trainingDataDir);
        const imageFiles = files.filter(f => 
          (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) && 
          !f.includes('response') && 
          !f.includes('request') && 
          !f.includes('metadata')
        );
        
        // Check if response.json exists (indicates S3 sync status)
        const responseJsonPath = path.join(trainingDataDir, 'response.json');
        const hasSyncedData = fs.existsSync(responseJsonPath);
        
        // Add training_data field to actor
        return {
          ...actor,
          training_data: {
            count: imageFiles.length,
            synced: hasSyncedData
          }
        };
      }
      
      // No training data directory
      return actor;
    });
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(enrichedActors));
  } catch (error) {
    console.error('Error loading actors:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load actors' }));
  }
}

/**
 * GET /api/actors/:actorId/training-versions
 * Get training versions for an actor
 */
function handleGetActorTrainingVersions(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    const versionsPath = getActorTrainingVersionsPath(actorId, projectRoot);
    
    if (!fs.existsSync(versionsPath)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ versions: [] }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ versions: data.versions || [] }));
  } catch (err: any) {
    console.error('[Actor Training Versions] Get error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load training versions' }));
  }
}

/**
 * POST /api/actors/:actorId/training-versions
 * Save training versions for an actor
 */
function handleSaveActorTrainingVersions(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { versions } = JSON.parse(body);
      const versionsPath = getActorTrainingVersionsPath(actorId, projectRoot);
      
      // Ensure directory exists
      const dir = path.dirname(versionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(versionsPath, JSON.stringify({ versions }, null, 2));
      
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err: any) {
      console.error('[Actor Training Versions] Save error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to save training versions' }));
    }
  });
}

/**
 * Get the path to training versions file for an actor
 */
function getActorTrainingVersionsPath(actorId: string, projectRoot: string): string {
  // Load actorsData to get actor name
  const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
  
  if (fs.existsSync(actorsDataPath)) {
    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    const actor = actorsData.find((a: any) => a.id === parseInt(actorId));
    
    if (actor) {
      const actorDir = path.join(projectRoot, 'data', 'actors', actor.name);
      if (!fs.existsSync(actorDir)) {
        fs.mkdirSync(actorDir, { recursive: true });
      }
      return path.join(actorDir, 'training_versions.json');
    }
  }
  
  // Fallback: create in a generic location
  const fallbackDir = path.join(projectRoot, 'data', 'actor_training_versions');
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  return path.join(fallbackDir, `${actorId}.json`);
}
