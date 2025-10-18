import { IncomingMessage, ServerResponse } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { loadActorById, loadAllActors, getActorTrainingVersionsPath } from './utils';

/**
 * GET /api/actors
 * Get all actors from actorsData.json enriched with training data information
 */
export function handleGetAllActors(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) {
  try {
    const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
    
    if (!fs.existsSync(actorsDataPath)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'actorsData.json not found' }));
      return;
    }

    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    
    // Enrich each actor with training data information and manifest data
    const enrichedActors = actorsData.map((actor: any) => {
      const trainingDataDir = path.join(projectRoot, 'data', 'actors', actor.name, 'training_data');
      
      // Load manifest file to get lora_model and custom_lora_models
      const actorIdPadded = actor.id.toString().padStart(4, '0');
      const manifestPath = path.join(projectRoot, 'data', 'actor_manifests', `${actorIdPadded}_manifest.json`);
      let manifestData: any = {};
      
      if (fs.existsSync(manifestPath)) {
        try {
          manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        } catch (error) {
          console.error(`Error loading manifest for actor ${actor.id}:`, error);
        }
      }
      
      // Calculate model status fields
      const customModels = manifestData.custom_lora_models || [];
      const customModelsCount = customModels.length;
      
      // Check if any custom model is marked as good (we'll add this field to manifests later)
      // For now, use a placeholder - we'll need to add a "good" flag to custom_lora_models
      const customModelsGood = false; // TODO: implement model good marking
      
      // Production sync status - placeholder for future implementation
      const productionSynced = false; // TODO: implement production sync tracking
      
      // Training data good status from manifest
      const trainingDataGood = manifestData.training_data_good || false;
      
      // Check if training data directory exists
      if (fs.existsSync(trainingDataDir)) {
        // Count training images (png and jpg files, excluding metadata files)
        const files = fs.readdirSync(trainingDataDir);
        const imageFiles = files.filter(f => 
          (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) && 
          !f.includes('response') && 
          !f.includes('request') && 
          !f.includes('metadata')
        );
        
        // Check if response.json exists (indicates S3 sync status)
        const responseJsonPath = path.join(trainingDataDir, 'response.json');
        const hasSyncedData = fs.existsSync(responseJsonPath);
        
        // Add training_data field, lora_model, and custom_lora_models to actor
        return {
          ...actor,
          training_data: {
            count: imageFiles.length,
            synced: hasSyncedData
          },
          lora_model: manifestData.lora_model,
          custom_lora_models: manifestData.custom_lora_models,
          training_data_good: trainingDataGood,
          custom_models_count: customModelsCount,
          custom_models_good: customModelsGood,
          production_synced: productionSynced
        };
      }
      
      // No training data directory, but still include manifest data
      return {
        ...actor,
        lora_model: manifestData.lora_model,
        custom_lora_models: manifestData.custom_lora_models,
        training_data_good: trainingDataGood,
        custom_models_count: customModelsCount,
        custom_models_good: customModelsGood,
        production_synced: productionSynced
      };
    });
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(enrichedActors));
  } catch (error) {
    console.error('Error loading actors:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load actors' }));
  }
}

/**
 * POST /api/actors/:actorId/toggle-good
 * Toggle actor as good/not good
 */
export function handleToggleGood(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    // Load actorsData
    const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    const actorIndex = actorsData.findIndex((a: any) => a.id === parseInt(actorId));

    if (actorIndex === -1) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Toggle the 'good' flag
    const currentGood = actorsData[actorIndex].good || false;
    actorsData[actorIndex].good = !currentGood;

    // Save back to file
    fs.writeFileSync(actorsDataPath, JSON.stringify(actorsData, null, 2));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      actor_id: parseInt(actorId),
      good: actorsData[actorIndex].good
    }));
  } catch (error) {
    console.error('Error toggling good status:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to toggle good status' }));
  }
}

/**
 * POST /api/actors/:actorId/mark-good
 * Mark actor model as good (set to true, not toggle)
 */
export function handleMarkGood(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    // Load actorsData
    const actorsDataPath = path.join(projectRoot, 'data', 'actorsData.json');
    const actorsData = JSON.parse(fs.readFileSync(actorsDataPath, 'utf-8'));
    const actorIndex = actorsData.findIndex((a: any) => a.id === parseInt(actorId));

    if (actorIndex === -1) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Set the 'good' flag to true
    actorsData[actorIndex].good = true;

    // Save back to file
    fs.writeFileSync(actorsDataPath, JSON.stringify(actorsData, null, 2));

    console.log(`[Actors] Marked actor ${actorId} as good`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      actor_id: parseInt(actorId),
      good: true
    }));
  } catch (error) {
    console.error('Error marking actor as good:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to mark actor as good' }));
  }
}

/**
 * GET /api/actors/:actorId/prompt-usage
 * Returns prompt usage statistics from metadata
 */
export function handleGetPromptUsage(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    const actor = loadActorById(actorId, projectRoot);

    if (!actor) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Load prompt metadata
    const metadataPath = path.join(projectRoot, 'data', 'actors', actor.name, 'training_data', 'prompt_metadata.json');
    
    let promptUsage: Record<string, number> = {};
    
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      
      // Count usage per prompt
      Object.values(metadata.images || {}).forEach((img: any) => {
        const prompt = img.prompt;
        if (prompt) {
          promptUsage[prompt] = (promptUsage[prompt] || 0) + 1;
        }
      });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      actor_id: actor.id,
      actor_name: actor.name,
      prompt_usage: promptUsage
    }));
  } catch (error) {
    console.error('Error loading prompt usage:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load prompt usage', details: (error as Error).message }));
  }
}

/**
 * GET /api/actors/:actorId/training-prompts
 * Returns available training prompts for the actor
 */
export function handleGetPresetTrainingPrompts(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    const actor = loadActorById(actorId, projectRoot);

    if (!actor) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Actor not found' }));
      return;
    }

    // Get prompts from Python module
    const actorType = actor.type?.toLowerCase() || 'human';
    const actorSex = actor.sex?.toLowerCase();
    
    // Call Python function to get training prompts
    const pythonScript = path.join(projectRoot, 'src', 'get_training_prompts.py');
    
    let promptsJson: string;
    try {
      promptsJson = execSync(
        `python3 "${pythonScript}" "${actorType}" "${actorSex || ''}"`,
        { encoding: 'utf-8', cwd: projectRoot }
      ).toString();
    } catch (error) {
      console.error('Error calling Python script:', error);
      throw new Error('Failed to load training prompts from Python');
    }
    
    const rawPrompts = JSON.parse(promptsJson);
    
    // Build full character description with outfit
    const sex = actor.sex?.toLowerCase();
    const genericDescriptor = sex === 'male' ? 'man' : sex === 'female' ? 'woman' : 'person';
    
    // Create full character description: "description, wearing outfit"
    let fullCharacterDescription = actor.description || genericDescriptor;
    if (actor.outfit) {
      fullCharacterDescription = `${fullCharacterDescription}, wearing ${actor.outfit}`;
    }
    
    // Convert Python prompts to frontend format with IDs and labels
    // Replace generic descriptor with full character description
    const prompts = rawPrompts.map((prompt: string, index: number) => {
      // Determine category based on index (15 photo + 11 bw + 9 color = 35 total)
      let category: string;
      let label: string;
      
      if (index < 15) {
        category = 'photorealistic';
        label = `Photo ${index + 1}`;
      } else if (index < 26) {
        category = 'bw_stylized';
        label = `B&W ${index - 14}`;
      } else {
        category = 'color_stylized';
        label = `Color ${index - 25}`;
      }
      
      // Extract a short label from the prompt
      const firstSentence = prompt.split('.')[0];
      const shortLabel = firstSentence.length > 40 
        ? firstSentence.substring(0, 37) + '...'
        : firstSentence;
      
      // For B&W prompts, strip color terms from the character description
      let descriptorToUse = fullCharacterDescription;
      if (category === 'bw_stylized') {
        // Call Python script to strip color terms from the descriptor
        try {
          const stripScript = path.join(projectRoot, 'src', 'strip_colors_cli.py');
          descriptorToUse = execSync(
            `python3 "${stripScript}" "${fullCharacterDescription}"`,
            { encoding: 'utf-8', cwd: projectRoot }
          ).toString().trim();
        } catch (error) {
          console.error('Error stripping colors from descriptor:', error);
          // Fall back to original descriptor if stripping fails
          descriptorToUse = fullCharacterDescription;
        }
      }
      
      // Replace generic descriptor patterns with character description
      // Handle patterns like "the man", "the woman", "the person", "The man", etc.
      const descriptorPattern = new RegExp(`\\b(the|The)\\s+(${genericDescriptor})\\b`, 'g');
      const customizedPrompt = prompt.replace(descriptorPattern, descriptorToUse);
      
      return {
        id: `prompt_${index}`,
        category,
        label: shortLabel,
        prompt: customizedPrompt
      };
    });
    
    // Calculate descriptor for response
    const descriptor = fullCharacterDescription;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      actor_id: actor.id,
      actor_name: actor.name,
      descriptor,
      prompts
    }));
  } catch (error) {
    console.error('Error loading training prompts:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load training prompts', details: (error as Error).message }));
  }
}

/**
 * GET /api/actors/:actorId/training-versions
 * Get training versions for an actor
 */
export function handleGetActorTrainingVersions(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  try {
    const versionsPath = getActorTrainingVersionsPath(actorId, projectRoot);
    
    if (!fs.existsSync(versionsPath)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ versions: [] }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ versions: data.versions || [] }));
  } catch (err: any) {
    console.error('[Actor Training Versions] Get error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load training versions' }));
  }
}

/**
 * POST /api/actors/:actorId/training-versions
 * Save training versions for an actor
 */
export function handleSaveActorTrainingVersions(
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { versions } = JSON.parse(body);
      const versionsPath = getActorTrainingVersionsPath(actorId, projectRoot);
      
      // Ensure directory exists
      const dir = path.dirname(versionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(versionsPath, JSON.stringify({ versions }, null, 2));
      
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true }));
    } catch (err: any) {
      console.error('[Actor Training Versions] Save error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to save training versions' }));
    }
  });
}
