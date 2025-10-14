import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { executePython } from '../utils/python-executor'
import { getStyleFolderName } from '../utils/path-helpers'

/**
 * API routes for S3 operations
 */
export function createS3Api(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // API endpoint to check S3 sync status for a style
    if (url.startsWith('/api/s3/check-status') && req.method === 'GET') {
      handleS3CheckStatus(url, req, projectRoot, res)
      return
    }
    
    // API endpoint to upload images to S3
    if (url === '/api/s3/upload' && req.method === 'POST') {
      handleS3Upload(req, projectRoot, res)
      return
    }
    
    // API endpoint to delete images from S3
    if (url === '/api/s3/delete' && req.method === 'POST') {
      handleS3Delete(req, projectRoot, res)
      return
    }
    
    // API endpoint to download all style images from S3
    if (url === '/api/s3/download' && req.method === 'POST') {
      handleS3Download(req, projectRoot, res)
      return
    }
    
    // API endpoint to compare local files with S3 (detect changes)
    if (url === '/api/s3/compare' && req.method === 'POST') {
      handleS3Compare(req, projectRoot, res)
      return
    }
    
    // API endpoint to get S3 manifest for a style
    if (url.startsWith('/api/s3/manifest') && req.method === 'GET') {
      handleGetManifest(url, req, projectRoot, res)
      return
    }
    
    next()
  }
}

function handleS3CheckStatus(url: string, req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  const urlObj = new URL(url, `http://${req.headers.host}`)
  const styleId = urlObj.searchParams.get('styleId')
  
  if (!styleId) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'styleId is required' }))
    return
  }
  
  const pythonScriptPath = path.join(projectRoot, 'scripts', 's3_check_status.py')
  
  executePython({
    scriptPath: pythonScriptPath,
    cwd: projectRoot,
    stdinData: { styleId },
    logPrefix: '[S3-CHECK]',
    silent: true,  // Disable verbose stdout logging for large JSON responses
  }).then(result => {
    if (result.exitCode !== 0) {
      console.error('[S3-CHECK] Error:', result.stderr)
      res.statusCode = 500
      res.end(JSON.stringify({ error: result.stderr || 'Failed to check S3 status', files: [] }))
      return
    }
    
    try {
      const parsedResult = JSON.parse(result.stdout)
      console.log(`[S3-CHECK] Found ${parsedResult.count} files for style ${styleId}`)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(parsedResult))
    } catch (err) {
      console.error('[S3-CHECK] Parse error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to parse results', files: [] }))
    }
  }).catch(err => {
    console.error('[S3-CHECK] Request error:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: String(err), files: [] }))
  })
}

function handleS3Upload(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const { styleId, images, syncDeletes, maxWorkers } = JSON.parse(body)
      
      console.log('[S3-UPLOAD] Request received')
      console.log('[S3-UPLOAD] Style ID:', styleId)
      console.log('[S3-UPLOAD] Images to upload:', images.length)
      console.log('[S3-UPLOAD] Sync deletes:', syncDeletes || false)
      console.log('[S3-UPLOAD] Max workers:', maxWorkers || 20)
      
      // Use fast parallel upload script
      const pythonScriptPath = path.join(projectRoot, 'scripts', 's3_sync_fast.py')
      
      const result = await executePython({
        scriptPath: pythonScriptPath,
        cwd: projectRoot,
        stdinData: { 
          styleId, 
          images, 
          syncDeletes: syncDeletes || false,
          maxWorkers: maxWorkers || 20  // Parallel upload workers
        },
        logPrefix: '[S3-UPLOAD]',
      })
      
      if (result.exitCode !== 0) {
        console.error('[S3-UPLOAD] Error:', result.stderr)
        res.statusCode = 500
        res.end(JSON.stringify({ error: result.stderr || 'Failed to upload to S3' }))
        return
      }
      
      const parsedResult = JSON.parse(result.stdout)
      console.log(`[S3-UPLOAD] ✅ Uploaded: ${parsedResult.uploaded}, Failed: ${parsedResult.failed}`)
      
      // Update S3 manifest if files were uploaded
      if (parsedResult.uploaded > 0 && parsedResult.uploaded_files) {
        try {
          await updateS3Manifest(projectRoot, styleId, parsedResult.uploaded_files)
          console.log(`[S3-UPLOAD] ✅ Updated manifest for style ${styleId}`)
        } catch (err) {
          console.error(`[S3-UPLOAD] ⚠️ Failed to update manifest:`, err)
        }
      }
      // Return parsed result on success
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(parsedResult))
    } catch (err) {
      console.error('[S3-UPLOAD] Request error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(err) }))
    }
  })
}

function handleS3Delete(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const { styleId, filenames } = JSON.parse(body)
      
      console.log('[S3-DELETE] Request received')
      console.log('[S3-DELETE] Style ID:', styleId)
      console.log('[S3-DELETE] Files to delete:', filenames.length)
      
      const pythonScriptPath = path.join(projectRoot, 'scripts', 's3_delete.py')
      
      const result = await executePython({
        scriptPath: pythonScriptPath,
        cwd: projectRoot,
        stdinData: { styleId, filenames },
        logPrefix: '[S3-DELETE]',
      })
      
      if (result.exitCode !== 0) {
        console.error('[S3-DELETE] Error:', result.stderr)
        res.statusCode = 500
        res.end(JSON.stringify({ error: result.stderr || 'Failed to delete from S3' }))
        return
      }
      
      const parsedResult = JSON.parse(result.stdout)
      console.log(`[S3-DELETE] Deleted: ${parsedResult.deleted}, Failed: ${parsedResult.failed}`)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(parsedResult))
    } catch (err) {
      console.error('[S3-DELETE] Request error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(err) }))
    }
  })
}

function handleS3Download(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const { styleId, syncDeletes } = JSON.parse(body)
      
      console.log('[S3-DOWNLOAD] Request received')
      console.log('[S3-DOWNLOAD] Style ID:', styleId)
      console.log('[S3-DOWNLOAD] Sync deletes:', syncDeletes || false)
      
      const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
      
      if (!fs.existsSync(registryPath)) {
        throw new Error('Styles registry not found')
      }
      
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      const style = registry.styles.find((s: any) => s.id === styleId)
      
      if (!style) {
        throw new Error(`Style ${styleId} not found`)
      }
      
      const folderName = getStyleFolderName(styleId, style.title)
      const localDir = path.join(projectRoot, 'resources', 'style_images', folderName)
      
      const pythonScriptPath = path.join(projectRoot, 'scripts', 's3_download.py')
      
      const result = await executePython({
        scriptPath: pythonScriptPath,
        cwd: projectRoot,
        stdinData: { styleId, localDir, syncDeletes: syncDeletes || false },
        logPrefix: '[S3-DOWNLOAD]',
      })
      
      if (result.exitCode !== 0) {
        console.error('[S3-DOWNLOAD] Error:', result.stderr)
        res.statusCode = 500
        res.end(JSON.stringify({ error: result.stderr || 'Failed to download from S3' }))
        return
      }
      
      const parsedResult = JSON.parse(result.stdout)
      console.log(`[S3-DOWNLOAD] Downloaded: ${parsedResult.downloaded}, Failed: ${parsedResult.failed}`)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(parsedResult))
    } catch (err) {
      console.error('[S3-DOWNLOAD] Request error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(err) }))
    }
  })
}

function handleS3Compare(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const { styleId, localImages } = JSON.parse(body)
      
      console.log('[S3-COMPARE] Request received')
      console.log('[S3-COMPARE] Style ID:', styleId)
      console.log('[S3-COMPARE] Local images to compare:', localImages.length)
      
      const pythonScriptPath = path.join(projectRoot, 'scripts', 's3_compare.py')
      
      const result = await executePython({
        scriptPath: pythonScriptPath,
        cwd: projectRoot,
        stdinData: { styleId, localImages },
        logPrefix: '[S3-COMPARE]',
      })
      
      if (result.exitCode !== 0) {
        console.error('[S3-COMPARE] Error:', result.stderr)
        res.statusCode = 500
        res.end(JSON.stringify({ error: result.stderr || 'Failed to compare with S3' }))
        return
      }
      
      const parsedResult = JSON.parse(result.stdout)
      
      // Log clearer summary
      const summary = parsedResult.summary
      console.log('[S3-COMPARE] Results:')
      console.log(`  - Compared: ${summary.total_local} local files`)
      console.log(`  - Missing in S3: ${summary.missing_in_s3}`)
      console.log(`  - Different: ${summary.different}`)
      console.log(`  - Identical: ${summary.identical}`)
      if (summary.total_local === summary.total_s3) {
        console.log(`  - Full sync check: ${summary.missing_locally} files in S3 not found locally`)
      } else {
        console.log(`  - Note: Partial comparison (${summary.total_local} selected vs ${summary.total_s3} total in S3)`)
      }
      
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(parsedResult))
    } catch (err) {
      console.error('[S3-COMPARE] Request error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(err) }))
    }
  })
}

async function updateS3Manifest(projectRoot: string, styleId: string, uploadedFiles: any[]) {
  const manifestDir = path.join(projectRoot, 'data', 's3_manifests')
  const manifestPath = path.join(manifestDir, `style_${styleId}_s3_manifest.json`)
  
  // Ensure manifest directory exists
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true })
  }
  
  // Load existing manifest or create new one
  let manifest: any
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  } else {
    // Load style info from registry
    const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
    const style = registry.styles.find((s: any) => s.id === styleId)
    
    manifest = {
      style_id: styleId,
      style_title: style?.title || `Style ${styleId}`,
      s3_bucket: process.env.AWS_ASSETS_BUCKET || 'storyboard-user-files',
      s3_prefix: `styles/${styleId}/`,
      created_at: new Date().toISOString(),
      files: []
    }
  }
  
  // Update manifest with new files
  for (const uploadedFile of uploadedFiles) {
    // Remove existing entry if it exists
    manifest.files = manifest.files.filter((f: any) => f.filename !== uploadedFile.filename)
    
    // Add new entry
    manifest.files.push({
      ...uploadedFile,
      last_modified: uploadedFile.uploaded_at
    })
  }
  
  // Update metadata
  manifest.last_synced = new Date().toISOString()
  manifest.total_files = manifest.files.length
  manifest.total_size_bytes = manifest.files.reduce((sum: number, f: any) => sum + (f.size_bytes || 0), 0)
  
  // Sort files by filename
  manifest.files.sort((a: any, b: any) => a.filename.localeCompare(b.filename))
  
  // Save manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

function handleGetManifest(url: string, req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  const urlObj = new URL(url, `http://${req.headers.host}`)
  const styleId = urlObj.searchParams.get('styleId')
  
  if (!styleId) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'styleId is required' }))
    return
  }
  
  const manifestPath = path.join(projectRoot, 'data', 's3_manifests', `style_${styleId}_s3_manifest.json`)
  
  if (!fs.existsSync(manifestPath)) {
    res.statusCode = 404
    res.end(JSON.stringify({ 
      error: 'Manifest not found',
      message: 'No S3 uploads have been made for this style yet'
    }))
    return
  }
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(manifest))
  } catch (err) {
    console.error('[S3-MANIFEST] Error reading manifest:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to read manifest' }))
  }
}
