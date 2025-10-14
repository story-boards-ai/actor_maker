import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Get the project root directory (parent of ui/)
 */
export function getProjectRoot(): string {
  // From ui/config/utils/ we need to go up 3 levels to reach actor_maker root
  return path.join(__dirname, '..', '..', '..')
}

/**
 * Get path to Python venv executable
 */
export function getPythonExecutable(projectRoot: string): string {
  const venvPython = path.join(projectRoot, 'venv', 'bin', 'python')
  return fs.existsSync(venvPython) ? venvPython : 'python3'
}

/**
 * Get style folder name from style object
 */
export function getStyleFolderName(styleId: string, styleTitle: string): string {
  const titleSimplified = styleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return `${styleId}_${titleSimplified}`
}
