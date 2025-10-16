import { spawn, ChildProcess } from 'child_process'
import { getPythonExecutable } from './path-helpers'

export interface PythonExecutionOptions {
  scriptPath?: string
  scriptCode?: string
  args?: string[]  // Command-line arguments to pass to the script
  cwd: string
  stdinData?: any
  logPrefix?: string
  silent?: boolean  // Disable stdout logging (only log errors and exit code)
}

export interface PythonExecutionResult {
  exitCode: number
  stdout: string
  stderr: string
}

/**
 * Execute a Python script and return the result
 */
export async function executePython(options: PythonExecutionOptions): Promise<PythonExecutionResult> {
  const { scriptPath, scriptCode, args = [], cwd, stdinData, logPrefix = '[PYTHON]' } = options
  
  const pythonExecutable = getPythonExecutable(cwd)
  
  // Pass environment variables to Python subprocess
  const spawnOptions = { 
    cwd,
    env: process.env 
  }
  
  let python: ChildProcess
  if (scriptCode) {
    // Execute inline Python code
    python = spawn(pythonExecutable, ['-c', scriptCode], spawnOptions)
  } else if (scriptPath) {
    // Execute Python script file with optional arguments
    python = spawn(pythonExecutable, [scriptPath, ...args], spawnOptions)
  } else {
    throw new Error('Either scriptPath or scriptCode must be provided')
  }
  
  // Send stdin data if provided
  if (stdinData !== undefined) {
    python.stdin?.write(JSON.stringify(stdinData))
  }
  python.stdin?.end()
  
  let stdout = ''
  let stderr = ''
  
  python.stdout?.on('data', (data) => {
    const text = data.toString()
    stdout += text
    
    // Only log stdout if not in silent mode
    if (!options.silent) {
      // Log stdout (truncate if too long)
      if (text.trim().length > 200) {
        console.log(`${logPrefix} stdout:`, text.trim().substring(0, 200) + '... [truncated]')
      } else if (text.trim()) {
        console.log(`${logPrefix} stdout:`, text.trim())
      }
    }
  })
  
  python.stderr?.on('data', (data) => {
    const text = data.toString()
    stderr += text
    if (text.trim()) {
      console.log(`${logPrefix} stderr:`, text.trim())
    }
  })
  
  return new Promise((resolve) => {
    python.on('close', (exitCode) => {
      console.log(`${logPrefix} Process exited with code:`, exitCode)
      resolve({
        exitCode: exitCode || 0,
        stdout,
        stderr,
      })
    })
  })
}
