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
 * S3-ONLY endpoint - Returns training data from manifest (S3 URLs only)
 * No local files - S3 is the single source of truth
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

    // Load manifest - S3 URLs are the source of truth
    const manifestPath = path.join(
      projectRoot,
      'data',
      'actor_manifests',
      `${actorId.padStart(4, '0')}_manifest.json`
    );
    
    const trainingImages: any[] = [];
    let manifestUpdated: string | null = null;
    let baseImageS3Url: string | null = null;
    
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        manifestUpdated = manifest.training_data_updated || null;
        
        // Get base image from manifest (S3 URL)
        const baseImages = manifest.base_images || [];
        if (baseImages.length > 0 && baseImages[0].s3_url) {
          baseImageS3Url = baseImages[0].s3_url;
        }
        
        // Get training data from manifest (S3 URLs only)
        const manifestData = manifest.training_data || [];
        
        manifestData.forEach((entry: any, index: number) => {
          if (entry.s3_url) {
            trainingImages.push({
              index,
              filename: entry.filename,
              s3_url: entry.s3_url,
              size_mb: entry.size_mb || 0,
              modified_date: entry.modified_date || null,
              good: false // Will be enriched from prompt_metadata
            });
          }
        });
        
      } catch (e) {
        console.error(`Error loading manifest:`, e);
      }
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
    if (fs.existsSync(promptMetadataPath)) {
      const promptMetadata = JSON.parse(fs.readFileSync(promptMetadataPath, 'utf-8'));
      trainingImages.forEach(img => {
        img.good = promptMetadata.images?.[img.filename]?.good || false;
      });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      actor_id: actor.id,
      actor_name: actor.name,
      training_images: trainingImages,
      base_image_url: baseImageS3Url,
      total_count: trainingImages.length,
      manifest_updated: manifestUpdated
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

      // Use venv Python if available, fallback to python3
      const pythonPath = path.join(projectRoot, 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(pythonPath) ? pythonPath : 'python3';

      // Call Python script to delete from local and S3
      const scriptPath = path.join(projectRoot, 'scripts', 'delete_actor_training_image.py');
      const pythonProcess = spawn(pythonCmd, [
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

      // Use venv Python if available, fallback to python3
      const pythonPath = path.join(projectRoot, 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(pythonPath) ? pythonPath : 'python3';

      // Call Python script to delete all training data
      const scriptPath = path.join(projectRoot, 'scripts', 'delete_all_actor_training_data.py');
      const pythonProcess = spawn(pythonCmd, [
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
