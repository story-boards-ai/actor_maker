import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

/**
 * API routes for settings persistence
 */
export function createSettingsApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // API endpoint to save settings (style-specific)
    if (url.startsWith('/api/settings/save') && req.method === 'POST') {
      handleSettingsSave(url, req, projectRoot, res)
      return
    }
    
    // API endpoint to load settings (style-specific)
    if (url.startsWith('/api/settings/load') && req.method === 'GET') {
      handleSettingsLoad(url, req, projectRoot, res)
      return
    }
    
    next()
  }
}

function handleSettingsSave(url: string, req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  const urlObj = new URL(url, `http://${req.headers.host}`)
  const styleId = urlObj.searchParams.get('styleId') || 'default'
  
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const settings = JSON.parse(body)
      const settingsDir = path.join(projectRoot, 'data', 'settings')
      
      // Create settings directory if it doesn't exist
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true })
      }
      
      const settingsPath = path.join(settingsDir, `style_${styleId}.json`)
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
      console.log(`[Settings] Saved to: ${settingsPath}`)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true }))
    } catch (err) {
      console.error('[Settings] Save error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to save settings' }))
    }
  })
}

function handleSettingsLoad(url: string, req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  const urlObj = new URL(url, `http://${req.headers.host}`)
  const styleId = urlObj.searchParams.get('styleId') || 'default'
  
  try {
    const settingsPath = path.join(projectRoot, 'data', 'settings', `style_${styleId}.json`)
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      console.log(`[Settings] Loaded from: ${settingsPath}`)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(settings))
    } else {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'No saved settings' }))
    }
  } catch (err) {
    console.error('[Settings] Load error:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to load settings' }))
  }
}
