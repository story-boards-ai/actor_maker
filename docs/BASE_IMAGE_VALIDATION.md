# Base Image Validation System

## Overview

The base image validation script automatically validates and regenerates base images for all actors using GPT-4o-mini vision to ensure image quality and accuracy.

## Features

- **Automatic Base Image Creation**: Creates base images for actors that don't have one
- **GPT Vision Assessment**: Uses GPT-4.1-mini to validate image quality and match with descriptions
- **Smart Matching Logic**: Lenient matching criteria to avoid accidentally deleting good images
- **Training Data Cleanup**: Automatically deletes training data when base images are recreated
- **Dry Run Mode**: Test on 10 random actors without making changes
- **Checkpoint System**: Save progress and resume if interrupted
- **Comprehensive Logging**: Detailed results saved to JSON file

## Usage

### Two-Step Workflow (Recommended)

**Step 1: Dry Run - Generate Action Plan**
```bash
# Check all actors and generate action plan (no changes made)
python scripts/validate_base_images.py --dry-run

# If interrupted, resume where you left off
python scripts/validate_base_images.py --dry-run --resume

# This creates: debug/base_image_validation_action_plan.json
# Review the plan to see what will be done
```

**Step 2: Execute Action Plan**
```bash
# Preview what will be executed
python scripts/execute_validation_plan.py --preview

# Execute the plan
python scripts/execute_validation_plan.py

# If interrupted, resume where you left off
python scripts/execute_validation_plan.py --resume

# Or execute only specific action types
python scripts/execute_validation_plan.py --actions create_base_image,recreate_mismatch
```

### Direct Execution (One-Step)
Validate and fix all actors in one go:
```bash
python scripts/validate_base_images.py
```

### Process Specific Actors
Process only specific actor IDs:
```bash
python scripts/validate_base_images.py --actors 0,1,5,10
```

### Resume from Checkpoint
If you need to stop the script (Ctrl+C), you can resume where you left off:
```bash
# Start processing all actors
python scripts/validate_base_images.py

# If interrupted, resume from checkpoint
python scripts/validate_base_images.py --resume
```

### Reset Checkpoint
Start fresh and delete the checkpoint:
```bash
python scripts/validate_base_images.py --reset-checkpoint
```

## How It Works

### 1. Actor Processing Flow

For each actor, the script:

1. **Checks for base image existence**
   - Searches in multiple locations: `base_image/`, `poster_frame/`, `training_data/`
   - If no image found → Creates new base image + deletes training data

2. **Assesses existing base images with GPT-4o-mini vision**
   - Compares image against actor description and outfit
   - Checks if image is clear and recognizable
   - Uses lenient matching to avoid false positives

3. **Takes action based on assessment**
   - **Clear + Match**: Skips to next actor (no changes)
   - **Blurry**: Recreates base image + deletes training data
   - **Mismatch**: Recreates base image + deletes training data

### 2. GPT Vision Assessment

The script sends each base image to GPT-4o-mini with a carefully crafted prompt that:

- **Checks clarity**: Is the image clear and recognizable (not blurry)?
- **Checks matching**: Does the image match the actor description and outfit?
- **Uses lenient criteria**: Only rejects on MAJOR discrepancies

**Assessment Criteria:**
- ✅ **LENIENT**: Minor differences in outfit details are acceptable
- ✅ **LENIENT**: Lighting, pose, and angle variations are fine
- ✅ **LENIENT**: Small details can differ
- ❌ **STRICT**: Wrong age group, sex, or completely different appearance

**GPT Response Format:**
```json
{
  "is_clear": true/false,
  "is_match": true/false,
  "clarity_reason": "Brief explanation",
  "match_reason": "Brief explanation",
  "confidence": "high/medium/low"
}
```

### 3. Base Image Creation

When a base image needs to be created:

1. Uses the actor's `description` field from `actorsData.json`
2. Calls `generate_base_image()` function
3. Generates professional full-body studio portrait
4. Saves to `data/actors/{actor_name}/base_image/{actor_name}_base.jpg`

**Generation Parameters:**
- Width: 1024px
- Height: 1536px (portrait orientation)
- Steps: 25 (high quality)
- Seed: -1 (random)
- Model: FLUX dev

### 4. Training Data Deletion

When base images are recreated:

1. Calls `delete_all_training_data()` function
2. Deletes all local training images
3. Deletes S3 training images
4. Deletes manifest files
5. Ensures clean slate for new training data generation

## Output

### Console Output

The script provides detailed logging:

```
================================================================================
Processing Actor 0: 0000_european_16_male
Description: 16 year old young man, with european complexion...
Outfit: Casual high school attire...
================================================================================
✓ Base image found: /path/to/base_image.jpg
Assessing image with GPT-4.1-mini vision...
Assessment: Clear=True, Match=True
Reason: Clarity: Image is sharp and clear | Match: Matches description closely | Confidence: high
✅ Image is valid - skipping
```

### Results File

Detailed results saved to `debug/base_image_validation_results.json`:

```json
{
  "dry_run": false,
  "total_processed": 329,
  "summary": {
    "skipped": 300,
    "created": 15,
    "recreated_blurry": 8,
    "recreated_mismatch": 6,
    "errors": 0
  },
  "results": [
    {
      "actor_id": 0,
      "actor_name": "0000_european_16_male",
      "action": "skip",
      "reason": "Image is clear and matches description...",
      "success": true
    }
  ]
}
```

## Action Types

| Action | Description | Changes Made |
|--------|-------------|--------------|
| `skip` | Image is valid | None |
| `create_base_image` | No base image exists | Creates base image, deletes training data |
| `recreate_blurry` | Image is blurry/unrecognizable | Recreates base image, deletes training data |
| `recreate_mismatch` | Image doesn't match description | Recreates base image, deletes training data |
| `error` | Processing failed | None |

## Safety Features

### 1. Lenient Matching
The GPT assessment is intentionally lenient to avoid false positives:
- Only rejects on MAJOR discrepancies
- Accepts minor outfit variations
- Accepts different poses and angles
- Focuses on core characteristics (age, sex, ethnicity, hair)

### 2. Error Handling
If GPT assessment fails:
- Assumes image is valid (doesn't delete)
- Logs error for investigation
- Continues processing other actors

### 3. Dry Run Mode
Test the script safely:
- Processes only 10 random actors
- Makes no actual changes
- Shows what would happen
- Saves results for review

## Requirements

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key
RUNPOD_API_KEY=your_runpod_api_key
# ... other RunPod environment variables
```

### Python Dependencies
- `openai` - GPT API client
- All dependencies from `requirements.txt`

## Data Sources

The script loads actor data from:

1. **actorsData.json**: Primary source for actor metadata
   - `id`: Actor ID
   - `name`: Actor folder name
   - `description`: Physical description
   - `outfit`: Outfit description

2. **Base Image Locations** (checked in order):
   - `data/actors/{name}/base_image/{name}_base.jpg`
   - `data/actors/{name}/base_image/{name}_base.png`
   - `data/actors/{name}/poster_frame/{name}_poster.png`
   - `data/actors/{name}/poster_frame/{name}_poster.jpg`
   - `data/actors/{name}/training_data/{name}_0.jpg`
   - `data/actors/{name}/training_data/{name}_0.png`

## Action Plan System

The dry-run mode generates an action plan that can be reviewed and executed separately.

### How It Works

1. **Dry Run**: Validates all actors and generates action plan (no changes)
2. **Review**: Examine the action plan to see what needs to be done
3. **Execute**: Run the execution script to apply the changes

### Action Plan File

**Location**: `debug/base_image_validation_action_plan.json`

**Format**:
```json
{
  "generated_at": "...",
  "total_actors_checked": 288,
  "actions_needed": 15,
  "summary": {
    "create_base_image": 5,
    "recreate_blurry": 3,
    "recreate_mismatch": 7
  },
  "actions": [
    {
      "actor_id": 42,
      "actor_name": "0042_european_30_male",
      "action": "recreate_mismatch",
      "reason": "Image does not match description: ...",
      "success": false
    }
  ]
}
```

### Benefits

- **Review Before Execution**: See exactly what will be changed
- **Selective Execution**: Execute only specific action types
- **Audit Trail**: Keep record of what was planned vs executed
- **Safe Testing**: Dry run on all actors without risk

## Checkpoint System

The script automatically saves progress after processing each actor, allowing you to safely interrupt and resume.

### How It Works

1. **Automatic Saving**: After each actor is processed, the checkpoint file is updated
2. **Resume Support**: Use `--resume` to skip already processed actors
3. **Interrupt Safe**: Press Ctrl+C to stop - progress is saved
4. **Error Handling**: Even failed actors are marked as processed to avoid infinite retries

### Checkpoint Files

- **Location**: `debug/base_image_validation_checkpoint.json`
- **Contents**: List of processed actor IDs
- **Persistence**: Survives script restarts

### Example Workflow

```bash
# Start processing all 288 actors
python scripts/validate_base_images.py

# ... processes 50 actors ...
# Press Ctrl+C to stop

# Output shows:
# ⚠️  Interrupted by user
# Progress saved: 50 actors processed
# Resume with: python scripts/validate_base_images.py --resume

# Later, resume from where you left off
python scripts/validate_base_images.py --resume

# Output shows:
# Loaded checkpoint: 50 actors already processed
# RESUME MODE: Skipping 50 already processed actors
# Processing remaining 238 actors
```

### Reset Checkpoint

If you want to start over:
```bash
# Delete checkpoint and start fresh
python scripts/validate_base_images.py --reset-checkpoint

# Then run normally
python scripts/validate_base_images.py
```

## Best Practices

### 1. Always Dry Run First
```bash
# Test on 10 random actors
python scripts/validate_base_images.py --dry-run

# Review results in debug/base_image_validation_results.json

# If results look good, run for real
python scripts/validate_base_images.py
```

### 2. Process in Batches
For large actor libraries, process in batches:
```bash
# Process first 50 actors
python scripts/validate_base_images.py --actors 0,1,2,3,...,49

# Review results, then continue
python scripts/validate_base_images.py --actors 50,51,52,...,99
```

### 3. Monitor Results
Check the results file after each run:
```bash
cat debug/base_image_validation_results.json | jq '.summary'
```

### 4. Review Recreations
If many images are being recreated, review the reasons:
```bash
cat debug/base_image_validation_results.json | jq '.results[] | select(.action != "skip")'
```

## Troubleshooting

### Issue: Too many images being recreated

**Cause**: GPT matching criteria might be too strict

**Solution**: 
- Review the `match_reason` in results
- Check if descriptions are too specific
- Consider updating actor descriptions to be more general

### Issue: GPT assessment failing

**Cause**: API errors, rate limits, or network issues

**Solution**:
- Check OPENAI_API_KEY is set
- Check API quota and rate limits
- Review error messages in console
- Script will assume images are valid on error (safe default)

### Issue: Base image generation failing

**Cause**: RunPod API issues or configuration problems

**Solution**:
- Check RunPod environment variables
- Review RunPod API status
- Check debug/base_image_full_payload.json for request details
- Review error messages in console

## Cost Considerations

### GPT-4o-mini Vision API
- **Cost**: ~$0.00015 per 1K input tokens, ~$0.0006 per 1K output tokens
- **Per Image**: ~$0.002 - $0.005 per assessment
- **329 Actors**: ~$0.66 - $1.65 total

### Base Image Generation (FLUX)
- **Cost**: Varies by RunPod endpoint
- **Per Image**: ~$0.01 - $0.05 per generation
- **Only charged for recreations**: Not all actors

## Integration with Training Workflow

This script integrates with the existing training workflow:

1. **Validate base images** (this script)
2. **Generate training data** (existing scripts)
3. **Train LoRA models** (existing workflow)

The validation ensures:
- All actors have valid base images
- Base images match actor descriptions
- Training data is clean when base images change
