import * as path from 'path';
import * as fs from 'fs';

/**
 * Get the path to training versions file for an actor
 */
export function getActorTrainingVersionsPath(actorId: string, projectRoot: string): string {
  // Load actorsData to get actor name
  const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
  
  if (fs.existsSync(actorsDataPath)) {
    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    const actor = actorsData.find((a: any) => a.id === parseInt(actorId));
    
    if (actor) {
      const actorDir = path.join(projectRoot, 'data', 'actors', actor.name);
      if (!fs.existsSync(actorDir)) {
        fs.mkdirSync(actorDir, { recursive: true });
      }
      return path.join(actorDir, 'training_versions.json');
    }
  }
  
  // Fallback: create in a generic location
  const fallbackDir = path.join(projectRoot, 'data', 'actor_training_versions');
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  return path.join(fallbackDir, `${actorId}.json`);
}

/**
 * Load actor data by ID
 */
export function loadActorById(actorId: string, projectRoot: string): any | null {
  const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
  
  if (!fs.existsSync(actorsDataPath)) {
    return null;
  }
  
  const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
  return actorsData.find((a: any) => a.id === parseInt(actorId));
}

/**
 * Load all actors data
 */
export function loadAllActors(projectRoot: string): any[] {
  const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
  
  if (!fs.existsSync(actorsDataPath)) {
    return [];
  }
  
  return JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
}
