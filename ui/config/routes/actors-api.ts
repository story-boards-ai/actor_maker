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

    // POST /api/actors/:actorId/training-data/delete-all
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/delete-all') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/delete-all/);
      if (match) {
        handleDeleteAllTrainingData(req, res, projectRoot, match[1]);
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
    const prompts = [
      {
        id: 'rain_street',
        category: 'photorealistic',
        label: 'Rain-Slick Street Run',
        prompt: `The ${descriptor} runs across a rain-slick street at night, mid-stride, lit by car headlights from the side. Three-quarter back angle. Reflections on the asphalt, no other figures in frame.`
      },
      {
        id: 'window_light',
        category: 'photorealistic',
        label: 'Close-up in Window Light',
        prompt: `Close-up of the ${descriptor} looking out a rain-streaked window, warm interior light from the side. Three-quarter profile, shallow depth of field, no other figures visible.`
      },
      {
        id: 'pen_ink_stoop',
        category: 'bw_stylized',
        label: 'Pen & Ink - Townhouse Stoop',
        prompt: `A black-and-white pen and ink line drawing of the ${descriptor} tying their bootlaces on a townhouse stoop under a single streetlamp in light rain. Three-quarter side view, mid shot. High-contrast lines with crosshatching and stippling for shading, no grayscale gradients, clean white negative space. Preserve the subject's defining features. Illustration only, not photorealistic.`
      },
      {
        id: 'charcoal_alley',
        category: 'bw_stylized',
        label: 'Charcoal - Alley Glance',
        prompt: `A black-and-white charcoal sketch of the ${descriptor} glancing over their shoulder in a narrow alley. Loose, expressive strokes, smudged shadows, high contrast, no color. Preserve identity. Illustration, not photorealistic.`
      },
      {
        id: 'woodcut_stairs',
        category: 'bw_stylized',
        label: 'Woodcut - Fire Escape',
        prompt: `A black-and-white woodcut print of the ${descriptor} climbing a fire escape at dusk. Bold angular cuts, stark black and white, no grayscale, heavy grain texture. Preserve key features. Illustration, not photorealistic.`
      },
      {
        id: 'comic_rooftop',
        category: 'color_stylized',
        label: 'Comic Book - Rooftop Leap',
        prompt: `A dynamic comic book illustration of the ${descriptor} leaping a narrow rooftop gap at night with a city skyline behind. Low angle, foreshortened limbs, speed lines, bold inks, cel-shaded color, limited palette with halftone dots. Preserve identity and key attributes. Illustration style, not photorealistic.`
      },
      {
        id: 'watercolor_cafe',
        category: 'color_stylized',
        label: 'Watercolor - Cafe Window',
        prompt: `A watercolor painting of the ${descriptor} seated at a cafe window, looking out at a rainy street. Soft washes, wet-on-wet blending, visible brush strokes, muted palette. Preserve facial features. Illustration, not photorealistic.`
      },
      {
        id: 'gouache_stairwell',
        category: 'color_stylized',
        label: 'Gouache - Concrete Stairwell',
        prompt: `A gouache painting of the ${descriptor} ascending a concrete stairwell, caught mid-step. Low angle, chunky brush strokes, matte opaque paint, simplified forms with saturated accents. Preserve facial features and hairstyle. Illustration, not photorealistic.`
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
