# Actor Training Tab - Quick Start Guide

## What's Been Created

✅ **Main Component**: `ActorTrainingTab.tsx` - Complete actor training interface  
✅ **Actor Selector**: Modal for selecting actors with search/filters  
✅ **Training State Hook**: Manages all training state  
✅ **Training Operations Hook**: Handles training requests and status  
✅ **Data Loading Hook**: Loads training versions  
✅ **Storage Utils**: Save/load training parameters  
✅ **Calculation Utils**: Auto-adjust parameters, estimate duration  
✅ **Styling**: Complete CSS for all components  

## What Still Needs to Be Done

### 1. Copy Shared Components from LoRATraining

These components can be reused as-is:

```bash
# Copy these files:
cp ui/src/components/LoRATraining/components/ParametersForm.tsx \
   ui/src/components/ActorTraining/components/

cp ui/src/components/LoRATraining/components/VersionSelector.tsx \
   ui/src/components/ActorTraining/components/

cp ui/src/components/LoRATraining/components/VersionsPanel.tsx \
   ui/src/components/ActorTraining/components/

cp ui/src/components/LoRATraining/components/TrainingGuidelinesModal.tsx \
   ui/src/components/ActorTraining/components/
```

### 2. Minor Adjustments to Copied Components

**ParametersForm.tsx**: Already actor-optimized, no changes needed

**VersionSelector.tsx**: No changes needed

**VersionsPanel.tsx**: Change prop from `styleId` to `actorId`:
```typescript
// Change this line:
interface VersionsPanelProps {
  actorId?: string;  // was: styleId
  // ... rest stays same
}
```

**TrainingGuidelinesModal.tsx**: Update content for actor training:
```typescript
// Update the guidelines text to focus on:
// - Face/identity preservation
// - Importance of diverse poses
// - Consistent lighting
// - No flip augmentation for faces
```

### 3. Add Backend API Routes

Add to `/ui/config/routes/training-api.ts`:

```typescript
// Get training versions for an actor
if (url?.startsWith('/api/actors/') && url.includes('/training-versions') && req.method === 'GET') {
  const match = url.match(/\/api\/actors\/([^/]+)\/training-versions/);
  if (match) {
    handleGetActorTrainingVersions(req, res, projectRoot, match[1]);
    return;
  }
}

// Save training versions for an actor
if (url?.startsWith('/api/actors/') && url.includes('/training-versions') && req.method === 'POST') {
  const match = url.match(/\/api\/actors\/([^/]+)\/training-versions/);
  if (match) {
    handleSaveActorTrainingVersions(req, res, projectRoot, match[1]);
    return;
  }
}

// Mark actor version as good
if (url?.startsWith('/api/actors/') && url.includes('/mark-good') && req.method === 'POST') {
  const match = url.match(/\/api\/actors\/([^/]+)\/mark-good/);
  if (match) {
    handleMarkActorVersionAsGood(req, res, projectRoot, match[1]);
    return;
  }
}
```

### 4. Implement Backend Handler Functions

Add these functions to `/ui/config/routes/training-api.ts`:

```typescript
function handleGetActorTrainingVersions(req: IncomingMessage, res: ServerResponse, projectRoot: string, actorId: string) {
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

function handleSaveActorTrainingVersions(req: IncomingMessage, res: ServerResponse, projectRoot: string, actorId: string) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      const { versions } = JSON.parse(body);
      const versionsPath = getActorTrainingVersionsPath(actorId, projectRoot);
      
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

function handleMarkActorVersionAsGood(req: IncomingMessage, res: ServerResponse, projectRoot: string, actorId: string) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      const { versionId } = JSON.parse(body);
      
      if (!versionId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing versionId' }));
        return;
      }

      // Load training versions
      const versionsPath = getActorTrainingVersionsPath(actorId, projectRoot);
      
      if (!fs.existsSync(versionsPath)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Training versions not found' }));
        return;
      }

      const data = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));
      const versions = data.versions || [];
      
      const targetVersion = versions.find((v: any) => v.id === versionId);
      
      if (!targetVersion) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Version not found' }));
        return;
      }

      // Mark only this version as good
      versions.forEach((v: any) => {
        v.isGood = v.id === versionId;
      });

      fs.writeFileSync(versionsPath, JSON.stringify({ versions }, null, 2));

      // Update actors.json with validated model
      const actorsPath = path.join(projectRoot, 'data', 'actors.json');
      
      if (fs.existsSync(actorsPath)) {
        const actorsData = JSON.parse(fs.readFileSync(actorsPath, 'utf-8'));
        const actor = actorsData.find((a: any) => a.id.toString() === actorId);
        
        if (actor) {
          actor.validated_lora_model = {
            version_id: targetVersion.id,
            version_name: targetVersion.name,
            lora_url: targetVersion.loraUrl || null,
            marked_at: new Date().toISOString(),
            parameters: targetVersion.parameters,
          };
          
          fs.writeFileSync(actorsPath, JSON.stringify(actorsData, null, 2));
          console.log(`[Actor Training] ✅ Marked version ${versionId} as good for actor ${actorId}`);
        }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, versions }));
    } catch (err: any) {
      console.error('[Actor Training] Mark as good error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to mark version as good' }));
    }
  });
}

function getActorTrainingVersionsPath(actorId: string, projectRoot: string): string {
  const versionsDir = path.join(projectRoot, 'data', 'actor_training_versions');
  if (!fs.existsSync(versionsDir)) {
    fs.mkdirSync(versionsDir, { recursive: true });
  }
  return path.join(versionsDir, `${actorId}.json`);
}
```

### 5. Update actors.json Structure

Ensure each actor has training data info:

```json
{
  "id": 0,
  "name": "0000_european_16_male",
  "training_data": {
    "s3_urls": [
      "s3://bucket/actors/0000_european_16_male/training_data/image_1.png",
      "s3://bucket/actors/0000_european_16_male/training_data/image_2.png"
    ],
    "local_path": "data/actors/0000_european_16_male/training_data",
    "count": 15,
    "synced": true
  }
}
```

### 6. Add to Main App

In your main app component or tab navigation:

```typescript
import { ActorTrainingTab } from './components/ActorTraining/ActorTrainingTab';

// Add to your tabs:
<Tab value="actor-training">
  <ActorTrainingTab />
</Tab>
```

### 7. Create actors.json Endpoint

If not already available, add:

```typescript
// In your API routes
if (url === '/actors.json' && req.method === 'GET') {
  const actorsPath = path.join(projectRoot, 'data', 'actors.json');
  if (fs.existsSync(actorsPath)) {
    const actors = JSON.parse(fs.readFileSync(actorsPath, 'utf-8'));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(actors));
  } else {
    res.statusCode = 404;
    res.end('Actors not found');
  }
  return;
}
```

## Testing the Implementation

1. **Start the dev server**: `npm run dev`
2. **Navigate to Actor Training tab**
3. **Click "Select an Actor"** - modal should open
4. **Search/filter actors** - should work smoothly
5. **Select an actor** - should show training data info
6. **Start ngrok** - should connect successfully
7. **Click "Auto-Adjust Parameters"** - should calculate based on image count
8. **Start Training** - should send request to RunPod
9. **Check Console** - should show logs
10. **Check Status** - should poll RunPod
11. **Wait for webhook** - should update status when complete
12. **Mark as Good** - should update actors.json

## Key Differences from Style Training

- **No selection sets** - All training images included automatically
- **Direct S3 URLs** - Uses `actor.training_data.s3_urls` array
- **Actor-specific parameters** - Higher steps, different learning rate
- **Simpler validation** - Just check if `synced: true`
- **Actor registry** - Updates `actors.json` instead of `styles_registry.json`

## Troubleshooting

**"No training data available"**
- Check that actor has `training_data` object in actors.json
- Verify `synced: true`
- Ensure `s3_urls` array is populated

**"Failed to load training versions"**
- Check that `data/actor_training_versions/` directory exists
- Verify API routes are registered correctly

**Training request fails**
- Check ngrok is running
- Verify RunPod API key is set
- Check console logs for detailed error

**Webhook not updating**
- Verify ngrok URL is accessible
- Check webhook endpoint is registered
- Look for webhook logs in console

## Next Steps

Once basic training works:
1. Add progress indicators for training stages
2. Implement training data validation
3. Add model preview/testing
4. Create training analytics dashboard
5. Add batch training for multiple actors
