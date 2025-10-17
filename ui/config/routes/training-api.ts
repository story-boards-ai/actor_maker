import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { getActualServerPort } from '../server-plugin';
import ngrok from 'ngrok';

let ngrokUrl: string | null = null;

/**
 * API routes for LoRA training management
 */
export function createTrainingApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // Start training job
    if (url === '/api/training/start' && req.method === 'POST') {
      handleStartTraining(req, res, projectRoot);
      return;
    }

    // Check training status
    if (url === '/api/training/status' && req.method === 'POST') {
      handleCheckTrainingStatus(req, res);
      return;
    }

    // Training webhook callback
    if (url === '/api/training-webhook' && req.method === 'POST') {
      handleTrainingWebhook(req, res, projectRoot);
      return;
    }

    // Get training versions for a style
    if (url?.startsWith('/api/styles/') && url.includes('/training-versions') && req.method === 'GET') {
      const match = url.match(/\/api\/styles\/([^/]+)\/training-versions/);
      if (match) {
        handleGetTrainingVersions(req, res, projectRoot, match[1]);
        return;
      }
    }

    // Save training versions for a style
    if (url?.startsWith('/api/styles/') && url.includes('/training-versions') && req.method === 'POST') {
      const match = url.match(/\/api\/styles\/([^/]+)\/training-versions/);
      if (match) {
        handleSaveTrainingVersions(req, res, projectRoot, match[1]);
        return;
      }
    }

    // Get all trained models across all styles
    if (url === '/api/training/models' && req.method === 'GET') {
      handleGetAllTrainedModels(req, res, projectRoot);
      return;
    }

    // Ngrok management
    if (url === '/api/ngrok/status' && req.method === 'GET') {
      handleNgrokStatus(req, res);
      return;
    }

    if (url === '/api/ngrok/start' && req.method === 'POST') {
      handleNgrokStart(req, res);
      return;
    }

    if (url === '/api/ngrok/stop' && req.method === 'POST') {
      handleNgrokStop(req, res);
      return;
    }

    // Sync LoRA files from S3
    if (url === '/api/training/sync-s3-loras' && req.method === 'POST') {
      handleSyncS3LoRAs(req, res, projectRoot);
      return;
    }

    // Mark training version as good
    if (url?.startsWith('/api/styles/') && url.includes('/mark-good') && req.method === 'POST') {
      const match = url.match(/\/api\/styles\/([^/]+)\/mark-good/);
      if (match) {
        handleMarkVersionAsGood(req, res, projectRoot, match[1]);
        return;
      }
    }

    // Clear validated model from registry
    if (url?.startsWith('/api/styles/') && url.includes('/clear-validated') && req.method === 'POST') {
      const match = url.match(/\/api\/styles\/([^/]+)\/clear-validated/);
      if (match) {
        handleClearValidatedModel(req, res, projectRoot, match[1]);
        return;
      }
    }

    next();
  };
}

async function handleStartTraining(req: IncomingMessage, res: ServerResponse, projectRoot: string) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', async () => {
    try {
      const trainingRequest = JSON.parse(body);
      
      console.log('[Training] Starting training job:', trainingRequest.input.training_config.model_name);
      
      // Validate training data before sending to RunPod
      if (trainingRequest.input?.training_data?.s3_urls) {
        const { validateS3TrainingUrls } = await import('../utils/training-validation');
        
        // Determine if captions are required based on training mode
        const mode = trainingRequest.input?.training_config?.mode;
        const requireCaptions = mode === 'custom-styles'; // Only require captions for styles, not actors
        
        console.log('[Training] Validation mode:', mode, 'requireCaptions:', requireCaptions);
        
        const validation = validateS3TrainingUrls(trainingRequest.input.training_data.s3_urls, requireCaptions);
        
        if (!validation.valid) {
          console.error('[Training] ❌ Validation failed:', validation.errors);
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'Training data validation failed',
            details: validation.errors.join('; '),
            validation: {
              errors: validation.errors,
              warnings: validation.warnings,
              stats: validation.stats
            }
          }));
          return;
        }
        
        if (validation.warnings.length > 0) {
          console.warn('[Training] ⚠️ Validation warnings:', validation.warnings);
        }
        
        console.log('[Training] ✅ Validation passed:', validation.stats);
      }
      
      // Write debug copy of the training request (overwrite, no timestamps)
      try {
        const debugDir = path.join(projectRoot, 'debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        const debugRequestPath = path.join(debugDir, 'training_request.json');
        fs.writeFileSync(debugRequestPath, JSON.stringify(trainingRequest, null, 2));
        console.log('[Training][Debug] Saved request to', debugRequestPath);
      } catch (e: any) {
        console.warn('[Training][Debug] Failed to save training request:', e?.message || String(e));
      }
      
      // Get RunPod endpoint from environment
      const runpodEndpoint = process.env.MODEL_TRAINING_RUNPOD_ENDPOINT_ID;
      const runpodApiKey = process.env.MODEL_TRAINING_RUNPOD_API_KEY || process.env.RUNPOD_API_KEY;
      
      if (!runpodEndpoint || !runpodApiKey) {
        throw new Error('RunPod configuration missing: Set MODEL_TRAINING_RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY');
      }

      // Submit to RunPod serverless endpoint
      const runpodUrl = `https://api.runpod.ai/v2/${runpodEndpoint}/run`;

      // Implement 30s timeout with AbortController
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(runpodUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${runpodApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainingRequest),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`RunPod error ${response.status}: ${text || response.statusText}`);
      }

      const data = await response.json();

      console.log('[Training] RunPod response:', data);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        job_id: data.id,
        status: data.status,
      }));
    } catch (err: any) {
      console.error('[Training] Start error:', err?.message || String(err));
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Failed to start training',
        details: err?.message || 'Unknown error' 
      }));
    }
  });
}

async function handleCheckTrainingStatus(req: IncomingMessage, res: ServerResponse) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', async () => {
    try {
      const { jobId } = JSON.parse(body);
      
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      console.log('[Training] Checking status for job:', jobId);
      
      // Get RunPod credentials
      const runpodEndpoint = process.env.MODEL_TRAINING_RUNPOD_ENDPOINT_ID;
      const runpodApiKey = process.env.MODEL_TRAINING_RUNPOD_API_KEY || process.env.RUNPOD_API_KEY;
      
      if (!runpodEndpoint || !runpodApiKey) {
        throw new Error('RunPod configuration missing');
      }

      // Use the FULL job ID including the -e1, -e2 suffix
      // RunPod's status endpoint REQUIRES the full ID with suffix
      console.log('[Training] Querying status with full job ID:', jobId);

      // Query RunPod status endpoint
      const statusUrl = `https://api.runpod.ai/v2/${runpodEndpoint}/status/${jobId}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${runpodApiKey}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`RunPod status error ${response.status}: ${text || response.statusText}`);
      }

      const data = await response.json();
      console.log('[Training] Status response:', data);

      // Extract relevant info
      const status = data.status;
      const output = data.output;
      
      // Extract LoRA URL from various possible fields
      const loraUrl = output?.loraUrl || output?.s3_url || output?.model_info?.download_url || null;
      
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jobId,
        status,
        loraUrl,
        error: output?.error || null,
        output: output,
      }));
    } catch (err: any) {
      console.error('[Training] Status check error:', err?.message || String(err));
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Failed to check training status',
        details: err?.message || 'Unknown error' 
      }));
    }
  });
}

async function handleTrainingWebhook(req: IncomingMessage, res: ServerResponse, projectRoot: string) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', async () => {
    try {
      const webhookData = JSON.parse(body);
      
      console.log('[Training Webhook] Received:', JSON.stringify(webhookData, null, 2));

      // Write debug copy of the training webhook response (overwrite, no timestamps)
      try {
        const debugDir = path.join(projectRoot, 'debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        const debugResponsePath = path.join(debugDir, 'training_response.json');
        fs.writeFileSync(debugResponsePath, JSON.stringify(webhookData, null, 2));
        console.log('[Training Webhook][Debug] Saved response to', debugResponsePath);
      } catch (e: any) {
        console.warn('[Training Webhook][Debug] Failed to save training response:', e?.message || String(e));
      }

      // Process webhook using utility function
      const { processTrainingWebhook } = await import('../utils/webhook-handler');
      const result = processTrainingWebhook(webhookData, projectRoot);

      // Always respond 200 OK to webhook
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        received: true,
        success: result.success,
        message: result.message,
        error: result.error
      }));
    } catch (err: any) {
      console.error('[Training Webhook] Error processing webhook:', err.message);
      console.error('[Training Webhook] Stack trace:', err.stack);
      // Still respond 200 to prevent retry
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ received: true, error: err.message }));
    }
  });
}

function handleGetTrainingVersions(req: IncomingMessage, res: ServerResponse, projectRoot: string, styleId: string) {
  try {
    const versionsPath = getTrainingVersionsPath(styleId, projectRoot);
    
    if (!fs.existsSync(versionsPath)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ versions: [] }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ versions: data.versions || [] }));
  } catch (err: any) {
    console.error('[Training Versions] Get error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load training versions' }));
  }
}

function handleSaveTrainingVersions(req: IncomingMessage, res: ServerResponse, projectRoot: string, styleId: string) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      const { versions } = JSON.parse(body);
      const versionsPath = getTrainingVersionsPath(styleId, projectRoot);
      
      // Ensure directory exists
      const dir = path.dirname(versionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(versionsPath, JSON.stringify({ versions }, null, 2));
      
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err: any) {
      console.error('[Training Versions] Save error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to save training versions' }));
    }
  });
}

function handleGetAllTrainedModels(req: IncomingMessage, res: ServerResponse, projectRoot: string) {
  try {
    const allModels: any[] = [];

    // Scan actor/character models from data/actors
    const actorsDir = path.join(projectRoot, 'data', 'actors');
    
    if (!fs.existsSync(actorsDir)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ models: [] }));
      return;
    }

    const actorFolders = fs.readdirSync(actorsDir);

    for (const actorFolder of actorFolders) {
      const versionsPath = path.join(actorsDir, actorFolder, 'training_versions.json');
      
      if (fs.existsSync(versionsPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
          const versions = data.versions || [];
          
          // Load actorsData to get actor ID
          const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
          let actorId = actorFolder; // fallback to folder name
          
          if (fs.existsSync(actorsDataPath)) {
            const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
            const actor = actorsData.find((a: any) => a.name === actorFolder);
            if (actor) {
              actorId = actor.id.toString();
              console.log(`[Training Models] Actor ${actorFolder} -> ID: ${actorId} (type: ${typeof actorId})`);
            } else {
              console.warn(`[Training Models] Actor ${actorFolder} not found in actorsData.json`);
            }
          }
          
          // Only include completed versions with loraUrl
          const completedVersions = versions
            .filter((v: any) => v.status === 'completed' && v.loraUrl)
            .map((v: any) => ({
              id: v.id,
              name: v.name || 'Unnamed',
              styleId: actorId, // Use actor ID as styleId for filtering
              styleName: actorFolder.replace(/_/g, ' '),
              loraUrl: v.loraUrl,
              timestamp: v.timestamp,
              parameters: v.parameters,
              imageCount: v.imageCount,
              description: v.description,
            }));
          
          allModels.push(...completedVersions);
        } catch (parseErr) {
          console.warn(`[Training Models] Failed to parse ${versionsPath}:`, parseErr);
        }
      }
    }

    // Sort by timestamp (newest first)
    allModels.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    console.log(`[Training Models] Found ${allModels.length} trained actor models`);
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ models: allModels }));
  } catch (err: any) {
    console.error('[Training Models] Get error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load trained models' }));
  }
}

function handleMarkVersionAsGood(req: IncomingMessage, res: ServerResponse, projectRoot: string, styleId: string) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      const { versionId } = JSON.parse(body);
      
      if (!versionId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing versionId' }));
        return;
      }

      // Load training versions
      const versionsPath = getTrainingVersionsPath(styleId, projectRoot);
      
      if (!fs.existsSync(versionsPath)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Training versions not found' }));
        return;
      }

      const data = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
      const versions = data.versions || [];
      
      // Find the version to mark as good
      const targetVersion = versions.find((v: any) => v.id === versionId);
      
      if (!targetVersion) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Version not found' }));
        return;
      }

      // Unmark all other versions and mark only this one
      versions.forEach((v: any) => {
        v.isGood = v.id === versionId;
      });

      // Save updated versions
      fs.writeFileSync(versionsPath, JSON.stringify({ versions }, null, 2));

      // Update styles registry with the good LoRA model
      const registryPath = path.join(projectRoot, 'data', 'styles_registry.json');
      
      console.log(`[Training] Registry path: ${registryPath}`);
      console.log(`[Training] Registry exists: ${fs.existsSync(registryPath)}`);
      
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
        console.log(`[Training] Looking for style ID: ${styleId}`);
        const style = registry.styles.find((s: any) => s.id === styleId);
        
        if (style) {
          console.log(`[Training] Found style: ${style.title}`);
          // Update the validated_lora_model field
          style.validated_lora_model = {
            version_id: targetVersion.id,
            version_name: targetVersion.name,
            lora_file: targetVersion.loraUrl ? path.basename(targetVersion.loraUrl) : null,
            lora_url: targetVersion.loraUrl || null,
            marked_at: new Date().toISOString(),
            parameters: targetVersion.parameters,
          };
          
          // Update the metadata timestamp
          if (style.metadata) {
            style.metadata.updated_at = new Date().toISOString();
          }
          
          fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
          console.log(`[Training] ✅ Marked version ${versionId} as good for style ${styleId} and updated registry`);
          console.log(`[Training] ✅ Registry file written successfully`);
        } else {
          console.error(`[Training] ❌ Style ${styleId} not found in registry`);
        }
      } else {
        console.error(`[Training] ❌ Registry file not found at ${registryPath}`);
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, versions }));
    } catch (err: any) {
      console.error('[Training] Mark as good error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to mark version as good' }));
    }
  });
}

function handleClearValidatedModel(req: IncomingMessage, res: ServerResponse, projectRoot: string, styleId: string) {
  try {
    console.log(`[Training] Clearing validated model for style ${styleId}`);
    
    // Update styles registry to remove validated_lora_model
    const registryPath = path.join(projectRoot, 'data', 'styles_registry.json');
    
    console.log(`[Training] Registry path: ${registryPath}`);
    console.log(`[Training] Registry exists: ${fs.existsSync(registryPath)}`);
    
    if (fs.existsSync(registryPath)) {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      console.log(`[Training] Looking for style ID: ${styleId}`);
      const style = registry.styles.find((s: any) => s.id === styleId);
      
      if (style) {
        console.log(`[Training] Found style: ${style.title}`);
        
        // Remove the validated_lora_model field
        if (style.validated_lora_model) {
          console.log(`[Training] Removing validated_lora_model:`, style.validated_lora_model);
          delete style.validated_lora_model;
        } else {
          console.log(`[Training] No validated_lora_model to remove`);
        }
        
        // Update the metadata timestamp
        if (style.metadata) {
          style.metadata.updated_at = new Date().toISOString();
        }
        
        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
        console.log(`[Training] ✅ Cleared validated model for style ${styleId} and updated registry`);
      } else {
        console.error(`[Training] ❌ Style ${styleId} not found in registry`);
      }
    } else {
      console.error(`[Training] ❌ Registry file not found at ${registryPath}`);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (err: any) {
    console.error('[Training] Clear validated model error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to clear validated model' }));
  }
}

function getTrainingVersionsPath(styleId: string, projectRoot: string): string {
  // Find the style folder (it might have a name suffix)
  const styleImagesDir = path.join(projectRoot, 'resources', 'style_images');
  const folders = fs.readdirSync(styleImagesDir);
  const styleFolder = folders.find(f => f.startsWith(`${styleId}_`));
  
  if (styleFolder) {
    return path.join(styleImagesDir, styleFolder, 'training_versions.json');
  }
  
  // Fallback: create in a generic location
  const fallbackDir = path.join(projectRoot, 'data', 'training_versions');
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  return path.join(fallbackDir, `${styleId}.json`);
}

async function handleNgrokStatus(req: IncomingMessage, res: ServerResponse) {
  let isRunning = ngrokUrl !== null;
  let url = ngrokUrl;
  let port: string | undefined;
  
  // Check ngrok API to get accurate info
  try {
    const ngrokApiResponse = await fetch('http://127.0.0.1:4040/api/tunnels');
    if (ngrokApiResponse.ok) {
      const tunnels = await ngrokApiResponse.json();
      if (tunnels.tunnels && tunnels.tunnels.length > 0) {
        // Found existing ngrok tunnel
        const tunnel = tunnels.tunnels.find((t: any) => t.proto === 'https') || tunnels.tunnels[0];
        url = tunnel.public_url;
        // Extract port from addr field (e.g., "localhost:3001" -> "3001")
        const addr = tunnel.config?.addr;
        if (addr && typeof addr === 'string') {
          const parts = addr.split(':');
          port = parts[parts.length - 1];
        }
        isRunning = true;
        ngrokUrl = url; // Update our cached URL
        console.log('[Ngrok] Status check - URL:', url, 'Port:', port, 'Addr:', addr);
      } else {
        isRunning = false;
        ngrokUrl = null;
      }
    }
  } catch (apiErr) {
    // Ngrok API not available
    if (isRunning) {
      // We think it's running but can't reach API - get port from server detection
      const detectedPort = getActualServerPort();
      port = detectedPort?.toString();
    } else {
      isRunning = false;
    }
  }
  
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    running: isRunning,
    url: url,
    port: port,
  }));
}

async function handleNgrokStart(req: IncomingMessage, res: ServerResponse) {
  try {
    // First, disconnect any existing tunnels to avoid conflicts
    try {
      await ngrok.disconnect();
      console.log('[Ngrok] Disconnected any existing tunnels');
    } catch (disconnectErr) {
      // Ignore errors if no tunnels exist
      console.log('[Ngrok] No existing tunnels to disconnect');
    }
    
    // Check if we already have a cached URL
    if (ngrokUrl) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        success: true, 
        url: ngrokUrl,
        message: 'Ngrok already running' 
      }));
      return;
    }

    // Check if ngrok is already running via API
    try {
      const ngrokApiResponse = await fetch('http://127.0.0.1:4040/api/tunnels');
      if (ngrokApiResponse.ok) {
        const tunnels = await ngrokApiResponse.json();
        if (tunnels.tunnels && tunnels.tunnels.length > 0) {
          // Found existing ngrok tunnel
          const tunnel = tunnels.tunnels.find((t: any) => t.proto === 'https') || tunnels.tunnels[0];
          ngrokUrl = tunnel.public_url;
          console.log('[Ngrok] Detected existing tunnel:', ngrokUrl);
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            url: ngrokUrl,
            message: 'Using existing ngrok tunnel'
          }));
          return;
        }
      }
    } catch (apiErr) {
      // Ngrok API not available, continue with starting new tunnel
      console.log('[Ngrok] No existing tunnel detected, starting new one');
    }

    // Get the actual port the Vite server is running on
    const detectedPort = getActualServerPort();
    const port = detectedPort || parseInt(process.env.PORT || '3000');
    
    console.log('[Ngrok] Starting tunnel on port', port, detectedPort ? '(auto-detected)' : '(default)');
    
    // Start ngrok using the npm package
    // Note: The package will handle existing tunnels automatically
    ngrokUrl = await ngrok.connect({
      addr: port,
      proto: 'http'
    });

    console.log('[Ngrok] Tunnel started:', ngrokUrl);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      url: ngrokUrl,
      port: port.toString(),
    }));
  } catch (err: any) {
    console.error('[Ngrok] Start error:', err);
    
    // Check if tunnel already exists error
    const isTunnelExistsError = err.message?.includes('already exists') || 
                                 err.body?.msg?.includes('already exists') ||
                                 err.body?.error_code === 102;
    
    // If tunnel already exists or ngrok is already running, try to get the URL from the API
    if (isTunnelExistsError || err.message?.includes('ERR_NGROK_108') || err.message?.includes('simultaneous')) {
      try {
        // Wait a moment for tunnel to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const ngrokApiResponse = await fetch('http://127.0.0.1:4040/api/tunnels');
        if (ngrokApiResponse.ok) {
          const tunnels = await ngrokApiResponse.json();
          if (tunnels.tunnels && tunnels.tunnels.length > 0) {
            const tunnel = tunnels.tunnels.find((t: any) => t.proto === 'https') || tunnels.tunnels[0];
            ngrokUrl = tunnel.public_url;
            console.log('[Ngrok] Retrieved URL from existing tunnel:', ngrokUrl);
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              url: ngrokUrl,
              message: 'Using existing ngrok tunnel (detected via error recovery)'
            }));
            return;
          }
        }
      } catch (recoveryErr) {
        console.error('[Ngrok] Failed to recover existing tunnel URL:', recoveryErr);
      }
    }
    
    ngrokUrl = null;

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    
    const errorResponse: any = { 
      error: 'Failed to start ngrok',
      details: err.message || err.body?.msg || 'Unknown error',
    };
    
    if (isTunnelExistsError) {
      errorResponse.hint = 'Ngrok tunnel already exists. Try stopping the existing tunnel first or check http://127.0.0.1:4040';
    } else if (err.message?.includes('ERR_NGROK_108') || err.message?.includes('simultaneous')) {
      errorResponse.hint = 'Ngrok is already running but URL could not be retrieved. Check http://127.0.0.1:4040 or restart ngrok.';
    } else {
      errorResponse.hint = 'Make sure ngrok is installed via npm: npm install ngrok';
    }
    
    res.end(JSON.stringify(errorResponse));
  }
}

async function handleNgrokStop(req: IncomingMessage, res: ServerResponse) {
  try {
    // Kill all ngrok processes and tunnels
    await ngrok.kill();
    console.log('[Ngrok] Killed all ngrok processes');
    
    ngrokUrl = null;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      success: true,
      message: 'Ngrok tunnel stopped'
    }));
  } catch (err: any) {
    console.error('[Ngrok] Stop error:', err);
    
    // Even if kill fails, clear our cached URL
    ngrokUrl = null;
    
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to stop ngrok', details: err.message }));
  }
}

async function handleSyncS3LoRAs(req: IncomingMessage, res: ServerResponse, projectRoot: string) {
  try {
    const { syncS3LoRAs } = await import('../utils/s3-lora-sync');
    const result = await syncS3LoRAs(projectRoot);

    if (!result.success) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: result.error || 'Failed to sync LoRA files'
      }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err: any) {
    console.error('[S3 Sync] Error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Failed to sync LoRA files',
      details: err.message 
    }));
  }
}
