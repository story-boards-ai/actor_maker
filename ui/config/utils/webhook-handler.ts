import * as path from 'path';
import * as fs from 'fs';

interface WebhookData {
  id: string;
  status: string;
  output?: {
    job_id?: string;
    loraUrl?: string;
    s3_url?: string;
    loraName?: string;
    [key: string]: any;
  };
  error?: string;
  [key: string]: any;
}

interface ProcessWebhookResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Process training webhook and update training versions file
 */
export function processTrainingWebhook(
  webhookData: WebhookData,
  projectRoot: string
): ProcessWebhookResult {
  try {
    console.log('[Training Webhook] Processing webhook:', {
      id: webhookData.id,
      status: webhookData.status,
      hasOutput: !!webhookData.output
    });

    const status = webhookData.status;
    const output = webhookData.output || {};
    const runpodJobId = webhookData.id; // The actual RunPod job ID (stored as version ID)
    const loraUrl = output.loraUrl || output.s3_url;
    const error = webhookData.error || output.error;

    // Validate required fields
    if (!status || !runpodJobId) {
      return {
        success: false,
        error: 'Missing required fields: status or job ID'
      };
    }

    // Extract style ID from custom job_id or loraName
    const styleId = extractStyleId(output);
    
    if (!styleId) {
      console.warn('[Training Webhook] Could not extract style ID from output:', output);
      return {
        success: false,
        error: 'Could not extract style ID from webhook data'
      };
    }

    console.log('[Training Webhook] Extracted style ID:', styleId);

    // Get training versions file path
    const versionsPath = getTrainingVersionsPath(styleId, projectRoot);
    
    if (!fs.existsSync(versionsPath)) {
      console.warn('[Training Webhook] Training versions file not found:', versionsPath);
      return {
        success: false,
        error: `Training versions file not found for style ${styleId}`
      };
    }

    // Load training versions
    const data = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
    
    // Find version by RunPod job ID (this is the version.id)
    // Note: Stored IDs may have -e1, -e2 suffixes, but webhook sends base UUID
    const versionIndex = data.versions.findIndex((v: any) => {
      // Try exact match first
      if (v.id === runpodJobId) return true;
      // Try matching base UUID (strip -e suffix from stored ID)
      const baseId = v.id.replace(/-e\d+$/, '');
      return baseId === runpodJobId;
    });
    
    if (versionIndex === -1) {
      console.warn('[Training Webhook] Version not found for RunPod job ID:', runpodJobId);
      console.warn('[Training Webhook] Available version IDs:', data.versions.map((v: any) => v.id));
      return {
        success: false,
        error: `Version not found for job ID: ${runpodJobId}`
      };
    }

    // Update version based on status
    const isSuccess = status === 'COMPLETED' || status === 'success';
    
    if (isSuccess) {
      data.versions[versionIndex].status = 'completed';
      data.versions[versionIndex].loraUrl = loraUrl;
      data.versions[versionIndex].completedAt = new Date().toISOString();
      console.log('[Training Webhook] ✅ Training completed successfully:', runpodJobId);
      console.log('[Training Webhook] LoRA URL:', loraUrl);
    } else {
      data.versions[versionIndex].status = 'failed';
      data.versions[versionIndex].error = error || `Training ${status.toLowerCase()}`;
      data.versions[versionIndex].failedAt = new Date().toISOString();
      console.log('[Training Webhook] ❌ Training failed:', runpodJobId, status, error);
    }
    
    // Save updated versions
    fs.writeFileSync(versionsPath, JSON.stringify(data, null, 2));
    console.log('[Training Webhook] Updated version status saved to:', versionsPath);

    return {
      success: true,
      message: `Version updated successfully for style ${styleId}`
    };
  } catch (err: any) {
    console.error('[Training Webhook] Error processing webhook:', err.message);
    console.error('[Training Webhook] Stack trace:', err.stack);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Extract style ID from webhook output
 */
function extractStyleId(output: any): string | null {
  // Try to extract from job_id (e.g., "16_1760254040983" -> "16")
  if (output.job_id) {
    const match = output.job_id.match(/^(\d+)_/);
    if (match) {
      return match[1];
    }
  }
  
  // Try to extract from loraName (e.g., "style_16_vV1.safetensors" -> "16")
  if (output.loraName) {
    const match = output.loraName.match(/^style_(\d+)_/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Get the path to training versions file for a style
 */
function getTrainingVersionsPath(styleId: string, projectRoot: string): string {
  // Find the style folder (it might have a name suffix)
  const styleImagesDir = path.join(projectRoot, 'resources', 'style_images');
  
  if (fs.existsSync(styleImagesDir)) {
    const folders = fs.readdirSync(styleImagesDir);
    const styleFolder = folders.find(f => f.startsWith(`${styleId}_`));
    
    if (styleFolder) {
      return path.join(styleImagesDir, styleFolder, 'training_versions.json');
    }
  }
  
  // Fallback: create in a generic location
  const fallbackDir = path.join(projectRoot, 'data', 'training_versions');
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  return path.join(fallbackDir, `${styleId}.json`);
}
