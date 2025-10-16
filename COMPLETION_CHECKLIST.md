# Actor Training Tab - Completion Checklist

## ✅ Already Completed

- [x] Main ActorTrainingTab component
- [x] ActorSelectorModal with search/filters
- [x] useTrainingState hook
- [x] useTrainingOperations hook
- [x] useDataLoading hook
- [x] Storage utilities (localStorage)
- [x] Calculation utilities (auto-adjust, estimates)
- [x] TypeScript types and interfaces
- [x] Complete CSS styling
- [x] Documentation (3 comprehensive guides)

## 📋 Remaining Tasks

### 1. Copy Shared Components (5 minutes)

```bash
# From your terminal in the actor_maker/ui directory:

# Copy ParametersForm
cp src/components/LoRATraining/components/ParametersForm.tsx \
   src/components/ActorTraining/components/

# Copy VersionSelector
cp src/components/LoRATraining/components/VersionSelector.tsx \
   src/components/ActorTraining/components/

# Copy VersionsPanel
cp src/components/LoRATraining/components/VersionsPanel.tsx \
   src/components/ActorTraining/components/

# Copy TrainingGuidelinesModal
cp src/components/LoRATraining/components/TrainingGuidelinesModal.tsx \
   src/components/ActorTraining/components/
```

**Minor Adjustments Needed:**

In `VersionsPanel.tsx`, change:
```typescript
// Line ~10-15, change prop name:
interface VersionsPanelProps {
  versions: TrainingVersion[];
  onCheckStatus: (jobId: string) => void;
  onMarkAsGood: (versionId: string) => void;
  actorId?: string;  // ← Change from 'styleId'
}
```

### 2. Add Backend API Routes (15 minutes)

Open `/ui/config/routes/training-api.ts` and add these routes after the existing style routes:

```typescript
// Add after line ~96 (after style routes):

// ============================================
// ACTOR TRAINING ROUTES
// ============================================

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

Then add the handler functions at the end of the file (before the final closing brace):

```typescript
// Add before the final closing brace:

// ============================================
// ACTOR TRAINING HANDLERS
// ============================================

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
    console.error('[Actor Training] Get versions error:', err);
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
      console.error('[Actor Training] Save versions error:', err);
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

      versions.forEach((v: any) => {
        v.isGood = v.id === versionId;
      });

      fs.writeFileSync(versionsPath, JSON.stringify({ versions }, null, 2));

      // Update actors.json
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

### 3. Create actors.json Endpoint (5 minutes)

If not already present, add to your API routes:

```typescript
// Add to your main API router:
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

### 4. Update actors.json Structure (10 minutes)

Create a script to add training data to actors.json:

```typescript
// scripts/add_training_data_to_actors.ts
import * as fs from 'fs';
import * as path from 'path';

const actorsPath = path.join(__dirname, '../data/actors.json');
const actors = JSON.parse(fs.readFileSync(actorsPath, 'utf-8'));

actors.forEach((actor: any) => {
  const actorDir = path.join(__dirname, '../data/actors', actor.name);
  const trainingDataDir = path.join(actorDir, 'training_data');
  
  if (fs.existsSync(trainingDataDir)) {
    const files = fs.readdirSync(trainingDataDir)
      .filter(f => f.match(/\.(png|jpg|jpeg)$/i));
    
    const s3Urls = files.map(f => 
      `s3://your-bucket/actors/${actor.name}/training_data/${f}`
    );
    
    actor.training_data = {
      s3_urls: s3Urls,
      local_path: `data/actors/${actor.name}/training_data`,
      count: files.length,
      synced: false  // Set to true after uploading to S3
    };
  }
});

fs.writeFileSync(actorsPath, JSON.stringify(actors, null, 2));
console.log('✅ Updated actors.json with training data');
```

### 5. Add to Main App (2 minutes)

In your main app component (e.g., `App.tsx` or tab navigation):

```typescript
import { ActorTrainingTab } from './components/ActorTraining';

// Add to your tabs:
<Tabs>
  <Tab value="actors">Actors</Tab>
  <Tab value="styles">Styles</Tab>
  <Tab value="actor-training">Actor Training</Tab>  {/* ← Add this */}
</Tabs>

<TabPanel value="actor-training">
  <ActorTrainingTab />
</TabPanel>
```

### 6. Test Basic Functionality (15 minutes)

- [ ] Start dev server: `npm run dev`
- [ ] Navigate to Actor Training tab
- [ ] Click "Select an Actor" - modal opens
- [ ] Search for an actor - results filter
- [ ] Select an actor - UI updates
- [ ] Check training data info displays
- [ ] Try auto-adjust parameters
- [ ] Start ngrok
- [ ] Check console logs appear

### 7. Test Training Flow (30 minutes)

- [ ] Select actor with training data
- [ ] Configure parameters
- [ ] Start ngrok tunnel
- [ ] Click "Start Training"
- [ ] Verify request sent to RunPod
- [ ] Check console logs update
- [ ] Monitor status polling
- [ ] Wait for webhook (or test manually)
- [ ] Verify status updates to completed
- [ ] Check LoRA URL is saved
- [ ] Mark version as good
- [ ] Verify actors.json updated

## 🔧 Optional Enhancements

### Add Progress Indicators
- [ ] Show download progress
- [ ] Show training progress bar
- [ ] Show upload progress

### Add Validation
- [ ] Validate S3 URLs exist
- [ ] Check training data quality
- [ ] Warn about small datasets

### Add Analytics
- [ ] Track training duration
- [ ] Compare parameter effectiveness
- [ ] Show success rate

### Add Model Testing
- [ ] Generate test images
- [ ] Compare with base model
- [ ] Quality assessment

## 📝 Final Verification

Before marking complete:
- [ ] All TypeScript errors resolved
- [ ] All components render correctly
- [ ] Training request succeeds
- [ ] Webhook updates work
- [ ] Version history saves
- [ ] Mark as good updates registry
- [ ] Console logs are clear
- [ ] Error handling works

## 🎉 Success Criteria

You'll know it's working when:
1. ✅ Actor selector shows all actors with poster frames
2. ✅ Training data info displays correctly
3. ✅ Parameters can be adjusted and saved
4. ✅ Training request sends successfully to RunPod
5. ✅ Console shows real-time logs
6. ✅ Status updates automatically
7. ✅ Webhook notifies completion
8. ✅ LoRA URL is saved and accessible
9. ✅ Mark as good updates actors.json
10. ✅ Training history persists across sessions

## 📚 Reference Documents

- **ACTOR_TRAINING_IMPLEMENTATION.md** - Technical details
- **ACTOR_TRAINING_QUICK_START.md** - Setup guide
- **ACTOR_TRAINING_FLOW.md** - Visual flow diagram
- **IMPLEMENTATION_SUMMARY.md** - Overview

## 🆘 Troubleshooting

**Issue: Components not found**
→ Check import paths are correct
→ Verify files were copied to right location

**Issue: API routes not working**
→ Check routes are registered in training-api.ts
→ Verify URL patterns match exactly

**Issue: Training data not showing**
→ Check actors.json has training_data field
→ Verify s3_urls array is populated

**Issue: Training fails to start**
→ Check ngrok is running
→ Verify RunPod API key is set
→ Check console for detailed errors

**Issue: Webhook not updating**
→ Verify ngrok URL is accessible
→ Check webhook endpoint is registered
→ Look for webhook logs in console

## ✨ You're Done When...

All checkboxes above are checked and you can successfully:
1. Select an actor
2. Configure training parameters
3. Start a training job
4. Monitor progress in console
5. Receive webhook notification
6. Mark a version as good
7. See the validated model in actors.json

Good luck! 🚀
