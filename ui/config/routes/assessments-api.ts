import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * API routes for model assessments
 * Saves assessments directly to actor manifests
 */
export function createAssessmentsApi(projectRoot: string) {
  const MANIFESTS_DIR = path.join(projectRoot, 'data', 'actor_manifests');

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // Save assessment for a model
    if (url === '/api/assessments/save' && req.method === 'POST') {
      handleSaveAssessment(req, res, MANIFESTS_DIR);
      return;
    }

    // Load assessment for a model
    if (url?.startsWith('/api/assessments/load') && req.method === 'GET') {
      handleLoadAssessment(req, res, MANIFESTS_DIR);
      return;
    }

    // Not an assessments route
    next();
  };
}

/**
 * Save assessment for a model to actor manifest
 */
async function handleSaveAssessment(req: IncomingMessage, res: ServerResponse, manifestsDir: string) {
  try {
    const body = await parseJsonBody(req);
    const { styleId: actorId, modelId, rating, comment } = body;

    console.log('[ASSESSMENTS] Save request received:', { actorId, modelId, rating, comment });

    if (!actorId || !modelId) {
      console.error('[ASSESSMENTS] Missing required fields:', { actorId, modelId });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing actorId or modelId' }));
      return;
    }

    // Extract version from modelId (format: "0006_V7" -> "V7")
    const modelIdParts = modelId.split('_');
    const version = modelIdParts[modelIdParts.length - 1];

    // Load manifest
    const manifestPath = path.join(manifestsDir, `${actorId}_manifest.json`);
    
    try {
      const manifestData = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Find the custom LoRA model
      if (!manifestData.custom_lora_models || !Array.isArray(manifestData.custom_lora_models)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No custom LoRA models found in manifest' }));
        return;
      }

      const modelIndex = manifestData.custom_lora_models.findIndex((m: any) => m.version === version);

      if (modelIndex === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Model version ${version} not found in manifest` }));
        return;
      }

      // Update assessment in the model
      manifestData.custom_lora_models[modelIndex].assessment = {
        rating: rating || null,
        comment: comment || '',
        updatedAt: new Date().toISOString(),
      };

      // Save manifest
      await fs.writeFile(manifestPath, JSON.stringify(manifestData, null, 2));
      console.log('[ASSESSMENTS] Assessment saved to manifest:', manifestPath);
      console.log('[ASSESSMENTS] Assessment data:', manifestData.custom_lora_models[modelIndex].assessment);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        assessment: manifestData.custom_lora_models[modelIndex].assessment 
      }));
    } catch (fileError) {
      console.error('[ASSESSMENTS] Manifest not found:', manifestPath);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Actor manifest not found' }));
    }
  } catch (error) {
    console.error('[ASSESSMENTS] Save error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to save assessment' }));
  }
}

/**
 * Load assessment for a model from actor manifest
 */
async function handleLoadAssessment(req: IncomingMessage, res: ServerResponse, manifestsDir: string) {
  try {
    const urlParts = req.url?.split('?')[1];
    const params = new URLSearchParams(urlParts);
    const actorId = params.get('styleId'); // Keep param name for backward compatibility
    const modelId = params.get('modelId');

    if (!actorId || !modelId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing actorId or modelId' }));
      return;
    }

    // Extract version from modelId
    const modelIdParts = modelId.split('_');
    const version = modelIdParts[modelIdParts.length - 1];

    const manifestPath = path.join(manifestsDir, `${actorId}_manifest.json`);

    try {
      const manifestData = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Find the custom LoRA model
      if (!manifestData.custom_lora_models || !Array.isArray(manifestData.custom_lora_models)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ rating: null, comment: '', modelId, styleId: actorId }));
        return;
      }

      const model = manifestData.custom_lora_models.find((m: any) => m.version === version);

      if (!model || !model.assessment) {
        // No assessment found, return defaults
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ rating: null, comment: '', modelId, styleId: actorId }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        rating: model.assessment.rating,
        comment: model.assessment.comment,
        modelId,
        styleId: actorId,
        updatedAt: model.assessment.updatedAt
      }));
    } catch {
      // Manifest not found, return defaults
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ rating: null, comment: '', modelId, styleId: actorId }));
    }
  } catch (error) {
    console.error('[ASSESSMENTS] Load error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to load assessment' }));
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
