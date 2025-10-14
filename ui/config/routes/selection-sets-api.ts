import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

/**
 * API routes for selection set management
 * Selection sets are saved per style in: resources/style_images/{style_id}/selection_sets.json
 */
export function createSelectionSetsApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    
    if (!url) {
      next()
      return
    }
    
    // GET /api/styles/:styleId/selection-sets - Load all sets for a style
    const getMatch = url.match(/^\/api\/styles\/(\d+)\/selection-sets$/)
    if (getMatch && req.method === 'GET') {
      handleGetSets(getMatch[1], projectRoot, res)
      return
    }
    
    // POST /api/styles/:styleId/selection-sets - Create new set
    const postMatch = url.match(/^\/api\/styles\/(\d+)\/selection-sets$/)
    if (postMatch && req.method === 'POST') {
      handleCreateSet(req, postMatch[1], projectRoot, res)
      return
    }
    
    // PUT /api/styles/:styleId/selection-sets/:setId - Update existing set
    const putMatch = url.match(/^\/api\/styles\/(\d+)\/selection-sets\/(\d+)$/)
    if (putMatch && req.method === 'PUT') {
      handleUpdateSet(req, putMatch[1], putMatch[2], projectRoot, res)
      return
    }
    
    // DELETE /api/styles/:styleId/selection-sets/:setId - Delete set
    const deleteMatch = url.match(/^\/api\/styles\/(\d+)\/selection-sets\/(\d+)$/)
    if (deleteMatch && req.method === 'DELETE') {
      handleDeleteSet(deleteMatch[1], deleteMatch[2], projectRoot, res)
      return
    }
    
    next()
  }
}

function getSelectionSetsPath(styleId: string, projectRoot: string): string {
  return path.join(projectRoot, 'resources', 'style_images', `${styleId}_*`, 'selection_sets.json')
}

function findStyleDirectory(styleId: string, projectRoot: string): string | null {
  const styleImagesDir = path.join(projectRoot, 'resources', 'style_images')
  
  if (!fs.existsSync(styleImagesDir)) {
    return null
  }
  
  const dirs = fs.readdirSync(styleImagesDir)
  const styleDir = dirs.find(dir => dir.startsWith(`${styleId}_`))
  
  if (styleDir) {
    return path.join(styleImagesDir, styleDir)
  }
  
  return null
}

function handleGetSets(styleId: string, projectRoot: string, res: ServerResponse) {
  try {
    const styleDir = findStyleDirectory(styleId, projectRoot)
    
    if (!styleDir) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ sets: [] }))
      return
    }
    
    const setsPath = path.join(styleDir, 'selection_sets.json')
    
    if (!fs.existsSync(setsPath)) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ sets: [] }))
      return
    }
    
    const data = JSON.parse(fs.readFileSync(setsPath, 'utf-8'))
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ sets: data.sets || [] }))
  } catch (err) {
    console.error('[SelectionSets] Get error:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to load selection sets' }))
  }
}

function handleCreateSet(req: IncomingMessage, styleId: string, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const { id, filenames } = JSON.parse(body)
      const styleDir = findStyleDirectory(styleId, projectRoot)
      
      if (!styleDir) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Style directory not found' }))
        return
      }
      
      const setsPath = path.join(styleDir, 'selection_sets.json')
      let data = { sets: [] }
      
      if (fs.existsSync(setsPath)) {
        data = JSON.parse(fs.readFileSync(setsPath, 'utf-8'))
      }
      
      // Check if set ID already exists
      const existingIndex = data.sets.findIndex((s: any) => s.id === id)
      if (existingIndex !== -1) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'Set ID already exists' }))
        return
      }
      
      data.sets.push({ id, filenames })
      data.sets.sort((a: any, b: any) => a.id - b.id)
      
      fs.writeFileSync(setsPath, JSON.stringify(data, null, 2))
      console.log(`[SelectionSets] Created set ${id} for style ${styleId}`)
      
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true, set: { id, filenames } }))
    } catch (err) {
      console.error('[SelectionSets] Create error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to create selection set' }))
    }
  })
}

function handleUpdateSet(req: IncomingMessage, styleId: string, setId: string, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const { filenames } = JSON.parse(body)
      const styleDir = findStyleDirectory(styleId, projectRoot)
      
      if (!styleDir) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Style directory not found' }))
        return
      }
      
      const setsPath = path.join(styleDir, 'selection_sets.json')
      
      if (!fs.existsSync(setsPath)) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Selection sets file not found' }))
        return
      }
      
      const data = JSON.parse(fs.readFileSync(setsPath, 'utf-8'))
      const setIndex = data.sets.findIndex((s: any) => s.id === parseInt(setId))
      
      if (setIndex === -1) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Set not found' }))
        return
      }
      
      data.sets[setIndex].filenames = filenames
      fs.writeFileSync(setsPath, JSON.stringify(data, null, 2))
      console.log(`[SelectionSets] Updated set ${setId} for style ${styleId}`)
      
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true, set: data.sets[setIndex] }))
    } catch (err) {
      console.error('[SelectionSets] Update error:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to update selection set' }))
    }
  })
}

function handleDeleteSet(styleId: string, setId: string, projectRoot: string, res: ServerResponse) {
  try {
    const styleDir = findStyleDirectory(styleId, projectRoot)
    
    if (!styleDir) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Style directory not found' }))
      return
    }
    
    const setsPath = path.join(styleDir, 'selection_sets.json')
    
    if (!fs.existsSync(setsPath)) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Selection sets file not found' }))
      return
    }
    
    const data = JSON.parse(fs.readFileSync(setsPath, 'utf-8'))
    const setIndex = data.sets.findIndex((s: any) => s.id === parseInt(setId))
    
    if (setIndex === -1) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Set not found' }))
      return
    }
    
    data.sets.splice(setIndex, 1)
    fs.writeFileSync(setsPath, JSON.stringify(data, null, 2))
    console.log(`[SelectionSets] Deleted set ${setId} for style ${styleId}`)
    
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: true }))
  } catch (err) {
    console.error('[SelectionSets] Delete error:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to delete selection set' }))
  }
}
