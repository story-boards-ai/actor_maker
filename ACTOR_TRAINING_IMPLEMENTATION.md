# Actor Training Tab Implementation

## Overview
Converted the legacy style training tab to work with actor training. The new implementation allows selecting actors, configuring training parameters, and sending training requests to RunPod serverless containers with full S3 URLs.

## Key Changes

### 1. **Actor Selection Instead of Styles**
- Created `ActorSelectorModal` component with search and filtering
- Displays actor poster frames, metadata (age, sex, ethnicity)
- Shows training data count and sync status
- Filters by sex and ethnicity

### 2. **Training Data Handling**
- Uses actor's `training_data.s3_urls` array directly
- No need for selection sets - all training images are included
- Displays training data count and S3 sync status
- Auto-adjusts parameters based on image count

### 3. **Training Request Structure**
```typescript
{
  input: {
    workflow: <customized_workflow>,
    training_data: {
      s3_urls: actor.training_data.s3_urls  // Full S3 URLs
    },
    training_config: {
      mode: "custom-actors",
      user_id: "actor_maker_user",
      tenant_id: "actor_maker",
      request_id: `${actorId}_${timestamp}`,
      model_name: `actor_${actorId}_v${version}`,
      learning_rate: parameters.learning_rate,
      max_train_steps: parameters.max_train_steps,
    }
  },
  webhook: `${ngrokUrl}/api/training-webhook`
}
```

### 4. **Actor-Specific Parameters**
Default parameters optimized for face/identity training:
- `max_train_steps: 2000` (higher for identity preservation)
- `learning_rate: 0.0004` (higher for identity learning)
- `network_dim: 8` (focused capacity)
- `network_alpha: 8`
- `num_repeats: 10`
- `flip_aug: false` (preserve facial features)

### 5. **Components Created**

#### Main Component
- `/ui/src/components/ActorTraining/ActorTrainingTab.tsx`
- `/ui/src/components/ActorTraining/ActorTrainingTab.css`

#### Actor Selector
- `/ui/src/components/ActorTraining/components/ActorSelectorModal.tsx`
- `/ui/src/components/ActorTraining/components/ActorSelectorModal.css`

#### Hooks
- `/ui/src/components/ActorTraining/hooks/useTrainingState.ts`
- `/ui/src/components/ActorTraining/hooks/useTrainingOperations.ts` (needs creation)
- `/ui/src/components/ActorTraining/hooks/useDataLoading.ts` (needs creation)

#### Utils
- `/ui/src/components/ActorTraining/utils/storage.ts` (needs creation)
- `/ui/src/components/ActorTraining/utils/calculations.ts` (needs creation)

#### Shared Components (reuse from LoRATraining)
- `NgrokPanel`
- `ConsolePanel`
- `SleepWarningBanner`

#### New Components (need creation)
- `ParametersForm` - Actor-specific parameter form
- `VersionSelector` - Version history selector
- `VersionsPanel` - Training history panel
- `TrainingGuidelinesModal` - Actor training guidelines

## Backend API Routes Needed

### Actor-Specific Routes
```typescript
// Get training versions for an actor
GET /api/actors/:actorId/training-versions

// Save training versions for an actor
POST /api/actors/:actorId/training-versions

// Mark version as good
POST /api/actors/:actorId/mark-good

// Get actor training data info
GET /api/actors/:actorId/training-data
```

### Existing Routes (reuse)
- `POST /api/training/start` - Start training job
- `POST /api/training/status` - Check training status
- `POST /api/training-webhook` - Training webhook callback
- `GET /api/ngrok/status` - Ngrok status
- `POST /api/ngrok/start` - Start ngrok
- `POST /api/ngrok/stop` - Stop ngrok

## Training Data Structure

### Actor Training Data
```typescript
{
  training_data: {
    s3_urls: [
      "s3://bucket/actors/0000_european_16_male/training_data/image_1.png",
      "s3://bucket/actors/0000_european_16_male/training_data/image_2.png",
      // ... all training images
    ],
    local_path: "data/actors/0000_european_16_male/training_data",
    base_image_path: "data/actors/0000_european_16_male/base_image",
    count: 15,
    synced: true
  }
}
```

## Integration Steps

### 1. **Add Actor Training Tab to Main App**
```typescript
// In main App.tsx or routing
import { ActorTrainingTab } from './components/ActorTraining/ActorTrainingTab';

// Add to tab navigation
<Tab value="actor-training">
  <ActorTrainingTab />
</Tab>
```

### 2. **Create Backend API Routes**
Add routes in `/ui/config/routes/training-api.ts`:
```typescript
// Actor training versions
if (url?.startsWith('/api/actors/') && url.includes('/training-versions')) {
  const match = url.match(/\/api\/actors\/([^/]+)\/training-versions/);
  if (match) {
    if (req.method === 'GET') {
      handleGetActorTrainingVersions(req, res, projectRoot, match[1]);
    } else if (req.method === 'POST') {
      handleSaveActorTrainingVersions(req, res, projectRoot, match[1]);
    }
    return;
  }
}

// Mark actor version as good
if (url?.startsWith('/api/actors/') && url.includes('/mark-good')) {
  const match = url.match(/\/api\/actors\/([^/]+)\/mark-good/);
  if (match) {
    handleMarkActorVersionAsGood(req, res, projectRoot, match[1]);
    return;
  }
}
```

### 3. **Create Remaining Components**
Need to create:
- `ParametersForm` - Copy from LoRATraining and adjust for actors
- `VersionSelector` - Copy from LoRATraining
- `VersionsPanel` - Copy from LoRATraining and adjust for actors
- `TrainingGuidelinesModal` - Actor-specific training guidelines
- `useTrainingOperations` hook - Adjust for actor training data
- `useDataLoading` hook - Load actor training versions
- Storage utils - Save/load actor training state
- Calculations utils - Actor-specific calculations

### 4. **Update actors.json Structure**
Ensure each actor has:
```json
{
  "id": 0,
  "name": "0000_european_16_male",
  "training_data": {
    "s3_urls": ["s3://...", "s3://..."],
    "local_path": "data/actors/0000_european_16_male/training_data",
    "count": 15,
    "synced": true
  }
}
```

### 5. **Create Training Versions Storage**
Store training versions at:
```
data/actor_training_versions/0000.json
data/actor_training_versions/0001.json
...
```

## Testing Checklist

- [ ] Actor selector modal opens and displays all actors
- [ ] Search and filters work correctly
- [ ] Actor selection updates trigger token
- [ ] Training data info displays correctly
- [ ] Parameters can be adjusted
- [ ] Auto-adjust calculates correct values
- [ ] Ngrok can start/stop
- [ ] Training request sends correct S3 URLs
- [ ] Console logs display properly
- [ ] Training status polling works
- [ ] Webhook updates training status
- [ ] Version history saves and loads
- [ ] Mark as good updates actor registry

## Next Steps

1. **Create remaining component files** (ParametersForm, VersionSelector, etc.)
2. **Implement backend API routes** for actor training versions
3. **Add S3 URL generation** to actors.json (if not already present)
4. **Test training flow** end-to-end with RunPod
5. **Add validation** for training data availability
6. **Implement webhook handling** for actor training completion
7. **Update actors registry** when marking versions as good

## Notes

- **Reuses existing infrastructure**: Ngrok, RunPod API, webhook handling
- **Actor-specific optimizations**: Higher steps, different learning rate
- **No selection sets needed**: All training images included automatically
- **Direct S3 URL usage**: No manifest lookup required
- **Simplified workflow**: Fewer steps than style training
