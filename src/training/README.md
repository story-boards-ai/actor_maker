# LoRA Training Module

Complete LoRA training functionality for actor_maker, mirroring the backend TypeScript implementation.

## Overview

This module provides:
- **Training Client**: Send training requests to RunPod serverless endpoint
- **Workflow Builder**: Generate ComfyUI training workflows dynamically
- **Hyperparameter Policy**: Compute optimal hyperparameters based on image count
- **Webhook-Based Completion**: Async training with webhook callbacks

## Architecture

```
src/training/
├── client.py          # TrainingClient for RunPod serverless
├── workflow.py        # LoRATrainingWorkflow builder
├── hyperparams.py     # Dynamic hyperparameter computation
└── __init__.py        # Public API exports
```

## Quick Start

### 1. Basic Style Training

```python
from src.training import train_style

result = train_style(
    style_id="my-style-123",
    image_urls=[
        "s3://bucket/user/style/image1.jpg",
        "s3://bucket/user/style/image2.jpg",
    ],
    user_id="user-456",
    tenant_id="tenant-789"
)

print(f"Job ID: {result['job_id']}")
print(f"Status: {result['status']}")  # "started"
```

### 2. Basic Actor Training

```python
from src.training import train_actor

result = train_actor(
    actor_id="actor-abc",
    image_urls=["s3://bucket/user/actor/image1.jpg"],
    user_id="user-456",
    tenant_id="tenant-789"
)
```

### 3. Using TrainingClient

```python
from src.training import TrainingClient

client = TrainingClient(
    api_key="your-runpod-api-key",
    endpoint_id="your-endpoint-id"
)

result = client.train_style(
    style_id="style-123",
    image_urls=[...],
    user_id="user-456",
    tenant_id="tenant-789"
)
```

## Features

### Dynamic Hyperparameters

The module automatically computes optimal hyperparameters based on:
- **Training type** (styles vs actors)
- **Image count** (more images = more steps)

```python
from src.training import compute_hyperparams

# Compute for 15 style images
hp = compute_hyperparams("custom-styles", 15)
print(f"Learning rate: {hp.learning_rate}")
print(f"Training steps: {hp.max_train_steps}")
```

**Default Behavior:**

**Styles:**
- Learning rate: 0.0004
- Steps: `images × 50` (min 500, max 2000)

**Actors:**
- Learning rate: Tiered (0.0004 for 1-10 images, 0.0003 for 11-20, 0.00025 for 21+)
- Steps: `images × 100` (min 800, max 3000)

### Custom Hyperparameters

Override computed values:

```python
result = train_style(
    style_id="style-123",
    image_urls=[...],
    user_id="user-456",
    tenant_id="tenant-789",
    learning_rate=0.0005,      # Custom LR
    max_train_steps=1500       # Custom steps
)
```

### Workflow Builder

Build workflows programmatically:

```python
from src.training import LoRATrainingWorkflow

workflow = LoRATrainingWorkflow(
    class_tokens="my-style-token",
    training_type="custom-styles",
    learning_rate=0.0004,
    max_train_steps=1000
).build()

# Use in custom training requests
payload = {
    "input": {
        "workflow": workflow,
        "training_data": {"s3_urls": [...]},
        "training_config": {...}
    }
}
```

## Environment Variables

Required:
```bash
# RunPod API key
RUNPOD_API_KEY=your_runpod_api_key

# OR for training-specific key
MODEL_TRAINING_RUNPOD_API_KEY=your_training_api_key

# Serverless endpoint for training
MODEL_TRAINING_RUNPOD_ENDPOINT_ID=your_endpoint_id
```

Optional:
```bash
# Webhook configuration
GATEWAY_BASE_URL=https://api.yourdomain.com
BASE_URL=https://api.yourdomain.com

# Hyperparameter tuning - Styles
SB_HP_STYLE_LR=0.0004              # Learning rate
SB_HP_STYLE_SPI=50                 # Steps per image
SB_HP_STYLE_MIN=500                # Min steps
SB_HP_STYLE_MAX=2000               # Max steps

# Hyperparameter tuning - Actors
SB_HP_ACTOR_LR_T1=0.0004           # LR for 1-10 images
SB_HP_ACTOR_LR_T2=0.0003           # LR for 11-20 images
SB_HP_ACTOR_LR_T3=0.00025          # LR for 21+ images
SB_HP_ACTOR_T1_MAX=10              # Tier 1 threshold
SB_HP_ACTOR_T2_MAX=20              # Tier 2 threshold
SB_HP_ACTOR_SPI=100                # Steps per image
SB_HP_ACTOR_MIN=800                # Min steps
SB_HP_ACTOR_MAX=3000               # Max steps
```

## Training Flow

1. **Convert URLs**: HTTPS S3 URLs → `s3://bucket/key` format
2. **Compute Hyperparams**: Based on training type and image count
3. **Build Workflow**: Generate ComfyUI workflow with parameters
4. **Submit Request**: POST to RunPod `/run` endpoint with webhook URL
5. **Async Processing**: RunPod trains model and calls webhook on completion
6. **Webhook Handler**: Backend receives completion notification with model URL

### Response Format

```python
{
    "status": "started",
    "job_id": "custom-styles_style_my-style-123_1234567890",
    "runpod_job_id": "abc-123-def-456",
    "user_id": "user-456",
    "tenant_id": "tenant-789",
    "training_type": "custom-styles",
    "model_name": "style_my-style-123",
    "message": "Training started, completion will be notified via webhook",
    "webhook_url": "https://api.yourdomain.com/core/training-webhooks/runpod-serverless"
}
```

## Integration with Backend

This Python implementation mirrors the TypeScript backend:

**Backend** → **Python**
- `trainCustomStyleModel.ts` → `client.train_style()`
- `trainCustomActorModel.ts` → `client.train_actor()`
- `lora-training-workflow-headless.ts` → `LoRATrainingWorkflow`
- `hyperparamPolicy.ts` → `compute_hyperparams()`
- `runpodServerlessTrainingRequest.ts` → `TrainingClient._train()`

## Workflow Details

The ComfyUI workflow includes:
- **Flux Dev FP8** model
- **16-dimensional LoRA** (network_dim: 16)
- **Bucket-based training** (256-1024px resolution)
- **Batch size: 2** with 10 repeats
- **Loss visualization** and validation samples
- **BF16 precision** for gradient and save

Key nodes:
- Node 2: Model selection
- Node 4: Training loop
- Node 107: Training initialization
- Node 109: Dataset configuration
- Node 14: LoRA save

## Error Handling

```python
try:
    result = train_style(...)
    
    if result["status"] == "started":
        print(f"✅ Training started: {result['job_id']}")
    elif result["status"] == "failed":
        print(f"❌ Training failed: {result.get('error')}")
        
except ValueError as e:
    print(f"Configuration error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Testing

Run examples:
```bash
cd examples
python training_usage.py
```

## Comparison with Backend

| Feature | Backend (TypeScript) | Python (actor_maker) |
|---------|---------------------|----------------------|
| Workflow generation | ✅ | ✅ |
| Dynamic hyperparams | ✅ | ✅ |
| S3 URL conversion | ✅ | ✅ |
| Webhook-based completion | ✅ | ✅ |
| Environment variables | ✅ | ✅ |
| Serverless routing | ✅ | ✅ |

## Advanced Usage

### Load Workflow Template

```python
from src.training import load_workflow_template

template = load_workflow_template("lora_training_workflow_headless")
# Modify template as needed
```

### Custom Workflow Modifications

```python
workflow = LoRATrainingWorkflow(
    class_tokens="my-token",
    training_type="custom-styles"
).build()

# Modify specific nodes
workflow["109"]["inputs"]["batch_size"] = 4
workflow["107"]["inputs"]["network_dim"] = 32
```

## Troubleshooting

**No API key:**
```
ValueError: RunPod API key is required
```
→ Set `RUNPOD_API_KEY` environment variable

**No endpoint:**
```
ValueError: MODEL_TRAINING_RUNPOD_ENDPOINT_ID environment variable is required
```
→ Set `MODEL_TRAINING_RUNPOD_ENDPOINT_ID` environment variable

**Timeout:**
```python
{"status": "failed", "error": "Training request timeout"}
```
→ Check RunPod endpoint health and increase timeout

## See Also

- [Backend Implementation](../../../story-boards-backend/apps/core/src/model-training/)
- [Training Workflows](../../workflows/)
- [Usage Examples](../../examples/training_usage.py)
