# Automated Actor Training Script

## Overview

The `auto_train_actors.py` script automates the LoRA training process for actors by leveraging all existing training infrastructure from the UI. It trains actors that have good training data but no validated custom models yet.

## Features

- **Smart Actor Selection**: Automatically finds actors ready for training
- **Reuses Existing Code**: Uses the same training logic as the UI (no duplicate code)
- **Ngrok Management**: Starts ngrok once and reuses it for all trainings
- **Sequential Training**: Trains up to 2 actors consecutively
- **Automatic Monitoring**: Polls training status until completion
- **Manifest Integration**: Successful models are saved to manifests via webhook
- **Optimal Parameters**: Calculates best training parameters based on image count

## Prerequisites

1. **Vite Dev Server Running**: The script communicates with the UI backend
   ```bash
   cd ui
   npm run dev
   ```

2. **Environment Variables**: Ensure `.env` file has:
   - `RUNPOD_API_KEY`: For RunPod serverless training
   - `AWS_ACCESS_KEY` / `AWS_ACCESS_SECRET`: For S3 access
   - `NGROK_AUTHTOKEN`: For webhook tunneling

3. **Training Data**: Actors must have:
   - Training data marked as "good" (`training_data_good = true`)
   - No custom model marked as "good" (`custom_models_good = false`)
   - Training data synced to S3

## Usage

### From Command Line

```bash
# Make script executable
chmod +x scripts/auto_train_actors.py

# Run the script
python3 scripts/auto_train_actors.py
```

### From Scripts Tab (UI)

1. Navigate to the **Scripts** tab in Actor Maker
2. Find "Auto Train Actors" under Training Data category
3. Click **Run Script**
4. Confirm the action (requires confirmation)

## How It Works

### 1. Actor Selection

The script queries all actors and filters for those that are eligible:

```python
# Eligible actors must have:
- training_data_good = true     # Training data validated
- custom_models_good = false    # No validated model yet
- training_data.count > 0       # Has training images
- training_data.synced = true   # Synced to S3
```

### 2. Ngrok Setup

Starts ngrok tunnel once (or reuses if already running):
- Checks `/api/ngrok/status`
- Starts via `/api/ngrok/start` if needed
- Reuses the same tunnel for all trainings

### 3. Training Parameters

Calculates optimal parameters based on image count (mirrors UI logic):

| Images | Steps | Learning Rate | Repeats | Rank/Alpha |
|--------|-------|---------------|---------|------------|
| ≤15    | 1,500 | 2e-4          | 2       | 16/8       |
| ≤30    | 2,000 | 2.5e-4        | 2       | 16/8       |
| ≤60    | 2,500 | 1.5e-4        | 1       | 16/8       |
| >60    | 3,000 | 1e-4          | 1       | 16/8       |

All trainings use:
- **Scheduler**: Cosine with 20% warmup
- **Optimizer**: AdamW 8-bit
- **Gradient dtype**: BF16
- **Batch size**: 1

### 4. Training Execution

For each eligible actor (up to 2):

1. **Fetch Training Data**: Gets S3 URLs via `/api/actors/:id/training-data`
2. **Build Workflow**: Loads and customizes `lora_training_workflow_headless.json`
3. **Start Training**: POSTs to `/api/training/start` with:
   - Customized workflow
   - S3 URLs for training images
   - Training configuration
   - Webhook URL for completion notification
4. **Save Version**: Creates training version entry in manifest
5. **Monitor Progress**: Polls `/api/training/status` every 30 seconds

### 5. Completion Handling

When training completes:
- **Webhook Notification**: RunPod calls `/api/training-webhook`
- **Manifest Update**: Webhook handler saves model URL to manifest
- **Status Update**: Training version marked as "completed"
- **Model Available**: Model appears in Validator and Actor Training tabs

## Output Example

```
============================================================
Automated Actor Training Script
============================================================

[Auto Train] Loading actors from API...
[Auto Train] Loaded 289 actors
[Auto Train] ✓ Eligible: 0019 european 20 female (ID: 19, Images: 23)
[Auto Train] ✓ Eligible: 0042 european 35 male (ID: 42, Images: 20)
[Auto Train] ✗ Skipped: 0001 european 25 female (already has good custom model)

[Auto Train] Found 2 eligible actor(s)
[Auto Train] Will train up to 2 actors

[Auto Train] Checking ngrok status...
[Auto Train] ✓ Ngrok already running: https://abc123.ngrok.io

========================================
[Auto Train] Training 1/2
========================================

[Auto Train] Starting training for: 0019 european 20 female
[Auto Train] Actor ID: 0019
[Auto Train] Training images: 23

[Auto Train] Parameters:
  - Steps: 2000
  - Learning Rate: 0.00025
  - Rank/Alpha: 16/8
  - Repeats: 2
  - Trigger: 0019 european 20 female

[Auto Train] Found 23 training images in S3
[Auto Train] Version: V7
[Auto Train] Sending training request to RunPod...
[Auto Train] ✓ Training started!
[Auto Train] Job ID: abc-123-def-456
[Auto Train] ✓ Training version saved
[Auto Train] Estimated duration: ~50 minutes
[Auto Train] Webhook will notify when complete

[Auto Train] Monitoring training for 0019 european 20 female...
[Auto Train] [0m] Status: IN_QUEUE
[Auto Train] [1m] Status: IN_PROGRESS
[Auto Train] [45m] Status: IN_PROGRESS
[Auto Train] [50m] Status: COMPLETED
[Auto Train] ✓ Training completed!
[Auto Train] Model URL: s3://bucket/actor_0019_V7.safetensors

============================================================
Training Summary
============================================================
Total actors processed: 2
Successful: 2
Failed: 0

✓ Successful models have been saved to manifests
✓ Models will be available in the Validator and Actor Training tabs
```

## Architecture

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/actors` | Load all actors with metadata |
| `GET /api/actors/:id/training-data` | Fetch S3 URLs for training images |
| `GET /api/actors/:id/training-versions` | Load existing training versions |
| `POST /api/actors/:id/training-versions` | Save new training version |
| `GET /api/ngrok/status` | Check if ngrok is running |
| `POST /api/ngrok/start` | Start ngrok tunnel |
| `POST /api/training/start` | Submit training job to RunPod |
| `POST /api/training/status` | Check training job status |
| `POST /api/training-webhook` | Webhook for completion (called by RunPod) |

### Data Flow

```
1. Script → GET /api/actors
   ← Returns actors with training_data_good, custom_models_good flags

2. Script → POST /api/ngrok/start
   ← Returns ngrok URL

3. For each eligible actor:
   
   a. Script → GET /api/actors/:id/training-data
      ← Returns S3 URLs for training images
   
   b. Script → POST /api/training/start
      ← Returns job_id
   
   c. Script → POST /api/actors/:id/training-versions
      ← Saves training version
   
   d. Loop:
      Script → POST /api/training/status
      ← Returns status (IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED)
   
   e. RunPod → POST /api/training-webhook (when complete)
      ← Saves model URL to manifest

4. Script completes, models available in UI
```

## Configuration

### Max Concurrent Trainings

```python
MAX_CONCURRENT_TRAININGS = 2  # Train up to 2 actors
```

Change this value to train more or fewer actors per run.

### Vite Server URL

```python
VITE_SERVER_URL = "http://localhost:5173"
```

Update if your Vite dev server runs on a different port.

### Polling Interval

```python
poll_interval = 30  # Check status every 30 seconds
```

### Max Wait Time

```python
max_wait_time = 2 * 60 * 60  # 2 hours maximum
```

## Error Handling

### Common Issues

**"Make sure Vite dev server is running"**
- Start the dev server: `cd ui && npm run dev`

**"No eligible actors found"**
- Check actor filters in Actor Library
- Mark training data as "good" for actors you want to train
- Ensure training data is synced to S3

**"Failed to start training"**
- Check RunPod API key in `.env`
- Verify ngrok is running
- Check S3 credentials

**"Training exceeded max wait time"**
- Training took longer than 2 hours
- Check RunPod dashboard manually
- Job may still complete and webhook will update manifest

### Monitoring

The script provides detailed logging:
- `[Auto Train]` prefix on all messages
- `✓` for successful operations
- `✗` for failures
- `⚠️` for warnings

## Integration with UI

### Marking Training Data as Good

Before running the script, mark training data as good in the UI:

1. Go to **Actors Library**
2. Click on an actor
3. Review training images
4. Click "Mark Training Data as Good" button

### Viewing Results

After training completes:

1. **Actor Training Tab**: See training history and versions
2. **Validator Tab**: Test the new model
3. **Actor Library**: Mark model as "good" if validated

### Marking Models as Good

After validating a model:

1. Go to **Actor Training** tab
2. Select the actor
3. Click **History** tab
4. Click "Mark as Good" on the successful version
5. This updates both the manifest and `actorsData.json`

## Best Practices

1. **Review Training Data First**: Always validate training data quality before auto-training
2. **Monitor First Run**: Watch the first training to ensure everything works
3. **Run During Off-Hours**: Training takes 30-60 minutes per actor
4. **Keep Ngrok Running**: Don't stop ngrok while trainings are in progress
5. **Validate Models**: Test models in Validator before marking as good

## Troubleshooting

### Script hangs at "Monitoring training"

- Training is still in progress (normal)
- Check RunPod dashboard: https://runpod.io
- Webhook will update manifest when complete

### Models not appearing in UI

- Refresh the Actor Training tab
- Check manifest file: `data/actor_manifests/{actor_id}_manifest.json`
- Look for `custom_lora_models` array

### Training fails immediately

- Check RunPod credits/balance
- Verify S3 URLs are accessible
- Check training data has captions

## Future Enhancements

Potential improvements:
- **Parallel Training**: Train multiple actors simultaneously
- **Priority Queue**: Train actors in priority order
- **Email Notifications**: Alert when training completes
- **Retry Logic**: Automatically retry failed trainings
- **Cost Estimation**: Calculate RunPod costs before training
- **Batch Scheduling**: Schedule training runs at specific times

## Related Documentation

- [Actor Training Flow](ACTOR_TRAINING_FLOW.md)
- [Training Parameters Guide](RANK_16_RATIONALE.md)
- [Manifest Structure](S3_ONLY_ARCHITECTURE.md)
- [Scripts Tab](SCRIPTS_TAB_IMPLEMENTATION.md)
