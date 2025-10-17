# Training Data Balancing System - Complete

## ✅ System Overview

Complete automated system for evaluating and balancing actor training data to achieve optimal distribution for LoRA training.

## 🎯 Target Distribution

- **20 total images** per actor
- **65% Photorealistic** (13 images): Cinematic film scenes
- **20% B&W Stylized** (4 images): Black & white illustrations
- **15% Color Stylized** (3 images): Color illustrations

## 📋 Complete Workflow

### Step 1: Create Action Plans
```bash
./venv/bin/python scripts/training_data/create_action_plans.py
```

**What it does:**
- Evaluates all 108 actors with GPT-4 Vision
- Creates detailed action plans in `data/action_plans/`
- Identifies which files to delete (low quality)
- Specifies how many images to generate by type
- Saves progress (safe to Ctrl+C and resume)

**Output:**
- `data/action_plans/{actor_id}_action_plan.json` - Per-actor plans
- `data/action_plans/summary.json` - Overall summary
- `data/action_plans/progress.json` - Progress tracker

### Step 2: Execute Action Plans
```bash
# Dry run first (recommended)
./venv/bin/python scripts/training_data/execute_action_plans.py --actor-id {actor_id} --dry-run

# Execute deletions only
./venv/bin/python scripts/training_data/execute_action_plans.py --actor-id {actor_id} --execute --delete-only

# Execute everything (deletions + generation)
./venv/bin/python scripts/training_data/execute_action_plans.py --actor-id {actor_id} --execute

# Execute all actors
./venv/bin/python scripts/training_data/execute_action_plans.py --all --execute
```

**What it does:**
- Deletes low-quality images (local + S3)
- Generates new images with Replicate flux-kontext-pro
- Uses proper cinematic prompts from `actor_training_prompts.py`
- Processes in batches of 2 (concurrency control)
- Uploads to S3
- Updates manifests

## 🔧 Key Features

### Evaluation System
- ✅ GPT-4 Vision analyzes composite images
- ✅ Identifies quality issues (camera gaze, symmetry, distortion)
- ✅ Classifies images by type
- ✅ Recommends specific deletions and generations

### Deletion System
- ✅ Deletes local files
- ✅ Deletes from S3
- ✅ Removes from manifest
- ✅ Graceful handling of missing files

### Generation System
- ✅ Uses actor-specific descriptors (man, woman, etc.)
- ✅ Cinematic film scene prompts with dynamic angles
- ✅ Shuffled prompts for variety (no repetition)
- ✅ Proper filename indexing (no overwrites)
- ✅ Batch processing (max 2 concurrent)
- ✅ S3 upload with clean URL strings
- ✅ Manifest updates with full metadata

### Progress Tracking
- ✅ Resume capability (Ctrl+C safe)
- ✅ Progress percentage
- ✅ Failed actor tracking
- ✅ Summary reports

## 🐛 Bugs Fixed

### 1. Filename Index Bug
**Problem:** Files were overwritten (same index used multiple times)
**Fix:** Calculate index once per batch, increment properly

### 2. Prompt Repetition Bug
**Problem:** Same 2 prompts used repeatedly
**Fix:** Prepare and shuffle prompts once, share across all batches

### 3. S3 URL Format Bug
**Problem:** Manifest stored entire dict instead of URL string
**Fix:** Extract just the 'Location' field from S3 response

### 4. Manifest Sync Issues
**Problem:** Manifest out of sync with filesystem
**Fix:** Proper manifest updates after each operation

## 📁 File Structure

```
scripts/training_data/
├── create_action_plans.py          # Creates evaluation-based action plans
├── execute_action_plans.py         # Executes deletions and generation
├── training_data_evaluator.py      # GPT-4 Vision evaluation
├── test_evaluation.py              # Test evaluation on single actor
└── ACTION_PLANS_GUIDE.md          # User guide

data/action_plans/
├── {actor_id}_action_plan.json    # Per-actor action plans
├── summary.json                    # Overall summary
└── progress.json                   # Progress tracker

data/actors/{actor_id}/
├── base_image/                     # Source image for generation
│   └── {actor_id}_base.png
└── training_data/                  # Training images
    ├── {actor_id}_0.jpg
    ├── {actor_id}_1.jpg
    ├── ...
    └── manifest.json               # Tracks all images
```

## 🎨 Prompt System

Uses `src/actor_training_prompts.py`:
- **15 photorealistic prompts**: Varied environments, lighting, angles
- **11 B&W stylized prompts**: Pen & ink, charcoal, manga styles
- **9 color stylized prompts**: Watercolor, digital painting, comic styles

All prompts feature:
- Dynamic camera angles (dutch, low, high, over-shoulder)
- Off-center framing (no symmetry)
- Character looking away (no camera awareness)
- Cinematic film quality

## ⚙️ Configuration

**Concurrency:** Max 2 concurrent Replicate requests (configurable in `ActionPlanExecutor.MAX_CONCURRENT_REQUESTS`)

**Target Distribution:** Defined in `TrainingDataEvaluator`:
- `TARGET_TOTAL = 20`
- `TARGET_PHOTOREALISTIC_PCT = 0.65`
- `TARGET_BW_STYLIZED_PCT = 0.20`
- `TARGET_COLOR_STYLIZED_PCT = 0.15`

## 🚀 Usage Examples

**Test on one actor:**
```bash
# Clean start
rm -f data/actors/0000_european_16_male/training_data/*.jpg
rm -f data/actors/0000_european_16_male/training_data/manifest.json

# Generate 20 images
./venv/bin/python scripts/training_data/execute_action_plans.py \
  --actor-id 0000_european_16_male \
  --execute \
  --generate-only
```

**Process all actors:**
```bash
# Create plans
./venv/bin/python scripts/training_data/create_action_plans.py

# Review summary
cat data/action_plans/summary.json

# Execute all
./venv/bin/python scripts/training_data/execute_action_plans.py --all --execute
```

## ✅ Verification

After execution, verify:
1. **File count**: `ls data/actors/{actor_id}/training_data/*.jpg | wc -l` should be ~20
2. **Manifest**: Check `data/actors/{actor_id}/training_data/manifest.json`
3. **UI**: View in training data tab of actor maker app
4. **S3**: Verify uploads in S3 bucket

## 🎯 Success Criteria

- ✅ 20 images per actor
- ✅ Correct distribution (13/4/3)
- ✅ No duplicate prompts
- ✅ Proper filename indices
- ✅ Manifest in sync with files
- ✅ S3 URLs clean and valid
- ✅ All images visible in UI

## 📝 Notes

- Always use `./venv/bin/python` to run scripts
- Action plans are snapshots - regenerate if files change
- Safe to interrupt with Ctrl+C - progress is saved
- Dry-run first to preview changes
- S3 upload is optional (graceful degradation)
