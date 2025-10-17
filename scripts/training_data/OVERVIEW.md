# Training Data Automation System - Complete Overview

## 🎯 What This System Does

Automatically evaluates and balances actor training data to ensure optimal distribution:
- **65% Photorealistic** (13 images) - Cinematic film scenes
- **20% B&W Stylized** (4 images) - Black & white illustrations  
- **15% Color Stylized** (3 images) - Color illustrations
- **Total: 20 images per actor**

## 📦 Complete File List

```
scripts/training_data/
├── evaluate_and_balance.py          # Main script - orchestrates everything
├── training_data_evaluator.py       # Creates composites, calls GPT Vision
├── training_data_balancer.py        # Deletes excess, generates missing
├── actor_manifest.py                # Loads actor metadata
├── test_evaluation.py               # Test with random actor
├── show_stats.py                    # Show statistics across all actors
├── __init__.py                      # Python module initialization
├── README.md                        # Complete documentation
├── QUICK_START.md                   # Get started in 3 steps
├── IMPLEMENTATION_SUMMARY.md        # Technical implementation details
├── EXAMPLE_GPT_PROMPT.md            # GPT prompt template and example
└── OVERVIEW.md                      # This file
```

## 🚀 Quick Commands

### See Current State
```bash
# Show statistics for all actors
python scripts/training_data/show_stats.py
```

### Test the System
```bash
# Test with a random actor (dry-run, safe)
python scripts/training_data/test_evaluation.py
```

### Evaluate Actors
```bash
# Single actor (dry-run)
python scripts/training_data/evaluate_and_balance.py --actor-id 0000 --dry-run

# All actors (dry-run)
python scripts/training_data/evaluate_and_balance.py --all --dry-run
```

### Execute Balancing
```bash
# Single actor (makes changes!)
python scripts/training_data/evaluate_and_balance.py --actor-id 0000 --execute

# All actors (makes changes!)
python scripts/training_data/evaluate_and_balance.py --all --execute
```

## 🔄 Complete Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LOAD ACTOR DATA                                          │
│    • Read training data manifest                            │
│    • Get all training image S3 URLs                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CREATE COMPOSITE IMAGE                                   │
│    • Download all images from S3                            │
│    • Create grid (200px thumbnails, 5 columns)              │
│    • Save as JPEG                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. GPT-4.1 MINI VISION EVALUATION                          │
│    • Send composite image + prompt                          │
│    • GPT categorizes each image (1-N):                      │
│      - photorealistic                                       │
│      - bw_stylized                                          │
│      - color_stylized                                       │
│    • GPT assigns quality scores (1-10)                      │
│    • GPT recommends actions                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CALCULATE ACTION PLAN                                    │
│    • Compare current vs target distribution                 │
│    • Identify excess images (to delete)                     │
│    • Identify missing types (to generate)                   │
│    • Check if balanced (within ±10% tolerance)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SAVE EVALUATION RESULTS                                  │
│    • Composite image: {actor_id}_composite.jpg              │
│    • Evaluation JSON: {actor_id}_evaluation.json            │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    [If --execute flag]
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. DELETE EXCESS IMAGES                                     │
│    • Delete from S3 (lowest quality first)                  │
│    • Remove from training data manifest                     │
│    • Update manifest file                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. GENERATE MISSING IMAGES                                  │
│    • Load actor base image                                  │
│    • Select appropriate prompts by type:                    │
│      - Photorealistic: prompts 1-15                         │
│      - B&W Stylized: prompts 16-26                          │
│      - Color Stylized: prompts 27-35                        │
│    • Generate via Replicate flux-kontext-pro                │
│    • Upload to S3                                           │
│    • Update training data manifest                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
                      ✅ COMPLETE
```

## 📊 Example Output

### Statistics (show_stats.py)
```
======================================================================
TRAINING DATA STATISTICS
======================================================================

Found 289 actors with training data

SUMMARY
----------------------------------------------------------------------
Total actors:        289
Total images:        5,234
Average per actor:   18.1

Target count:        20 images per actor
  Exactly target:    45 actors (15.6%)
  Under target:      123 actors (42.6%)
  Over target:       121 actors (41.8%)

DISTRIBUTION
----------------------------------------------------------------------
 12 images: ██ (2 actors)
 15 images: █████ (5 actors)
 18 images: ████████ (8 actors)
 20 images: ████████████ (12 actors) ← TARGET
 22 images: ██████████ (10 actors)
 25 images: ███████ (7 actors)
```

### Evaluation Results
```
EVALUATION RESULTS
==================
Actor: 0042
Total images: 22

Current Distribution:
  Photorealistic: 15 (68.2%)
  B&W Stylized:   4 (18.2%)
  Color Stylized: 3 (13.6%)

Target Distribution:
  Photorealistic: 13 (65%)
  B&W Stylized:   4 (20%)
  Color Stylized: 3 (15%)

Balanced: ❌ NO

Action Plan:
  Images to delete: 2
    - Image #3 (photorealistic, quality: 6)
    - Image #7 (photorealistic, quality: 5)
  Images to generate: 0

GPT Analysis:
  The dataset has 2 excess photorealistic images. The B&W and color
  stylized counts are at target. Recommend deleting the 2 lowest
  quality photorealistic images to reach optimal distribution.
```

## 🎨 How GPT Categorizes Images

### Photorealistic
- Real-world scenes with natural lighting
- Cinematic quality and composition
- Film-like aesthetic
- Natural environments and settings
- Realistic human features and expressions

**Examples:**
- Person walking in rain-slick street at night
- Close-up portrait with natural lighting
- Mountain climbing scene with harsh sunlight
- Forest scene with dappled sunlight

### B&W Stylized
- Black and white ONLY (no color)
- Artistic/illustrated style
- Various techniques: pen & ink, charcoal, manga, woodcut, etc.
- High contrast or detailed linework
- Not photorealistic

**Examples:**
- Pen and ink line drawing
- Charcoal sketch with smudged shadows
- Manga-style illustration with screentones
- Woodcut print with carved textures

### Color Stylized
- Color illustrations (not B&W)
- Artistic/illustrated style
- Various techniques: comic book, watercolor, digital painting, etc.
- Not photorealistic
- Visible artistic medium

**Examples:**
- Comic book illustration with cel shading
- Watercolor painting with paper texture
- Digital painting with brush strokes
- Gouache painting with matte colors

## 🛡️ Safety & Best Practices

### Always Start with Dry-Run
```bash
# ✅ SAFE - Only evaluates, doesn't change anything
python scripts/training_data/evaluate_and_balance.py --all --dry-run

# ❌ CAREFUL - Makes actual changes
python scripts/training_data/evaluate_and_balance.py --all --execute
```

### Review Before Executing
1. Run dry-run first
2. Check output files in `debug/training_data_evaluation/`
3. Review composite images and evaluation JSONs
4. Verify recommendations make sense
5. Then run with `--execute` if satisfied

### Start Small
```bash
# Test with one actor first
python scripts/training_data/evaluate_and_balance.py --actor-id 0000 --execute

# If successful, then run for all
python scripts/training_data/evaluate_and_balance.py --all --execute
```

### Backup Important Data
Consider backing up:
- Training data manifests: `data/actors/*/training_data/manifest.json`
- Actor manifests: `data/actor_manifests/*.json`
- S3 bucket (if possible)

## 📋 Requirements Checklist

- [x] Python 3.8+
- [x] OpenAI API key (`OPENAI_API_KEY`)
- [x] Replicate API token (`REPLICATE_API_TOKEN`)
- [x] AWS credentials (`AWS_ACCESS_KEY`, `AWS_ACCESS_SECRET`, `AWS_REGION`)
- [x] Required packages: `openai`, `replicate`, `boto3`, `Pillow`, `requests`
- [x] Training data manifests exist
- [x] Actor manifests exist
- [x] Base images accessible

## 🎯 Success Criteria

An actor's training data is considered **balanced** when:
- Total images = 20
- Photorealistic: 13 images (65% ± 10%)
- B&W Stylized: 4 images (20% ± 10%)
- Color Stylized: 3 images (15% ± 10%)

## 📖 Documentation Index

1. **OVERVIEW.md** (this file) - Complete system overview
2. **QUICK_START.md** - Get started in 3 steps
3. **README.md** - Complete documentation with all details
4. **IMPLEMENTATION_SUMMARY.md** - Technical implementation details
5. **EXAMPLE_GPT_PROMPT.md** - GPT prompt template and examples

## 🔮 Future Enhancements

Potential improvements:
- Parallel processing for multiple actors
- Custom distributions per actor type
- Quality threshold requirements
- Web UI integration
- Incremental processing (only new images)
- Rollback support
- Progress tracking
- Batch operations

## ✅ System Status

**Status: ✅ READY TO USE**

All components are implemented and tested:
- Main orchestration script
- GPT Vision evaluator
- Image balancer
- Actor manifest loader
- Test scripts
- Documentation
- Safety features (dry-run default)
- Error handling
- Logging

**Next Step:** Run `python scripts/training_data/test_evaluation.py` to see it in action!
