# LoRA Training System - Complete Implementation

## 📋 Overview

This document describes the complete LoRA training system integration for ActorMaker, connecting your UI to the RunPod training container for Flux LoRA model training.

## 🏗️ System Architecture

```
ActorMaker UI → Training API → RunPod Serverless → Training Container → S3 Storage
                       ↑                                    ↓
                       └────────── Webhook Callback ───────┘
```

## 🔧 Components Created

### 1. Frontend Components

**`LoRATrainingTab.tsx`** - Main training interface
- Training dataset selection (from S3 selection sets)
- Hyperparameter configuration UI
- Ngrok tunnel management
- Training version history
- Real-time status tracking

**`LoRATrainingTab.css`** - Complete styling
- Dark theme matching ActorMaker aesthetic
- Responsive grid layout
- Status indicators and badges
- Professional parameter inputs

### 2. Backend API Routes

**`training-api.ts`** - Complete training workflow management
- **POST `/api/training/start`** - Submit training jobs to RunPod
- **POST `/api/training-webhook`** - Receive completion callbacks
- **GET `/api/styles/:id/training-versions`** - Fetch training history
- **POST `/api/styles/:id/training-versions`** - Save training versions
- **GET/POST `/api/ngrok/status|start|stop`** - Ngrok tunnel management

### 3. Integration Points

**Modified Files:**
- `server-plugin.ts` - Added training API middleware
- `App.tsx` - Added LoRA Training tab management
- `StyleCard.tsx` - Added "Train LoRA" button
- `StylesGrid.tsx` - Passed training callback

## 📦 Training Data Flow

### Selection Sets to S3 URLs

1. **User manages datasets in S3 Manager:**
   - Upload training images to S3
   - Create selection sets (groups of images)
   - Each set stored in: `resources/style_images/{styleId}_*/selection_sets.json`

2. **S3 URLs format:**
   ```
   s3://bucket/styles/{styleId}/image_001.jpg
   s3://bucket/styles/{styleId}/image_001.txt (caption file)
   ```

3. **Training request includes both:**
   - Image files (`.jpg`, `.png`, `.webp`)
   - Caption files (`.txt`) with trigger token

## 🔑 Required Environment Variables

Add to `/actor_maker/.env`:

```bash
# RunPod Training Configuration
MODEL_TRAINING_RUNPOD_ENDPOINT_ID=your_training_endpoint_id
MODEL_TRAINING_RUNPOD_API_KEY=your_runpod_api_key
# OR use shared key
RUNPOD_API_KEY=your_runpod_api_key

# S3 Configuration (for training data)
S3_USER_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_REGION=us-west-1

# Optional: Port for ngrok
PORT=5173
```

## 🚀 Usage Workflow

### Step 1: Prepare Training Data

1. **Go to Style Card** → Click "📦 Training Data"
2. **Upload images** to S3 (with caption files)
3. **Create Selection Set:**
   - Select images for training
   - Click "Save Current Selection as Set"
   - Set is saved (e.g., "Set 1", "Set 2")

### Step 2: Start Ngrok Tunnel

1. **Open LoRA Training Tab** (🔥 Train LoRA button)
2. **Click "Start Ngrok Tunnel"**
   - Creates public webhook URL
   - Required for training completion callbacks
3. **Verify tunnel is running** (green status indicator)

### Step 3: Configure Training

**Select Dataset:**
- Choose a selection set from dropdown
- System shows image count and recommended steps

**Set Version Name:**
- Name this training run (e.g., "v1.0", "test_001")

**Core Parameters:**
- **Network Dimension**: 16 (or 32 for complex styles)
- **Network Alpha**: 16 (same as dimension)
- **Learning Rate**: 0.0001 (safe) or 0.0004 (faster)
- **Max Training Steps**: Auto-calculated (40 steps × image count)
- **Trigger Token**: Unique identifier (e.g., `style_16`)

**Advanced Parameters** (optional):
- LR Scheduler: cosine_with_restarts (recommended)
- Optimizer: adamw8bit
- Batch Size: 2
- Gradient Dtype: bf16

### Step 4: Start Training

1. **Click "Start Training"**
2. **System automatically:**
   - Builds S3 URLs for selected images + captions
   - Constructs ComfyUI training workflow
   - Submits job to RunPod serverless
   - Creates local training version record

3. **Training proceeds:**
   - Status shows "pending" → "training"
   - RunPod container downloads data from S3
   - Trains Flux LoRA model
   - Uploads result to S3
   - Calls webhook with completion status

4. **On completion:**
   - Status updates to "completed" or "failed"
   - Download link appears for trained model
   - Can start new training version

## 📊 Training Versions System

**Storage Location:**
```
/resources/style_images/{styleId}_*/training_versions.json
```

**Version Data:**
```json
{
  "versions": [
    {
      "id": "style_16_1234567890",
      "name": "v1.0",
      "timestamp": "2025-01-15T10:30:00Z",
      "parameters": {
        "network_dim": 16,
        "network_alpha": 16,
        "learning_rate": 0.0001,
        "max_train_steps": 1200,
        "class_tokens": "style_16"
      },
      "status": "completed",
      "loraUrl": "https://s3.amazonaws.com/...",
      "selectionSetId": 1,
      "imageCount": 30
    }
  ]
}
```

## 🔄 RunPod Training Container Integration

### Request Format

```json
{
  "input": {
    "workflow": {
      "2": { "inputs": { "transformer": "flux1-dev-fp8.safetensors", ... }},
      "107": { "inputs": { 
        "network_dim": 16,
        "learning_rate": 0.0001,
        "max_train_steps": 1200,
        ...
      }},
      "109": { "inputs": { 
        "class_tokens": "style_16",
        "dataset_path": "/training_data",
        ...
      }}
    },
    "training_data": {
      "s3_urls": [
        "s3://bucket/styles/16/image_001.jpg",
        "s3://bucket/styles/16/image_001.txt",
        "s3://bucket/styles/16/image_002.jpg",
        "s3://bucket/styles/16/image_002.txt"
      ]
    },
    "training_config": {
      "mode": "custom-styles",
      "user_id": "actor_maker_user",
      "tenant_id": "actor_maker",
      "request_id": "16_1234567890",
      "model_name": "style_16_v1.0",
      "learning_rate": 0.0001,
      "max_train_steps": 1200
    }
  },
  "webhook": "https://abc123.ngrok.io/api/training-webhook"
}
```

### Webhook Response

**On Success:**
```json
{
  "status": "success",
  "job_id": "16_1234567890",
  "loraName": "style_16_v1.0.safetensors",
  "loraUrl": "https://s3-accelerate.amazonaws.com/bucket/path/model.safetensors",
  "model_info": {
    "size_bytes": 45678912,
    "model_type": "lora"
  }
}
```

**On Failure:**
```json
{
  "status": "failed",
  "job_id": "16_1234567890",
  "error": "Error message here"
}
```

## 🎯 Training Parameters Guide

### Image Count Guidelines

**From LORA_TRAINING_GUIDE.md:**

- **Small (8-15 images)**: High quality, very on-style
  - Steps: 500-1000
  - LR: 0.0001
  
- **Sweet Spot (20-30 images)**: ~40 steps per image
  - Steps: 800-1200
  - LR: 0.0001 or 0.0004

- **Larger (50-200 images)**: Risk of averaging
  - Steps: 2000-8000
  - LR: 0.0001

### Recommended Starting Values

```typescript
{
  network_dim: 16,        // or 32 for complex styles
  network_alpha: 16,      // same as network_dim
  learning_rate: 0.0001,  // safer than 0.0004
  max_train_steps: imageCount * 40,  // auto-calculated
  lr_scheduler: 'cosine_with_restarts',
  optimizer_type: 'adamw8bit',
  batch_size: 2,
  num_repeats: 10,
  gradient_dtype: 'bf16'
}
```

## 🐛 Troubleshooting

### Ngrok Issues

**Error: "Failed to start ngrok"**
```bash
# Install ngrok
brew install ngrok  # Mac
snap install ngrok  # Linux

# Or download from: https://ngrok.com/download
```

**Error: "Ngrok startup timeout"**
- Check port 5173 is not in use
- Verify ngrok is in PATH
- Try manual start: `ngrok http 5173`

### Training Issues

**Error: "No files were downloaded from S3"**
- Verify S3 credentials in .env
- Check S3 URLs format: `s3://bucket/key`
- Ensure both .jpg and .txt files exist

**Error: "Missing required training_config fields"**
- Verify all fields are present in request
- Check training-api.ts console logs

**Training stuck in "pending" status:**
- Check RunPod dashboard for job status
- Verify webhook URL is accessible (ngrok running)
- Check backend logs for webhook calls

### Version Updates Not Showing

**Webhook received but UI not updating:**
- Refresh the LoRA Training tab
- Check training_versions.json was updated
- Verify job_id matching between request and webhook

## 📝 Testing Checklist

1. ✅ **Environment Setup:**
   - [ ] All env variables set in `.env`
   - [ ] RunPod endpoint configured
   - [ ] S3 credentials working

2. ✅ **Data Preparation:**
   - [ ] Training images uploaded to S3
   - [ ] Caption files (.txt) created
   - [ ] Selection set created

3. ✅ **Ngrok Setup:**
   - [ ] Ngrok installed
   - [ ] Can start tunnel successfully
   - [ ] URL shows in UI

4. ✅ **Training Flow:**
   - [ ] Can select dataset
   - [ ] Parameters configurable
   - [ ] Training starts successfully
   - [ ] Version appears in history

5. ✅ **Webhook:**
   - [ ] Webhook receives completion
   - [ ] Status updates to completed
   - [ ] Download URL available

## 🎓 Best Practices

### Caption Files

**Format:** `Scene description, trigger_token`

**Example:**
```
a foggy mountain valley with pine trees, winding river, style_16
portrait of a girl on a swing under blossoming cherry trees, style_16
an ancient stone bridge over a creek in twilight, style_16
```

**Don't describe:**
- Style itself (e.g., "oil painting style")
- Color palette (e.g., "vibrant colors")
- Brush strokes or artistic technique

**Do describe:**
- Scene/subject/objects
- Lighting and mood
- Composition and pose
- Elements you want to control

### Training Iterations

1. **Start with test set (15-20 images):**
   - Steps: 600-800
   - LR: 0.0001
   - Save as "test_v1"

2. **Evaluate results:**
   - Check prompt following
   - Verify style strength
   - Test with various prompts

3. **Adjust and retrain:**
   - Increase/decrease steps
   - Try different LR
   - Modify selection set
   - Save as "test_v2", etc.

4. **Final production training:**
   - Best parameters identified
   - Full dataset (30-50 images)
   - Save as "v1.0"

## 📚 Related Documentation

- **LORA_TRAINING_GUIDE.md** - Comprehensive training theory and parameters
- **CAPTION_GUIDE.md** - Caption writing best practices
- **SELECTION_SETS.md** - Selection set management
- **S3_IMPLEMENTATION.md** - S3 integration details

## 🎉 Summary

You now have a complete LoRA training system that:

✅ **Integrates with RunPod** training container
✅ **Uses S3 selection sets** for flexible dataset management
✅ **Provides webhook callbacks** via ngrok
✅ **Tracks training versions** with full parameter history
✅ **Follows best practices** from training guide
✅ **Offers professional UI** with comprehensive controls
✅ **Handles errors gracefully** with clear messaging

**Next Steps:**
1. Set up environment variables
2. Install ngrok
3. Upload test dataset to S3
4. Create selection set
5. Run your first training!

Happy training! 🚀
