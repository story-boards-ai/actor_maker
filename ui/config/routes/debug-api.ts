import { IncomingMessage, ServerResponse } from 'http';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * API routes for debug file management and export utilities
 */
export function createDebugApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // Save debug data to file
    if (url === '/api/debug/save' && req.method === 'POST') {
      handleSaveDebugFile(req, res, projectRoot);
      return;
    }

    // Export validated settings to backend format
    if (url === '/api/export/validated-settings' && req.method === 'POST') {
      handleExportValidatedSettings(req, res, projectRoot);
      return;
    }

    next();
  };
}

function handleSaveDebugFile(req: IncomingMessage, res: ServerResponse, projectRoot: string) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      const { filename, data } = JSON.parse(body);
      
      if (!filename) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Filename is required' }));
        return;
      }

      // Ensure debug directory exists
      const debugDir = path.join(projectRoot, 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }

      // Write file (overwrite if exists)
      const filePath = path.join(debugDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`[Debug] Saved ${filename}`);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, path: filePath }));
    } catch (err: any) {
      console.error('[Debug] Save error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to save debug file' }));
    }
  });
}

/**
 * Export validated settings by calling Python script
 */
function handleExportValidatedSettings(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      const input = JSON.parse(body || '{}');
      const minRating = input.minRating || 'good';

      console.log(`[EXPORT] Starting export with min rating: ${minRating}`);

      // Path to Python script - exports from assessed models
      const scriptPath = path.join(projectRoot, 'scripts', 'export_assessed_models.py');

      // Check if script exists
      if (!fs.existsSync(scriptPath)) {
        console.error(`[EXPORT] Script not found: ${scriptPath}`);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: 'Export script not found',
          validatedStyles: [],
          totalStyles: 0,
          exportedCount: 0
        }));
        return;
      }

      // Prepare input for Python script
      const scriptInput = JSON.stringify({
        minRating: minRating,
      });

      // Spawn Python process
      const python = spawn('python3', [scriptPath], {
        cwd: projectRoot,
        env: process.env,
      });

      let stdout = '';
      let stderr = '';

      // Collect stdout
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr (for logging)
      python.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[EXPORT]', data.toString().trim());
      });

      // Send input to Python script
      python.stdin.write(scriptInput);
      python.stdin.end();

      // Handle process completion
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            console.log(`[EXPORT] Success: ${result.exportedCount} styles exported`);
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (error) {
            console.error('[EXPORT] Failed to parse result:', error);
            console.error('[EXPORT] Stdout:', stdout);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'Failed to parse export result',
              validatedStyles: [],
              totalStyles: 0,
              exportedCount: 0
            }));
          }
        } else {
          console.error('[EXPORT] Python script failed with code:', code);
          console.error('[EXPORT] Stderr:', stderr);
          console.error('[EXPORT] Stdout:', stdout);
          
          // Try to parse error from stdout
          try {
            const errorResult = JSON.parse(stdout);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(errorResult));
          } catch {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: stderr || `Export failed with code ${code}`,
              validatedStyles: [],
              totalStyles: 0,
              exportedCount: 0
            }));
          }
        }
      });

      // Handle process errors
      python.on('error', (error) => {
        console.error('[EXPORT] Process error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: `Process error: ${error.message}`,
          validatedStyles: [],
          totalStyles: 0,
          exportedCount: 0
        }));
      });
    } catch (error: any) {
      console.error('[EXPORT] Request error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        validatedStyles: [],
        totalStyles: 0,
        exportedCount: 0
      }));
    }
  });
}
