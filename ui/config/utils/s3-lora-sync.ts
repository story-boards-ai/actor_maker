import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

interface S3LoRAFile {
  filename: string;
  key: string;
  size: number;
  last_modified: string;
  url: string;
}

interface SyncResult {
  success: boolean;
  filesFound: number;
  versionsUpdated: number;
  updates: Array<{
    styleId: string;
    filename: string;
    url: string;
    action: 'updated' | 'created';
  }>;
  error?: string;
}

/**
 * Sync LoRA files from S3 and update training versions
 */
export async function syncS3LoRAs(projectRoot: string): Promise<SyncResult> {
  try {
    console.log('[S3 Sync] Starting LoRA sync from S3...');
    
    // Run the Python script to get S3 LoRA files
    const scriptPath = path.join(projectRoot, 'scripts', 'sync_s3_loras.py');
    
    const result = await runPythonScript(scriptPath, projectRoot);
    
    if (!result.success) {
      return {
        success: false,
        filesFound: 0,
        versionsUpdated: 0,
        updates: [],
        error: result.error || 'Failed to fetch S3 files'
      };
    }

    console.log('[S3 Sync] Found', result.files?.length || 0, 'LoRA files');

    // Update training versions for each file
    const updates = await updateTrainingVersions(result.files || [], projectRoot);

    console.log('[S3 Sync] Updated', updates.length, 'training versions');

    return {
      success: true,
      filesFound: result.files?.length || 0,
      versionsUpdated: updates.length,
      updates
    };
  } catch (err: any) {
    console.error('[S3 Sync] Error:', err);
    return {
      success: false,
      filesFound: 0,
      versionsUpdated: 0,
      updates: [],
      error: err.message
    };
  }
}

/**
 * Run Python script and return parsed JSON result
 */
async function runPythonScript(scriptPath: string, cwd: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [scriptPath], {
      cwd,
      env: { ...process.env }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code: number) => {
      if (code !== 0) {
        console.error('[S3 Sync] Python script failed:', errorOutput);
        reject(new Error(errorOutput || 'Python script failed'));
        return;
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (parseErr: any) {
        reject(new Error(`Failed to parse script output: ${parseErr.message}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Update training versions files with S3 LoRA URLs
 */
async function updateTrainingVersions(
  files: S3LoRAFile[],
  projectRoot: string
): Promise<Array<{ styleId: string; filename: string; url: string; action: 'updated' | 'created' }>> {
  const updates: Array<{ styleId: string; filename: string; url: string; action: 'updated' | 'created' }> = [];

  for (const file of files) {
    // Extract style ID from filename (e.g., "style_100_vV1.safetensors" -> "100")
    const styleIdMatch = file.filename.match(/^style_(\d+)_/);
    if (!styleIdMatch) {
      console.warn('[S3 Sync] Could not parse style ID from:', file.filename);
      continue;
    }

    const styleId = styleIdMatch[1];
    const versionsPath = getTrainingVersionsPath(styleId, projectRoot);
    
    // Load or create training versions file
    let data: any;
    if (fs.existsSync(versionsPath)) {
      data = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
    } else {
      // Ensure directory exists
      const dir = path.dirname(versionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      data = { versions: [] };
    }

    // Try to find existing version by matching loraUrl or filename
    // This handles cases where webhook created entry with RunPod job ID
    // PRIORITY: Match pending/failed entries by version name first (these need URLs)
    // Then match already-synced entries by ID/URL
    
    // Extract version number from filename for matching
    const filenameVersionMatch = file.filename.match(/_(v[V]?\d+)\.safetensors$/i);
    let normalizedFilenameVersion: string | null = null;
    if (filenameVersionMatch) {
      const filenameVersion = filenameVersionMatch[1].toUpperCase(); // "VV4" or "V4"
      normalizedFilenameVersion = filenameVersion.replace(/^VV/, 'V'); // "VV4" -> "V4"
    }
    
    // First pass: Try to find pending/failed entry by version name
    // These are entries created by training start that need the S3 URL
    let version = data.versions.find((v: any) => {
      if (normalizedFilenameVersion && v.name && v.name.toUpperCase() === normalizedFilenameVersion) {
        // Only match if it's pending/failed (needs URL) or has no URL
        if (v.status === 'pending' || v.status === 'failed' || !v.loraUrl) {
          console.log(`[S3 Sync] ✓ Matched pending/failed version by name: "${v.name}" (status: ${v.status}, id: ${v.id})`);
          return true;
        } else {
          console.log(`[S3 Sync] ✗ Found version "${v.name}" but skipping (status: ${v.status}, has URL: ${!!v.loraUrl})`);
        }
      }
      return false;
    });
    
    // Second pass: If no pending entry found, match by ID/URL (already-synced entries)
    if (!version) {
      console.log(`[S3 Sync] No pending version found, checking for already-synced entries...`);
      version = data.versions.find((v: any) => {
        // Match if loraUrl contains the filename (handles different S3 URLs)
        if (v.loraUrl && v.loraUrl.includes(file.filename)) {
          console.log(`[S3 Sync] ✓ Matched by loraUrl containing filename: ${v.id}`);
          return true;
        }
        // Match if version name matches the filename exactly
        if (v.name === file.filename || v.name === file.filename.replace('.safetensors', '')) {
          console.log(`[S3 Sync] ✓ Matched by exact filename: ${v.id}`);
          return true;
        }
        // Match by version ID (for entries created by previous S3 syncs)
        const versionId = file.filename.replace('.safetensors', '');
        if (v.id === versionId) {
          console.log(`[S3 Sync] ✓ Matched by version ID: ${v.id}`);
          return true;
        }
        return false;
      });
      
      if (!version) {
        console.log(`[S3 Sync] No existing version found, will create new entry`);
      }
    }
    
    const isNew = !version;
    
    if (version) {
      // Update existing version (webhook entry or previous S3 sync entry)
      console.log('[S3 Sync] Updating existing version:', version.id, 'with file:', file.filename);
      
      // Only update loraUrl if it's missing OR if we're upgrading to accelerated URL
      // Never downgrade from accelerated to regular S3 URL
      const hasAcceleratedUrl = version.loraUrl && version.loraUrl.includes('s3-accelerate');
      const newIsAccelerated = file.url && file.url.includes('s3-accelerate');
      
      if (!version.loraUrl) {
        // No URL exists, add it
        version.loraUrl = file.url;
        console.log('[S3 Sync] Added missing URL');
      } else if (!hasAcceleratedUrl && newIsAccelerated) {
        // Upgrade to accelerated URL
        version.loraUrl = file.url;
        console.log('[S3 Sync] Upgraded to accelerated URL');
      } else if (hasAcceleratedUrl) {
        // Already has accelerated URL, keep it
        console.log('[S3 Sync] Keeping existing accelerated URL');
      } else {
        // Both are regular URLs, update it
        version.loraUrl = file.url;
        console.log('[S3 Sync] Updated regular URL');
      }
      
      version.status = 'completed';
      version.lastSynced = new Date().toISOString();
      // Don't overwrite existing parameters or metadata from webhook
    } else {
      // Only create new version if no match found (truly new S3 file)
      console.log('[S3 Sync] Creating new version for:', file.filename);
      
      // Extract clean version name from filename (e.g., "style_1_vV8.safetensors" -> "V8")
      let versionName = file.filename;
      if (normalizedFilenameVersion) {
        versionName = normalizedFilenameVersion; // Use "V8" instead of full filename
      }
      
      const versionId = file.filename.replace('.safetensors', '');
      version = {
        id: versionId,
        name: versionName, // Use clean version name (V8) not full filename
        status: 'completed',
        loraUrl: file.url,
        timestamp: file.last_modified,
        lastSynced: new Date().toISOString(),
        parameters: {},
        description: 'Synced from S3'
      };
      data.versions.push(version);
    }

    // Save updated versions
    fs.writeFileSync(versionsPath, JSON.stringify(data, null, 2));
    
    updates.push({
      styleId,
      filename: file.filename,
      url: file.url,
      action: isNew ? 'created' : 'updated'
    });
  }

  return updates;
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
