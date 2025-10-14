import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

/**
 * API routes for style management
 */
export function createStylesApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // API endpoint to get all styles
    if (url === '/api/styles' && req.method === 'GET') {
      handleGetStyles(projectRoot, res)
      return
    }
    
    // API endpoint to update style frontpad/backpad in registry
    if (url === '/api/styles/update-prompts' && req.method === 'POST') {
      handleStylePromptsUpdate(req, projectRoot, res)
      return
    }
    
    // API endpoint to update style settings in registry
    if (url === '/api/styles/update-settings' && req.method === 'POST') {
      handleStyleSettingsUpdate(req, projectRoot, res)
      return
    }
    
    next()
  }
}

function handleGetStyles(projectRoot: string, res: ServerResponse) {
  try {
    const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
    
    if (!fs.existsSync(registryPath)) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Styles registry not found' }))
      return
    }
    
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ 
      styles: registry.styles || [],
      version: registry.version,
      last_synced: registry.last_synced
    }))
  } catch (err) {
    console.error('[Styles] Failed to load styles:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to load styles' }))
  }
}

function handleStylePromptsUpdate(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const { styleId, frontpad, backpad } = JSON.parse(body)
      const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
      
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
        const style = registry.styles.find((s: any) => s.id === styleId)
        
        if (style) {
          style.frontpad = frontpad
          style.backpad = backpad
          style.metadata.updated_at = new Date().toISOString()
          
          fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2))
          console.log(`[Styles] Updated frontpad/backpad for style ${styleId}`)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, style }))
        } else {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Style not found' }))
        }
      } else {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Styles registry not found' }))
      }
    } catch (err) {
      console.error('[Styles] Update error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to update style' }))
    }
  })
}

function handleStyleSettingsUpdate(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const { 
        styleId, 
        loraWeight, 
        characterLoraWeight, 
        cineLoraWeight,
        steps,
        cfg,
        denoise,
        guidance,
        samplerName,
        schedulerName
      } = JSON.parse(body)
      
      const registryPath = path.join(projectRoot, 'data', 'styles_registry.json')
      
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
        const style = registry.styles.find((s: any) => s.id === styleId)
        
        if (style) {
          // Update LoRA weights
          if (loraWeight !== undefined) style.lora_weight = loraWeight
          if (characterLoraWeight !== undefined) style.character_lora_weight = characterLoraWeight
          if (cineLoraWeight !== undefined) style.cine_lora_weight = cineLoraWeight
          
          // Update generation settings
          if (steps !== undefined) style.steps = steps
          if (cfg !== undefined) style.cfg = cfg
          if (denoise !== undefined) style.denoise = denoise
          if (guidance !== undefined) style.guidance = guidance
          if (samplerName !== undefined) style.sampler_name = samplerName
          if (schedulerName !== undefined) style.scheduler_name = schedulerName
          
          // Update timestamp
          style.metadata.updated_at = new Date().toISOString()
          
          fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2))
          console.log(`[Styles] Updated settings for style ${styleId}`)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, style }))
        } else {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'Style not found' }))
        }
      } else {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Styles registry not found' }))
      }
    } catch (err) {
      console.error('[Styles] Settings update error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to update style settings' }))
    }
  })
}
