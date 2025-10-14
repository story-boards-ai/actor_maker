# Training Version Management System

## Overview

The LoRA training tab now includes a comprehensive **version management system** that allows you to:
- 📝 Create multiple training configurations per style
- 💾 Save and load different parameter sets
- 🔄 Track multiple concurrent trainings
- 📊 Switch between training versions instantly
- 🎯 Resume training configurations from history

## Key Features

### 1. **Version Selector Dropdown**

A prominent dropdown at the top of the training configuration panel that shows:
- **Version name** (V1, V2, test_001, etc.)
- **Status indicator** (✅ completed, 🔄 training, ❌ failed, ⏳ pending)
- **Quick stats** (image count, steps, description)
- **Status badge** with color coding

### 2. **NEW Button**

Orange "NEW" button next to the version selector that:
- Clears current configuration
- Resets to default parameters
- Allows starting a fresh training setup
- Keeps trigger token for the style

### 3. **Automatic Configuration Loading**

When you select a version, the system automatically loads:
- ✅ **Training parameters** (network_dim, learning_rate, steps, etc.)
- ✅ **Dataset selection** (selection set ID)
- ✅ **Description** (training notes)
- ✅ **Training status** (if still in progress)

### 4. **Persistent State**

All version selections are saved to localStorage:
- Survives page refreshes
- Survives browser restarts
- Per-style isolation (each style has its own version history)

## User Workflow

### **Creating Multiple Training Configurations:**

```
1. Select Style → "Dynamic Simplicity"
2. Click "NEW" button
3. Configure parameters:
   - Select dataset (Set 1)
   - Set learning rate: 0.0001
   - Set steps: 1200
   - Description: "Test with low LR"
4. Start Training → Creates "V1"

5. Click "NEW" button again
6. Configure different parameters:
   - Select dataset (Set 2)
   - Set learning rate: 0.0004
   - Set steps: 800
   - Description: "Test with high LR"
7. Start Training → Creates "V2"

8. Both trainings can run simultaneously on RunPod!
```

### **Loading Previous Configurations:**

```
1. Open version dropdown
2. See all past configurations:
   ✅ V1 - 100 images • 1200 steps • "Test with low LR"
   🔄 V2 - 50 images • 800 steps • "Test with high LR"
   ❌ V3 - 75 images • 1000 steps • "Failed experiment"
3. Click on V1
4. All V1 parameters automatically loaded
5. Can modify and start new training based on V1
```

### **Resuming Active Training:**

```
1. Computer went to sleep during V2 training
2. Wake up computer
3. Open training tab
4. Select V2 from dropdown
5. V2's training status automatically restored
6. Click "Check Status" to recover progress
7. Training completes successfully
```

## Parallel Training Support

### **Yes, You Can Run Multiple Trainings Simultaneously!**

Each training version is **independent**:
- ✅ Different job IDs on RunPod
- ✅ Different parameter configurations
- ✅ Different datasets
- ✅ Different webhook callbacks
- ✅ Tracked separately in UI

**Example Parallel Training Scenario:**
```
Style: Dynamic Simplicity

V1 (Training): 
- Dataset: Set 1 (100 images)
- LR: 0.0001
- Steps: 2000
- Status: 🔄 Training (15 min remaining)

V2 (Training):
- Dataset: Set 2 (50 images)
- LR: 0.0004
- Steps: 800
- Status: 🔄 Training (8 min remaining)

V3 (Completed):
- Dataset: Set 1 (100 images)
- LR: 0.0002
- Steps: 1500
- Status: ✅ Completed
- Model: https://s3.../style_16_vV3.safetensors
```

## Version Selector UI

### **Dropdown Display:**
```
┌─────────────────────────────────────────────────────┐
│ Training Configuration              [+ NEW]         │
├─────────────────────────────────────────────────────┤
│ ✅ V1                                    COMPLETED  │
│ 100 images • 2000 steps • Test with low LR         │
└─────────────────────────────────────────────────────┘
                    ▼
```

### **Expanded Dropdown:**
```
┌─────────────────────────────────────────────────────┐
│ ✅ V1                                    COMPLETED  │
│ 10/12/2025 • 100 images • 2000 steps               │
│ Test with low LR                                    │
├─────────────────────────────────────────────────────┤
│ 🔄 V2                                    TRAINING   │
│ 10/13/2025 • 50 images • 800 steps                 │
│ Test with high LR                                   │
├─────────────────────────────────────────────────────┤
│ ❌ V3                                    FAILED     │
│ 10/11/2025 • 75 images • 1000 steps                │
│ Failed experiment                                   │
└─────────────────────────────────────────────────────┘
```

### **Version Details Panel:**
```
┌─────────────────────────────────────────────────────┐
│ Created: 10/12/2025, 7:27:21 AM                    │
│ Completed: 10/12/2025, 7:57:25 AM                  │
│                                                     │
│ ✅ Model URL:                                       │
│ https://s3.../style_16_vV1.safetensors             │
└─────────────────────────────────────────────────────┘
```

## Status Indicators

### **Visual Status System:**

| Icon | Status | Color | Meaning |
|------|--------|-------|---------|
| ✅ | COMPLETED | Green | Training finished successfully |
| 🔄 | TRAINING | Orange | Currently training on RunPod |
| ⏳ | PENDING | Blue | Queued, waiting to start |
| ❌ | FAILED | Red | Training failed or aborted |
| 📝 | DRAFT | Gray | Configuration saved, not started |

## Technical Implementation

### **Data Structure:**

Each version is stored in `training_versions.json`:
```json
{
  "versions": [
    {
      "id": "job-id-from-runpod",
      "name": "V1",
      "timestamp": "2025-10-12T07:27:21.532Z",
      "parameters": {
        "network_dim": 16,
        "network_alpha": 16,
        "learning_rate": 0.0001,
        "max_train_steps": 2000,
        "lr_scheduler": "cosine_with_restarts",
        "lr_warmup_steps": 0,
        "optimizer_type": "adamw8bit",
        "batch_size": 2,
        "num_repeats": 10,
        "gradient_dtype": "bf16",
        "save_every_n_steps": 500,
        "class_tokens": "style SBai_style_16"
      },
      "status": "completed",
      "loraUrl": "https://s3.../model.safetensors",
      "completedAt": "2025-10-12T07:57:25.000Z",
      "selectionSetId": 2,
      "imageCount": 100,
      "description": "Test with low learning rate"
    }
  ]
}
```

### **State Management:**

**useTrainingState.ts:**
- `selectedVersionId` - Currently selected version
- Persisted to localStorage per style
- Automatically loads version configuration on selection

**Version Loading Logic:**
```typescript
useEffect(() => {
  if (selectedVersionId && versions.length > 0) {
    const version = versions.find(v => v.id === selectedVersionId);
    if (version) {
      // Load all parameters from version
      setParameters(version.parameters);
      setSelectedSetId(version.selectionSetId);
      setDescription(version.description);
      
      // Restore active training if applicable
      if (version.status === 'training') {
        setCurrentTraining(restoredTraining);
      }
    }
  }
}, [selectedVersionId, versions]);
```

## Benefits

### **1. Experimentation**
- Try different learning rates side-by-side
- Test various dataset sizes
- Compare different parameter combinations
- Keep successful configurations for reuse

### **2. Organization**
- Clear history of all training attempts
- Easy to identify what worked
- Notes/descriptions for each version
- Status tracking for all trainings

### **3. Efficiency**
- No need to remember parameters
- Quick switching between configurations
- Parallel training support
- Resume interrupted trainings

### **4. Safety**
- Never lose training configurations
- All versions preserved in JSON
- Easy rollback to previous settings
- Clear audit trail

## Use Cases

### **Use Case 1: A/B Testing**
```
Goal: Find optimal learning rate

V1: LR 0.0001, 2000 steps → Start training
V2: LR 0.0004, 2000 steps → Start training (parallel)
V3: LR 0.0002, 2000 steps → Start training (parallel)

Wait for all to complete, compare results
Select best version, use those parameters for production
```

### **Use Case 2: Iterative Refinement**
```
V1: Initial test with 50 images → Completed
V2: Same params, 100 images → Completed (better)
V3: V2 params + higher LR → Failed (overfit)
V4: V2 params + more steps → Completed (best!)

Keep V4 as production model
```

### **Use Case 3: Dataset Comparison**
```
V1: Set 1 (curated, 30 images) → Completed
V2: Set 2 (full dataset, 100 images) → Completed
V3: Set 3 (best of both, 50 images) → Training

Compare quality, choose best dataset
```

### **Use Case 4: Recovery After Sleep**
```
V1: Started training before bed
Computer went to sleep overnight
Wake up, select V1 from dropdown
Click "Check Status"
Training completed while sleeping! ✅
```

## Best Practices

### **Naming Conventions:**
- **V1, V2, V3...** - Production versions
- **test_001, test_002...** - Experimental tests
- **lr_0001, lr_0004...** - Parameter-specific tests
- **curated_v1, full_v1...** - Dataset-specific versions

### **Descriptions:**
- Always add meaningful descriptions
- Note what you're testing
- Include any special considerations
- Makes history more useful

### **Version Management:**
- Keep successful versions
- Delete failed experiments periodically
- Document production versions clearly
- Use consistent naming schemes

## Limitations

### **RunPod Job Status:**
- Status available for 24-48 hours
- After that, check RunPod dashboard manually
- Model files persist in S3 indefinitely

### **Concurrent Trainings:**
- Limited by RunPod account capacity
- Each training uses RunPod credits
- Monitor RunPod dashboard for active jobs

### **localStorage:**
- Version selection stored locally
- Doesn't sync across devices
- Clear browser data = lose selections (but versions.json preserved)

## Summary

The version management system transforms the training tab from a single-configuration tool into a **powerful training laboratory** where you can:

✅ **Experiment freely** with multiple configurations  
✅ **Run parallel trainings** to compare results  
✅ **Resume any training** from history  
✅ **Track all attempts** with clear status indicators  
✅ **Never lose configurations** with persistent storage  
✅ **Organize experiments** with names and descriptions  

This makes the training process more efficient, organized, and reliable!
