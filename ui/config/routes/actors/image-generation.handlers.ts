import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

/**
 * POST /api/actors/:actorId/training-data/generate
 * Generates training images from base image
 */
export function handleGenerateTrainingImages(
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
export function handleGenerateAllPromptImages(
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

      const { actor_name, base_image_url, actor_type, actor_sex } = JSON.parse(body);
      
      console.log('[Generate All Prompts] Parsed data:', { actor_id: actorId, actor_name, base_image_url });

      // base_image_url is now an S3 URL from manifest, use it directly
      const imageUrl = base_image_url;

      console.log('[Generate All Prompts] Using S3 URL:', imageUrl);

      // Call S3-only Python script to generate all prompt images
      const scriptPath = path.join(projectRoot, 'scripts', 'training_data', 'generate_all_prompt_images_s3.py');
      const args = [scriptPath, actorId, actor_name, imageUrl];
      if (actor_type) args.push(actor_type);
      if (actor_sex) args.push(actor_sex);

      console.log('[Generate All Prompts] Spawning Python with args:', args);

      // Use venv Python if available, fallback to python3
      const pythonPath = path.join(projectRoot, 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(pythonPath) ? pythonPath : 'python3';
      console.log('[Generate All Prompts] Using Python:', pythonCmd);
      
      const pythonProcess = spawn(pythonCmd, args);

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
            
            // Invalidate cache manifest so frontend reloads and detects new images
            console.log('[Generate All Prompts] Invalidating cache manifest for actor:', actorId);
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ...result, cache_invalidated: true }));
          } catch (e) {
            console.log('[Generate All Prompts] Completed (no JSON output)');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Generation completed', cache_invalidated: true }));
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
export function handleGenerateSingleTrainingImage(
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

      const { actor_name, base_image_url, prompt, actor_type, actor_sex, aspect_ratio } = JSON.parse(body);
      
      console.log('[Generate Single] Parsed data:', { actor_id: actorId, actor_name, base_image_url, prompt, aspect_ratio });

      // base_image_url is now an S3 URL from manifest, use it directly
      const imageUrl = base_image_url;

      console.log('[Generate Single] Using S3 URL:', imageUrl);

      // Call S3-only Python script to generate single training image
      const scriptPath = path.join(projectRoot, 'scripts', 'training_data', 'generate_single_training_image_s3.py');
      
      // Build args array - must maintain positional order for Python script
      // Python expects: actor_id, actor_name, base_image_url, prompt, [actor_type], [actor_sex], [aspect_ratio]
      const args = [
        scriptPath, 
        actorId, 
        actor_name, 
        imageUrl, 
        prompt,
        actor_type || 'person',  // Default to 'person' if not provided
        actor_sex || '',         // Empty string if not provided
        aspect_ratio || '1:1'    // Default to '1:1' if not provided
      ];

      console.log('[Generate Single] Spawning Python with args:', args);
      console.log('[Generate Single] Aspect ratio:', aspect_ratio);

      // Use venv Python if available, fallback to python3
      const pythonPath = path.join(projectRoot, 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(pythonPath) ? pythonPath : 'python3';
      console.log('[Generate Single] Using Python:', pythonCmd);
      
      const pythonProcess = spawn(pythonCmd, args);

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
            console.log('[Generate Single] Invalidating cache manifest for actor:', actorId);
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ...result, cache_invalidated: true }));
          } catch (e) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Generation completed', cache_invalidated: true }));
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
 * POST /api/actors/:actorId/training-data/recreate
 * Recreates a training image with the same prompt and parameters, overwriting the existing file in S3
 */
export function handleRecreateTrainingImage(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      console.log('[Recreate Training Image] Received body length:', body.length);
      
      if (!body || body.length === 0) {
        throw new Error('Empty request body');
      }

      const { actor_name, filename, prompt, aspect_ratio, base_image_url } = JSON.parse(body);
      
      console.log('[Recreate Training Image] Parsed data:', { actor_id: actorId, actor_name, filename, aspect_ratio });

      // Call S3-only Python script to recreate the training image
      // This will overwrite the existing file in S3 with the same filename
      const scriptPath = path.join(projectRoot, 'scripts', 'training_data', 'recreate_training_image_s3.py');
      
      const args = [
        scriptPath, 
        actorId, 
        actor_name, 
        base_image_url, 
        prompt,
        filename,  // Pass filename to overwrite
        aspect_ratio || '1:1'
      ];

      console.log('[Recreate Training Image] Spawning Python with args:', args);

      // Use venv Python if available, fallback to python3
      const pythonPath = path.join(projectRoot, 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(pythonPath) ? pythonPath : 'python3';
      console.log('[Recreate Training Image] Using Python:', pythonCmd);
      
      const pythonProcess = spawn(pythonCmd, args);

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
            console.log('[Recreate Training Image] Invalidating cache for actor:', actorId);
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ...result, cache_invalidated: true }));
          } catch (e) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Image recreated successfully', cache_invalidated: true }));
          }
        } else {
          console.error('Recreate failed:', errorOutput);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: errorOutput || 'Recreate failed' }));
        }
      });
    } catch (error) {
      console.error('[Recreate Training Image] Error:', error);
      console.error('[Recreate Training Image] Body was:', body);
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
 * POST /api/actors/:actorId/regenerate-poster-frame
 * Regenerates poster frame for an actor using their trained LoRA model
 */
export function handleRegeneratePosterFrame(
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

      // Use venv Python if available, fallback to python3
      const pythonPath = path.join(projectRoot, 'venv', 'bin', 'python');
      const pythonCmd = fs.existsSync(pythonPath) ? pythonPath : 'python3';
      console.log('[Regenerate Poster Frame] Using Python:', pythonCmd);

      // Call Python script to regenerate poster frame
      const scriptPath = path.join(projectRoot, 'scripts', 'regenerate_poster_frame.py');
      const pythonProcess = spawn(pythonCmd, [
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
