import fs from 'fs'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { executePython } from '../utils/python-executor'

/**
 * API routes for prompt management
 */
export function createPromptsApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url
    if (!url) {
      next()
      return
    }
    
    // API endpoint to read a prompt file
    if (url.startsWith('/api/prompt/read/')) {
      handlePromptRead(url, projectRoot, res);
      return
    }
    
    // API endpoint to save a prompt file
    if (url.startsWith('/api/prompt/save/') && req.method === 'POST') {
      handlePromptSave(url, req, projectRoot, res);
      return
    }
    
    // API endpoint to generate prompts with GPT
    if (url === '/api/prompt/generate' && req.method === 'POST') {
      handlePromptGenerate(req, projectRoot, res);
      return
    }
    
    next()
  }
}

function handlePromptRead(url: string, projectRoot: string, res: ServerResponse) {
  const filename = url.replace('/api/prompt/read/', '');
  const promptPath = path.join(projectRoot, 'resources', 'input_images', filename);
  
  if (fs.existsSync(promptPath)) {
    const content = fs.readFileSync(promptPath, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ prompt: content }));
    return;
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ prompt: '' }));
}

function handlePromptSave(url: string, req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  const filename = url.replace('/api/prompt/save/', '');
  const promptPath = path.join(projectRoot, 'resources', 'input_images', filename);
  
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const { prompt } = JSON.parse(body)
      fs.writeFileSync(promptPath, prompt, 'utf-8')
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true }))
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Failed to save prompt' }))
    }
  })
}

function handlePromptGenerate(req: IncomingMessage, projectRoot: string, res: ServerResponse) {
  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', async () => {
    try {
      const { images, systemPrompt, userPrompt, model } = JSON.parse(body)
      
      const pythonPath = path.join(projectRoot, 'scripts', 'generate_prompts.py')
      const stdinData = { images, systemPrompt, userPrompt, model: model || 'gpt-4o' }
      
      const result = await executePython({
        scriptPath: pythonPath,
        cwd: projectRoot,
        stdinData,
        logPrefix: '[PROMPT-GEN]',
      })
      
      if (result.exitCode !== 0) {
        console.error('==========================================')
        console.error('PROMPT GENERATION FAILED')
        console.error('Exit code:', result.exitCode)
        console.error('STDERR output:', result.stderr)
        console.error('STDOUT output:', result.stdout)
        console.error('==========================================')
        res.statusCode = 500
        res.end(JSON.stringify({ 
          error: result.stderr || 'Failed to generate prompts',
          details: {
            exitCode: result.exitCode,
            stderr: result.stderr,
            stdout: result.stdout,
          },
        }))
        return
      }
      
      try {
        const parsedResult = JSON.parse(result.stdout)
        
        // Log based on actual success/failure
        if (parsedResult.successful > 0) {
          console.log(`✅ Prompt generation: ${parsedResult.successful} succeeded, ${parsedResult.failed} failed (${parsedResult.total} total)`)
        } else {
          console.error(`❌ Prompt generation FAILED: ${parsedResult.failed} failed (${parsedResult.total} total)`)
          if (parsedResult.results && parsedResult.results.length > 0) {
            parsedResult.results.forEach((r: any) => {
              if (!r.success) {
                console.error(`   - ${r.filename}: ${r.error}`)
              }
            })
          }
        }
        
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(parsedResult))
      } catch (err) {
        console.error('==========================================')
        console.error('FAILED TO PARSE PYTHON OUTPUT')
        console.error('Parse error:', err)
        console.error('Raw output:', result.stdout)
        console.error('Raw stderr:', result.stderr)
        console.error('==========================================')
        res.statusCode = 500
        res.end(JSON.stringify({ 
          error: 'Failed to parse generation results',
          details: {
            parseError: String(err),
            rawOutput: result.stdout.substring(0, 500),
            rawStderr: result.stderr.substring(0, 500),
          },
        }))
      }
    } catch (err) {
      console.error('==========================================')
      console.error('PROMPT GENERATION REQUEST ERROR')
      console.error('Error:', err)
      console.error('Stack:', err instanceof Error ? err.stack : 'N/A')
      console.error('==========================================')
      res.statusCode = 500
      res.end(JSON.stringify({ 
        error: String(err),
        details: {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
      }))
    }
  })
}
