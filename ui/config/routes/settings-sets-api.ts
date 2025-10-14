import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { IncomingMessage, ServerResponse } from 'http'

interface SettingsSet {
  id: string;
  name: string;
  styleId: string;
  styleName: string;
  modelId: string;
  modelName: string;
  timestamp: string;
  rating: string | null;
  comment: string;
  seed: number;
  seedLocked: boolean;
  steps: number;
  cfg: number;
  denoise: number;
  guidance: number;
  width: number;
  height: number;
  samplerName: string;
  schedulerName: string;
  loraWeight: number;
  characterLoraWeight: number;
  cineLoraWeight: number;
  monochromeContrast: number;
  monochromeBrightness: number;
  frontpad: string;
  backpad: string;
  testImageUrl?: string;
  testPrompt?: string;
}

interface SettingsSetSummary {
  id: string;
  name: string;
  styleId: string;
  styleName: string;
  modelName: string;
  rating: string | null;
  timestamp: string;
}

/**
 * API routes for settings sets management (validator settings persistence)
 */
export function createSettingsSetsApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // List settings sets for a style
    if (url.startsWith('/api/settings-sets?') && req.method === 'GET') {
      handleListSettingsSets(url, req, projectRoot, res)
      return
    }
    
    // Get specific settings set by ID
    if (url.match(/^\/api\/settings-sets\/[^/?]+$/) && req.method === 'GET') {
      handleGetSettingsSet(url, projectRoot, res)
      return
    }
    
    // Create new settings set
    if (url === '/api/settings-sets' && req.method === 'POST') {
      handleCreateSettingsSet(req, projectRoot, res)
      return
    }
    
    // Delete settings set
    if (url.match(/^\/api\/settings-sets\/[^/?]+$/) && req.method === 'DELETE') {
      handleDeleteSettingsSet(url, projectRoot, res)
      return
    }
    
    next()
  }
}

function getSettingsSetsDir(projectRoot: string): string {
  const dir = path.join(projectRoot, 'data', 'validator_settings_sets')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getStyleSettingsSetsFile(projectRoot: string, styleId: string): string {
  return path.join(getSettingsSetsDir(projectRoot), `style_${styleId}.json`)
}

function loadStyleSettingsSets(projectRoot: string, styleId: string): SettingsSet[] {
  const filePath = getStyleSettingsSetsFile(projectRoot, styleId)
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    } catch (err) {
      console.error(`[Settings Sets] Error loading for style ${styleId}:`, err)
      return []
    }
  }
  return []
}

function saveStyleSettingsSets(projectRoot: string, styleId: string, sets: SettingsSet[]): void {
  const filePath = getStyleSettingsSetsFile(projectRoot, styleId)
  fs.writeFileSync(filePath, JSON.stringify(sets, null, 2))
  console.log(`[Settings Sets] Saved ${sets.length} sets for style ${styleId}`)
}

function handleListSettingsSets(
  url: string,
  req: IncomingMessage,
  projectRoot: string,
  res: ServerResponse
) {
  try {
    const urlObj = new URL(url, `http://${req.headers.host}`)
    const styleId = urlObj.searchParams.get('styleId')
    
    if (!styleId) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'styleId parameter required' }))
      return
    }
    
    const sets = loadStyleSettingsSets(projectRoot, styleId)
    
    // Return summaries only (not full settings)
    const summaries: SettingsSetSummary[] = sets.map(set => ({
      id: set.id,
      name: set.name,
      styleId: set.styleId,
      styleName: set.styleName,
      modelName: set.modelName,
      rating: set.rating,
      timestamp: set.timestamp,
    }))
    
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ settingsSets: summaries }))
  } catch (err) {
    console.error('[Settings Sets] List error:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to list settings sets' }))
  }
}

function handleGetSettingsSet(url: string, projectRoot: string, res: ServerResponse) {
  try {
    const id = url.split('/').pop()
    if (!id) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Invalid settings set ID' }))
      return
    }
    
    // Search through all style files to find the settings set
    const settingsSetsDir = getSettingsSetsDir(projectRoot)
    const files = fs.readdirSync(settingsSetsDir).filter(f => f.startsWith('style_') && f.endsWith('.json'))
    
    for (const file of files) {
      const sets = JSON.parse(fs.readFileSync(path.join(settingsSetsDir, file), 'utf-8'))
      const set = sets.find((s: SettingsSet) => s.id === id)
      if (set) {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(set))
        return
      }
    }
    
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Settings set not found' }))
  } catch (err) {
    console.error('[Settings Sets] Get error:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to get settings set' }))
  }
}

function handleCreateSettingsSet(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const data = JSON.parse(body)
      
      // Validate required fields
      if (!data.name || !data.styleId || !data.modelId) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'Missing required fields: name, styleId, modelId' }))
        return
      }
      
      // Create new settings set with ID and timestamp
      const newSet: SettingsSet = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        ...data,
      }
      
      // Load existing sets for this style
      const sets = loadStyleSettingsSets(projectRoot, data.styleId)
      
      // Add new set
      sets.push(newSet)
      
      // Save
      saveStyleSettingsSets(projectRoot, data.styleId, sets)
      
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(newSet))
      console.log(`[Settings Sets] Created: ${newSet.name} (${newSet.id})`)
    } catch (err) {
      console.error('[Settings Sets] Create error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to create settings set' }))
    }
  })
}

function handleDeleteSettingsSet(url: string, projectRoot: string, res: ServerResponse) {
  try {
    const id = url.split('/').pop()
    if (!id) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Invalid settings set ID' }))
      return
    }
    
    // Search through all style files to find and delete the settings set
    const settingsSetsDir = getSettingsSetsDir(projectRoot)
    const files = fs.readdirSync(settingsSetsDir).filter(f => f.startsWith('style_') && f.endsWith('.json'))
    
    for (const file of files) {
      const filePath = path.join(settingsSetsDir, file)
      const sets: SettingsSet[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const index = sets.findIndex(s => s.id === id)
      
      if (index !== -1) {
        const deleted = sets.splice(index, 1)[0]
        fs.writeFileSync(filePath, JSON.stringify(sets, null, 2))
        console.log(`[Settings Sets] Deleted: ${deleted.name} (${deleted.id})`)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
        return
      }
    }
    
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Settings set not found' }))
  } catch (err) {
    console.error('[Settings Sets] Delete error:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to delete settings set' }))
  }
}
