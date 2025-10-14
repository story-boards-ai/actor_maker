import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs/promises';
import https from 'https';
import http from 'http';

/**
 * API routes for test suite management
 */
export function createTestSuiteApi(projectRoot: string) {
  // projectRoot is the actor_maker directory
  // resources folder is INSIDE actor_maker, not outside
  const STYLES_DIR = path.join(projectRoot, 'resources', 'style_images');

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // Save test suite image
    if (url === '/api/save-test-image' && req.method === 'POST') {
      handleSaveTestImage(req, res, STYLES_DIR);
      return;
    }

    // List previous test results for a style
    if (url?.startsWith('/api/list-test-results/') && req.method === 'GET') {
      const styleId = url.split('/api/list-test-results/')[1];
      handleListTestResults(styleId, res, STYLES_DIR);
      return;
    }

    // Load a specific test result
    if (url?.startsWith('/api/load-test-result') && req.method === 'GET') {
      handleLoadTestResult(req, res, STYLES_DIR);
      return;
    }

    // Save test suite result metadata
    if (url === '/api/save-test-result' && req.method === 'POST') {
      handleSaveTestResult(req, res, STYLES_DIR);
      return;
    }

    // Not a test suite route, pass to next middleware
    next();
  };
}

/**
 * Handle saving test suite image
 */
async function handleSaveTestImage(req: IncomingMessage, res: ServerResponse, stylesDir: string) {
  try {
    const body = await parseJsonBody(req);
    const { imageUrl, styleId, modelId, resultId, promptId } = body;

    if (!imageUrl || !styleId || !modelId || !resultId || !promptId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing required parameters' }));
      return;
    }

    // Create directory structure: resources/style_images/{styleId}/test_results/{resultId}/
    const testResultsDir = path.join(stylesDir, styleId, 'test_results', resultId);
    await fs.mkdir(testResultsDir, { recursive: true });

    // Save image with prompt ID as filename
    const imageFilename = `${promptId}.jpg`;
    const imagePath = path.join(testResultsDir, imageFilename);

    // Handle local paths vs remote URLs
    if (imageUrl.startsWith('/debug/') || imageUrl.startsWith('/resources/')) {
      // It's a local file path - copy it directly
      const cleanUrl = imageUrl.split('?')[0];
      // Remove leading '/' to make it a relative path
      const relativePath = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
      
      // stylesDir = .../actor_maker/resources/style_images
      // Go up two levels to get to actor_maker root
      const projectRoot = path.join(stylesDir, '..', '..');
      const sourcePath = path.join(projectRoot, relativePath);
      
      const fileExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      if (!fileExists) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
      
      await fs.copyFile(sourcePath, imagePath);
      console.log('[TEST-SUITE] Saved test image:', promptId);
    } else {
      // It's a remote URL - download it
      const imageBuffer = await downloadImageToBuffer(imageUrl);
      await fs.writeFile(imagePath, imageBuffer);
      console.log('[TEST-SUITE] Downloaded remote image:', imageUrl, '→', imagePath);
    }

    // Return relative path for frontend
    const localPath = `/resources/style_images/${styleId}/test_results/${resultId}/${imageFilename}`;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ localPath }));
  } catch (error) {
    console.error('Error saving test image:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to save test image' }));
  }
}

/**
 * Handle saving test suite result metadata
 */
async function handleSaveTestResult(req: IncomingMessage, res: ServerResponse, stylesDir: string) {
  try {
    const body = await parseJsonBody(req);
    const { styleId, modelId, resultId, result } = body;

    if (!styleId || !modelId || !resultId || !result) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing required parameters' }));
      return;
    }

    // Save result metadata as JSON
    const testResultsDir = path.join(stylesDir, styleId, 'test_results', resultId);
    const metadataPath = path.join(testResultsDir, 'result.json');

    // Ensure directory exists
    await fs.mkdir(testResultsDir, { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify(result, null, 2));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Error saving test result:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to save test result' }));
  }
}

/**
 * Helper function to parse JSON body from request
 */
function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

/**
 * List all previous test results for a style
 */
async function handleListTestResults(styleId: string, res: ServerResponse, stylesDir: string) {
  try {
    const testResultsDir = path.join(stylesDir, styleId, 'test_results');
    
    // Check if test_results directory exists
    try {
      await fs.access(testResultsDir);
    } catch {
      // Directory doesn't exist - no results yet
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results: [] }));
      return;
    }

    // Read all subdirectories (each is a test result)
    const entries = await fs.readdir(testResultsDir, { withFileTypes: true });
    const resultDirs = entries.filter(entry => entry.isDirectory());

    const results = [];
    for (const dir of resultDirs) {
      const metadataPath = path.join(testResultsDir, dir.name, 'result.json');
      
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        
        results.push({
          id: dir.name,
          ...metadata
        });
      } catch (error) {
        console.error(`Error reading metadata for ${dir.name}:`, error);
      }
    }

    // Sort by timestamp, newest first
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ results }));
  } catch (error) {
    console.error('Error listing test results:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to list test results' }));
  }
}

/**
 * Load a specific test result
 */
async function handleLoadTestResult(req: IncomingMessage, res: ServerResponse, stylesDir: string) {
  try {
    const urlParts = req.url?.split('?')[1];
    const params = new URLSearchParams(urlParts);
    const styleId = params.get('styleId');
    const resultId = params.get('resultId');

    if (!styleId || !resultId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing styleId or resultId' }));
      return;
    }

    const metadataPath = path.join(stylesDir, styleId, 'test_results', resultId, 'result.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const result = JSON.parse(metadataContent);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Error loading test result:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to load test result' }));
  }
}

/**
 * Helper function to download image from URL
 */
function downloadImageToBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      response.on('error', reject);
    }).on('error', reject);
  });
}
