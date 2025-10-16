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

    // GET /api/actors - Get all actors
    if (url === '/api/actors' && req.method === 'GET') {
      handleGetAllActors(req, res, projectRoot);
      return;
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
        handleGetTrainingPrompts(req, res, projectRoot, match[1]);
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
function handleGetTrainingPrompts(
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

    // Determine descriptor based on actor attributes
    const sex = actor.sex?.toLowerCase();
    const descriptor = sex === 'male' ? 'man' : sex === 'female' ? 'woman' : 'person';

    // Define preset prompts (matching actor_training_prompts.py structure)
    // 25 total: 15 photorealistic (urban/nature/water/outdoor mix) + 6 B&W + 4 color
    const prompts = [
      // PHOTOREALISTIC PROMPTS (15 total)
      {
        id: 'rain_street',
        category: 'photorealistic',
        label: 'Urban Night - Rain Street',
        prompt: `The ${descriptor} runs across a rain-slick street at night, mid-stride, lit by car headlights from the side. Three-quarter back angle. Reflections on the asphalt, no other figures in frame.`
      },
      {
        id: 'forest_dawn',
        category: 'photorealistic',
        label: 'Nature - Misty Forest',
        prompt: `The ${descriptor} walks through a misty forest at dawn, sunlight filtering through tall pine trees. Medium shot from behind, soft morning light creating long shadows. Character moving deeper into the woods.`
      },
      {
        id: 'beach_golden',
        category: 'photorealistic',
        label: 'Water - Rocky Beach Sunset',
        prompt: `The ${descriptor} stands at the edge of a rocky beach at golden hour, waves crashing nearby, gazing out at the ocean horizon. Side profile, warm orange sunset light, hair moving in the wind.`
      },
      {
        id: 'portrait_natural',
        category: 'photorealistic',
        label: 'Urban - Close-up Portrait',
        prompt: `Close-up portrait of the ${descriptor}'s face in natural lighting, eyes gazing off to the side. Photorealistic, sharp focus on facial features, neutral expression, head turned away from camera. Preserve all defining details.`
      },
      {
        id: 'mountain_climb',
        category: 'photorealistic',
        label: 'Nature - Mountain Trail',
        prompt: `The ${descriptor} climbs a rocky mountain trail at midday, hands gripping stone, eyes focused upward on the path. Low angle shot, bright sunlight creating harsh shadows, blue sky above.`
      },
      {
        id: 'lake_dock',
        category: 'photorealistic',
        label: 'Water - Lake Dock Dusk',
        prompt: `The ${descriptor} sits on a weathered wooden dock at dusk, feet dangling over calm lake water, watching ripples spread. Back three-quarter view, soft purple-blue twilight, silhouette against the water.`
      },
      {
        id: 'window_light',
        category: 'photorealistic',
        label: 'Urban - Window Reflection',
        prompt: `Close-up of the ${descriptor} looking out a rain-streaked window, warm interior light from the side. Three-quarter profile, shallow depth of field, no other figures visible.`
      },
      {
        id: 'field_noon',
        category: 'photorealistic',
        label: 'Outdoor - Grass Field',
        prompt: `The ${descriptor} walks through a tall grass field at noon, wind blowing the grass in waves. Wide shot from behind, bright daylight, character small in the vast landscape.`
      },
      {
        id: 'subway_platform',
        category: 'photorealistic',
        label: 'Urban Night - Subway',
        prompt: `The ${descriptor} stands alone on a dimly lit subway platform at night, hands in pockets, looking down the tunnel. Side angle, fluorescent overhead lights casting harsh shadows. Urban grit, tiled walls.`
      },
      {
        id: 'forest_stream',
        category: 'photorealistic',
        label: 'Nature - Forest Stream',
        prompt: `The ${descriptor} crouches by a forest stream, hands cupped in the water, eyes focused on the flowing current. Side angle, dappled sunlight through trees, green foliage surrounding.`
      },
      {
        id: 'parking_garage',
        category: 'photorealistic',
        label: 'Urban - Parking Garage',
        prompt: `The ${descriptor} walks through a concrete parking garage, lit by overhead strip lights. Medium shot, cold blue-green lighting, pillars casting long shadows.`
      },
      {
        id: 'desert_canyon',
        category: 'photorealistic',
        label: 'Outdoor - Desert Canyon',
        prompt: `The ${descriptor} stands at the edge of a desert canyon at sunset, red rock formations in the background, looking down into the canyon depths. Profile shot, warm golden-red light, dramatic landscape.`
      },
      {
        id: 'rooftop_wide',
        category: 'photorealistic',
        label: 'Urban Dusk - Rooftop',
        prompt: `Wide cinematic shot of the ${descriptor} standing small on a rooftop edge at dusk, city skyline sprawling behind them. Silhouette against orange-purple sky. Dramatic scale, tiny figure in vast urban landscape.`
      },
      {
        id: 'storm_pier',
        category: 'photorealistic',
        label: 'Water - Storm Pier',
        prompt: `The ${descriptor} walks along a rain-soaked pier during a storm, hood up, eyes focused on the wooden planks ahead. Medium shot from behind, dark gray sky, waves crashing against the pier supports.`
      },
      {
        id: 'alley_phone',
        category: 'photorealistic',
        label: 'Urban Night - Alley Call',
        prompt: `The ${descriptor} leans against a brick wall in a narrow alley, holding a phone to their ear, head tilted down. Side profile, single streetlight creating dramatic rim lighting. Wet pavement reflecting light.`
      },
      // B&W STYLIZED PROMPTS (6 total)
      {
        id: 'pen_ink_stoop',
        category: 'bw_stylized',
        label: 'Pen & Ink - Townhouse',
        prompt: `A black-and-white pen and ink line drawing of the ${descriptor} tying their bootlaces on a townhouse stoop under a single streetlamp in light rain. High-contrast lines with crosshatching and stippling. Illustration only, not photorealistic.`
      },
      {
        id: 'graphite_train',
        category: 'bw_stylized',
        label: 'Graphite - Train Window',
        prompt: `A graphite pencil sketch of the ${descriptor} seated by a train window at dawn, eyes gazing out at the passing landscape. Soft hatching and blending, visible pencil grain. Illustration, not photorealistic.`
      },
      {
        id: 'charcoal_warehouse',
        category: 'bw_stylized',
        label: 'Charcoal - Warehouse Door',
        prompt: `A charcoal drawing of the ${descriptor} bracing a shoulder against a half-rolled warehouse door, dust in the air. Rough strokes and smudged shadows. Illustration, not photorealistic.`
      },
      {
        id: 'woodcut_alley',
        category: 'bw_stylized',
        label: 'Woodcut - Alley Sprint',
        prompt: `A black-and-white woodcut print of the ${descriptor} sprinting down a narrow alley. Angular highlights and carved textures, thick black shapes and white cuts. Illustration, not photorealistic.`
      },
      {
        id: 'vector_mono',
        category: 'bw_stylized',
        label: 'Vector - Poster Silhouette',
        prompt: `A monochrome flat vector illustration of ${descriptor} in detailed hand-drawn concept sketch style. Clean lines, subtle hatching, minimal geometric shapes, hard edges. Illustration, not photorealistic.`
      },
      {
        id: 'manga_phone',
        category: 'bw_stylized',
        label: 'Manga - Tense Call',
        prompt: `A black-and-white manga illustration of the ${descriptor} making a tense phone call in an alley. Expressive inking with screentone patterns for shading, speed lines. Illustration, not photorealistic.`
      },
      // COLOR STYLIZED PROMPTS (4 total)
      {
        id: 'comic_rooftop',
        category: 'color_stylized',
        label: 'Comic - Rooftop Leap',
        prompt: `A dynamic comic book illustration of the ${descriptor} leaping a narrow rooftop gap at night with a city skyline behind. Speed lines, bold inks, cel-shaded color, halftone dots. Illustration style, not photorealistic.`
      },
      {
        id: 'vector_metro',
        category: 'color_stylized',
        label: 'Vector - Metro Platform',
        prompt: `A flat vector illustration of the ${descriptor} waiting on a metro platform, holding a small duffel. Long geometric shadows, flat colors, simple shapes, crisp outlines, poster-like. Not photorealistic.`
      },
      {
        id: 'watercolor_diner',
        category: 'color_stylized',
        label: 'Watercolor - Diner Window',
        prompt: `A watercolor illustration of the ${descriptor} seated alone in a diner booth by a rain-streaked window at dusk, hand around a steaming mug. Paper texture visible, gentle bleeding. Illustration, not photorealistic.`
      },
      {
        id: 'gouache_stairwell',
        category: 'color_stylized',
        label: 'Gouache - Stairwell',
        prompt: `A gouache painting of the ${descriptor} ascending a concrete stairwell, caught mid-step. Chunky brush strokes, matte opaque paint, simplified forms with saturated accents. Illustration, not photorealistic.`
      }
    ];

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
 * Get all actors from actorsData.json
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
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(actorsData));
  } catch (error) {
    console.error('Error loading actors:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load actors' }));
  }
}
