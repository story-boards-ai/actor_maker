# Training Data Automation System

Automated evaluation and balancing of actor training data using GPT-4.1 mini vision.

## Overview

This system automates the process of:
1. **Evaluating** existing training data distribution
2. **Identifying** images to delete (excess) and types to generate (missing)
3. **Balancing** the dataset to meet target distribution:
   - 65% Photorealistic (13 images)
   - 20% B&W Stylized (4 images)
   - 15% Color Stylized (3 images)
   - **Total: 20 images per actor**

## Architecture

### Main Script
- **`evaluate_and_balance.py`** - Main orchestration script

### Helper Modules
- **`training_data_evaluator.py`** - Creates composite images and evaluates with GPT Vision
- **`training_data_balancer.py`** - Deletes excess images and generates missing ones
- **`actor_manifest.py`** - Loads actor metadata from manifest files

### Integration with Existing Code
The system integrates with:
- `src/training_data_manifest.py` - Training data manifest management
- `src/actor_training_data_generator.py` - Image generation
- `src/actor_training_prompts.py` - Prompt templates
- `src/utils/openai_client.py` - GPT API client
- `src/replicate_service.py` - Image generation via Replicate

## Progress Tracking

The system automatically tracks progress so you can **start and stop processing at any time**:

- **Auto-save** - Progress saved after each actor
- **Auto-resume** - Continues from where you left off
- **Ctrl+C safe** - Interrupt anytime, progress preserved
- **Progress file** - `debug/training_data_evaluation/progress.json`

```bash
# Check current progress
python scripts/training_data/evaluate_and_balance.py --show-progress

# Reset progress (start fresh)
python scripts/training_data/evaluate_and_balance.py --reset-progress
```

See **[PROGRESS_TRACKING.md](PROGRESS_TRACKING.md)** for complete guide.

## Usage

### Dry Run (Evaluation Only)

Evaluate a single actor without making changes:
```bash
python scripts/training_data/evaluate_and_balance.py --actor-id 0000 --dry-run
```

Evaluate all actors:
```bash
python scripts/training_data/evaluate_and_balance.py --all --dry-run
```

### Execute (Make Changes)

Balance a single actor (delete excess, generate missing):
```bash
python scripts/training_data/evaluate_and_balance.py --actor-id 0000 --execute
```

Balance all actors:
```bash
python scripts/training_data/evaluate_and_balance.py --all --execute
```

### Custom Output Directory

```bash
python scripts/training_data/evaluate_and_balance.py \
  --actor-id 0000 \
  --dry-run \
  --output-dir debug/my_evaluation
```

## How It Works

### 1. Composite Image Creation

The evaluator downloads all training images for an actor and creates a composite grid:
- **Thumbnail size**: 200px per image (optimal for GPT Vision)
- **Layout**: 5 columns, auto rows
- **Format**: JPEG with 90% quality

### 2. GPT Vision Evaluation

The composite image is sent to GPT-4.1 mini with a detailed prompt:
- **Categorizes** each image by number (1-N) into: photorealistic, bw_stylized, color_stylized
- **Counts** how many of each type exist
- **Assigns quality scores** (1-10) to each image
- **Recommends** which images to delete (lowest quality) and how many to generate

### 3. Action Plan

Based on GPT's evaluation:
- **Delete**: Excess images of over-represented types (lowest quality first)
- **Generate**: Missing images of under-represented types using existing prompts

### 4. Execution

When `--execute` is used:
- **Deletion**: Removes images from S3 and updates manifest
- **Generation**: Uses `ActorTrainingDataGenerator` with appropriate prompts for each type

## Output Files

All output files are saved to `debug/training_data_evaluation/` (or custom `--output-dir`):

- `{actor_id}_composite.jpg` - Grid of all training images
- `{actor_id}_evaluation.json` - Complete evaluation results including:
  - Image classifications
  - Current distribution
  - Action plan (delete/generate)
  - GPT analysis

## Example Evaluation Output

```json
{
  "actor_id": "0000",
  "total_images": 22,
  "photorealistic_count": 15,
  "bw_stylized_count": 4,
  "color_stylized_count": 3,
  "photorealistic_percentage": 68.2,
  "bw_stylized_percentage": 18.2,
  "color_stylized_percentage": 13.6,
  "is_balanced": false,
  "images_to_delete": [
    {"image_number": 3, "type": "photorealistic"},
    {"image_number": 7, "type": "photorealistic"}
  ],
  "images_to_generate": [],
  "gpt_analysis": "The dataset has 2 excess photorealistic images. Recommend deleting the two lowest quality photorealistic images to reach target of 13."
}
```

## Target Distribution

| Type | Target % | Target Count | Tolerance |
|------|----------|--------------|-----------|
| Photorealistic | 65% | 13 images | ±10% |
| B&W Stylized | 20% | 4 images | ±10% |
| Color Stylized | 15% | 3 images | ±10% |
| **Total** | **100%** | **20 images** | - |

## Requirements

### Environment Variables
```bash
OPENAI_API_KEY=sk-...           # Required for GPT Vision
REPLICATE_API_TOKEN=r8_...      # Required for image generation
AWS_ACCESS_KEY=...              # Required for S3 operations
AWS_ACCESS_SECRET=...           # Required for S3 operations
AWS_REGION=us-west-1            # Required for S3 operations
```

### Python Dependencies
- `openai` - GPT API client
- `replicate` - Image generation
- `boto3` - S3 operations
- `Pillow` - Image processing
- `requests` - HTTP requests

## Safety Features

### Dry Run Default
By default, the script runs in **dry-run mode** to prevent accidental changes. You must explicitly use `--execute` to make actual changes.

### Validation
- Validates actor manifests exist before processing
- Checks for base images before generation
- Handles missing or corrupted images gracefully
- Logs all operations for audit trail

### Error Handling
- Continues processing other actors if one fails
- Provides detailed error messages
- Saves partial results even on failure

## Troubleshooting

### "No actors found with training data"
- Check that `data/actors/` directory exists
- Verify training data manifests exist in actor directories

### "Failed to load manifest"
- Ensure `data/actor_manifests/` contains `{actor_id}_manifest.json`
- Check JSON file is valid

### "Base image not found"
- Verify base image exists in actor directory
- Check `base_images` array in manifest has valid paths

### GPT Vision Errors
- Verify `OPENAI_API_KEY` is set correctly
- Check composite image was created successfully
- Review GPT API rate limits

### Image Generation Errors
- Verify `REPLICATE_API_TOKEN` is set
- Check base image is accessible
- Review Replicate API status

## Future Enhancements

Potential improvements:
- **Parallel processing** - Process multiple actors simultaneously
- **Custom distributions** - Allow different target ratios per actor
- **Quality thresholds** - Set minimum quality scores
- **Incremental updates** - Only process actors with new images
- **Web UI** - Visual interface for reviewing evaluations
- **Batch operations** - Process specific actor groups

## Integration Points

This system is designed to integrate with:
- **Training pipeline** - Automatically balance before training
- **UI workflows** - Trigger from training data tab
- **CI/CD** - Run as part of automated quality checks
- **Monitoring** - Track distribution metrics over time
