import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * API routes for model assessments
 */
export function createAssessmentsApi(projectRoot: string) {
  const STYLES_DIR = path.join(projectRoot, 'resources', 'style_images');

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // Save assessment for a model
    if (url === '/api/assessments/save' && req.method === 'POST') {
      handleSaveAssessment(req, res, STYLES_DIR);
      return;
    }

    // Load assessment for a model
    if (url?.startsWith('/api/assessments/load') && req.method === 'GET') {
      handleLoadAssessment(req, res, STYLES_DIR);
      return;
    }

    // Get best assessment for a style (across all models)
    if (url?.startsWith('/api/assessments/best') && req.method === 'GET') {
      handleGetBestAssessment(req, res, STYLES_DIR);
      return;
    }

    // Not an assessments route
    next();
  };
}

/**
 * Save assessment for a model
 */
async function handleSaveAssessment(req: IncomingMessage, res: ServerResponse, stylesDir: string) {
  try {
    const body = await parseJsonBody(req);
    const { styleId, modelId, rating, comment } = body;

    console.log('[ASSESSMENTS] Save request received:', { styleId, modelId, rating, comment });

    if (!styleId || !modelId) {
      console.error('[ASSESSMENTS] Missing required fields:', { styleId, modelId });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing styleId or modelId' }));
      return;
    }

    // Ensure directory exists
    const assessmentsDir = path.join(stylesDir, styleId, 'assessments');
    await fs.mkdir(assessmentsDir, { recursive: true });
    console.log('[ASSESSMENTS] Directory ensured:', assessmentsDir);

    // Save assessment as JSON file
    const assessmentPath = path.join(assessmentsDir, `${modelId}.json`);
    const assessment = {
      modelId,
      styleId,
      rating: rating || null,
      comment: comment || '',
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(assessmentPath, JSON.stringify(assessment, null, 2));
    console.log('[ASSESSMENTS] Assessment saved successfully:', assessmentPath);
    console.log('[ASSESSMENTS] Assessment data:', assessment);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, assessment }));
  } catch (error) {
    console.error('[ASSESSMENTS] Save error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to save assessment' }));
  }
}

/**
 * Load assessment for a model
 */
async function handleLoadAssessment(req: IncomingMessage, res: ServerResponse, stylesDir: string) {
  try {
    const urlParts = req.url?.split('?')[1];
    const params = new URLSearchParams(urlParts);
    const styleId = params.get('styleId');
    const modelId = params.get('modelId');

    if (!styleId || !modelId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing styleId or modelId' }));
      return;
    }

    const assessmentPath = path.join(stylesDir, styleId, 'assessments', `${modelId}.json`);

    try {
      const assessmentContent = await fs.readFile(assessmentPath, 'utf-8');
      const assessment = JSON.parse(assessmentContent);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(assessment));
    } catch {
      // No assessment found, return defaults
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ rating: null, comment: '', modelId, styleId }));
    }
  } catch (error) {
    console.error('[ASSESSMENTS] Load error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to load assessment' }));
  }
}

/**
 * Get best assessment for a style (across all models)
 */
async function handleGetBestAssessment(req: IncomingMessage, res: ServerResponse, stylesDir: string) {
  try {
    const urlParts = req.url?.split('?')[1];
    const params = new URLSearchParams(urlParts);
    const styleId = params.get('styleId');

    if (!styleId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing styleId' }));
      return;
    }

    const assessmentsDir = path.join(stylesDir, styleId, 'assessments');

    try {
      // Read all assessment files for this style
      const files = await fs.readdir(assessmentsDir);
      const assessments = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(assessmentsDir, file), 'utf-8');
          assessments.push(JSON.parse(content));
        }
      }

      // Find best rating (excellent > good > acceptable > poor > failed > null)
      const ratingPriority = { excellent: 5, good: 4, acceptable: 3, poor: 2, failed: 1 };
      const bestAssessment = assessments.reduce((best, current) => {
        const bestScore = ratingPriority[best?.rating as keyof typeof ratingPriority] || 0;
        const currentScore = ratingPriority[current?.rating as keyof typeof ratingPriority] || 0;
        return currentScore > bestScore ? current : best;
      }, null as any);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        styleId,
        bestRating: bestAssessment?.rating || null,
        hasAssessments: assessments.length > 0
      }));
    } catch {
      // No assessments directory, return null
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ styleId, bestRating: null, hasAssessments: false }));
    }
  } catch (error) {
    console.error('[ASSESSMENTS] Get best error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to get best assessment' }));
  }
}

/**
 * Parse JSON body from request
 */
function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
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
