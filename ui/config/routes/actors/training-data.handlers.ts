import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { loadActorById } from './utils';

/**
 * GET /api/actors/:actorId/training-data/prompts
 * Returns all prompts from prompt_metadata.json for stylized image detection
 */
export function handleGetTrainingPrompts(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    const actor = loadActorById(actorId, projectRoot);

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
 * Returns training data info from manifest (source of truth)
 * Shows local files, S3 URLs, and sync status
 */
export function handleGetTrainingData(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    const actor = loadActorById(actorId, projectRoot);

    if (!actor) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Load manifest - THIS IS THE SOURCE OF TRUTH
    const manifestPath = path.join(
      projectRoot,
      'data',
      'actor_manifests',
      `${actorId.padStart(4, '0')}_manifest.json`
    );
    
    if (!fs.existsSync(manifestPath)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Manifest not found',
        message: 'Run sync_training_data_to_manifests.py to create manifest with training data'
      }));
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

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
    const possibleImagePaths = [
      path.join(projectRoot, 'data', 'actors', actor.name, 'base_image', `${actor.name}_base.jpg`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'base_image', `${actor.name}_base.png`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}_poster.png`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}_poster.jpg`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}.png`),
      path.join(projectRoot, 'data', 'actors', actor.name, 'poster_frame', `${actor.name}.jpg`)
    ];
    
    let baseImageRelativePath: string | null = null;
    for (const imagePath of possibleImagePaths) {
      if (fs.existsSync(imagePath)) {
        baseImageRelativePath = imagePath.replace(path.join(projectRoot, 'data'), '/data');
        break;
      }
    }

    // Get training data from manifest
    const manifestTrainingData = manifest.training_data || [];
    
    // Scan local directory to detect any new files not in manifest
    const localImagesDir = path.join(projectRoot, 'data', 'actors', actor.name, 'training_data');
    const localFiles = new Set<string>();
    
    if (fs.existsSync(localImagesDir)) {
      const files = fs.readdirSync(localImagesDir)
        .filter(f => (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')));
      files.forEach(f => localFiles.add(f));
    }

    // Build training images array from manifest
    const trainingImages = manifestTrainingData.map((manifestEntry: any, index: number) => {
      const filename = manifestEntry.filename;
      const localExists = localFiles.has(filename);
      
      // Remove from localFiles set (we'll check what's left later)
      if (localExists) {
        localFiles.delete(filename);
      }

      // Determine sync status
      let status: 's3_only' | 'local_only' | 'synced' | 'out_of_sync';
      if (manifestEntry.s3_url && localExists) {
        // Check if local file hash matches manifest hash
        const localPath = path.join(localImagesDir, filename);
        const localHash = crypto.createHash('md5').update(fs.readFileSync(localPath)).digest('hex');
        
        if (localHash === manifestEntry.md5_hash) {
          status = 'synced';
        } else {
          status = 'out_of_sync';
        }
      } else if (manifestEntry.s3_url && !localExists) {
        status = 's3_only';
      } else if (!manifestEntry.s3_url && localExists) {
        status = 'local_only';
      } else {
        status = 'local_only';
      }

      // Get good status from prompt_metadata
      const goodStatus = promptMetadata.images?.[filename]?.good || false;

      return {
        index,
        filename,
        s3_url: manifestEntry.s3_url || null,
        local_exists: localExists,
        local_path: localExists ? `/data/actors/${actor.name}/training_data/${filename}` : null,
        md5_hash: manifestEntry.md5_hash,
        size_mb: manifestEntry.size_mb,
        modified_date: manifestEntry.modified_date,
        status,
        good: goodStatus
      };
    });

    // Add any local files not in manifest (orphaned files)
    localFiles.forEach(filename => {
      const localPath = path.join(localImagesDir, filename);
      const stats = fs.statSync(localPath);
      const localHash = crypto.createHash('md5').update(fs.readFileSync(localPath)).digest('hex');
      
      trainingImages.push({
        index: trainingImages.length,
        filename,
        s3_url: null,
        local_exists: true,
        local_path: `/data/actors/${actor.name}/training_data/${filename}`,
        md5_hash: localHash,
        size_mb: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
        modified_date: new Date(stats.mtime).toISOString(),
        status: 'local_only',
        good: promptMetadata.images?.[filename]?.good || false
      });
    });

    // Calculate counts
    const syncedCount = trainingImages.filter(img => img.status === 'synced').length;
    const localOnlyCount = trainingImages.filter(img => img.status === 'local_only').length;
    const s3OnlyCount = trainingImages.filter(img => img.status === 's3_only').length;
    const outOfSyncCount = trainingImages.filter(img => img.status === 'out_of_sync').length;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      actor_id: actor.id,
      actor_name: actor.name,
      training_images: trainingImages,
      base_image_path: baseImageRelativePath,
      total_count: trainingImages.length,
      synced_count: syncedCount,
      local_only_count: localOnlyCount,
      s3_only_count: s3OnlyCount,
      out_of_sync_count: outOfSyncCount,
      manifest_updated: manifest.training_data_updated || null
    }));
  } catch (error) {
    console.error('Error loading actor training data:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load training data', details: (error as Error).message }));
  }
}

/**
 * POST /api/actors/:actorId/training-data/delete
 * Deletes a training image from both local storage and S3
 */
export function handleDeleteTrainingImage(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { spawn } = await import('child_process');
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
export function handleDeleteAllTrainingData(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { spawn } = await import('child_process');
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
 * POST /api/actors/:actorId/training-data/:filename/toggle-good
 * Toggle training image as good/not good
 */
export function handleToggleTrainingImageGood(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string,
  filename: string
) {
  try {
    // Decode the filename (it may be URL-encoded)
    const decodedFilename = decodeURIComponent(filename);
    
    const actor = loadActorById(actorId, projectRoot);

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
