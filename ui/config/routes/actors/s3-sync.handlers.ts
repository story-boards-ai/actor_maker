import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import { spawn } from 'child_process';

/**
 * POST /api/actors/:actorId/training-data/sync-from-s3
 * Downloads training images from S3 to local storage
 */
export function handleSyncFromS3(
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
export function handleSyncToS3(
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
