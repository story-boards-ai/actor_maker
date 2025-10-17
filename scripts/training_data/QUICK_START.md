# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Test with a Random Actor
```bash
cd /home/markus/actor_maker
python scripts/training_data/test_evaluation.py
```

This will:
- Pick a random actor with training data
- Create a composite image of all their training images
- Send to GPT-4.1 mini for evaluation
- Show you the results
- Save output to `debug/test_evaluation/`

**Expected output:**
```
Found 289 actors with training data
Testing with actor: 0000
Running evaluation...

EVALUATION RESULTS
==================
Actor: 0000
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
    - Image #3 (photorealistic)
    - Image #7 (photorealistic)
  Images to generate: 0

GPT Analysis:
  The dataset has 2 excess photorealistic images...
```

### Step 2: Review the Output Files
```bash
# View the composite image
open debug/test_evaluation/0000_composite.jpg

# View the evaluation JSON
cat debug/test_evaluation/0000_evaluation.json | jq
```

### Step 3: Run for Real (Optional)
```bash
# Evaluate a specific actor (dry-run)
python scripts/training_data/evaluate_and_balance.py --actor-id 0000 --dry-run

# Execute balancing for that actor
python scripts/training_data/evaluate_and_balance.py --actor-id 0000 --execute
```

## 📊 Understanding the Output

### Composite Image
A grid showing all training images as thumbnails (200px each, 5 columns).
This is what GPT Vision analyzes.

### Evaluation JSON
```json
{
  "actor_id": "0000",
  "total_images": 22,
  "photorealistic_count": 15,
  "bw_stylized_count": 4,
  "color_stylized_count": 3,
  "is_balanced": false,
  "images_to_delete": [
    {"image_number": 3, "type": "photorealistic"},
    {"image_number": 7, "type": "photorealistic"}
  ],
  "images_to_generate": [],
  "gpt_analysis": "..."
}
```

## 🔄 Progress Tracking

The script automatically tracks progress:

```bash
# Start processing (auto-resumes if interrupted)
python scripts/training_data/evaluate_and_balance.py --all --dry-run

# Press Ctrl+C to stop anytime - progress is saved!

# Run again to resume from where you left off
python scripts/training_data/evaluate_and_balance.py --all --dry-run

# Check progress
python scripts/training_data/evaluate_and_balance.py --show-progress

# Start fresh (ignore previous progress)
python scripts/training_data/evaluate_and_balance.py --all --dry-run --no-resume
```

**See [PROGRESS_TRACKING.md](PROGRESS_TRACKING.md) for complete guide.**

## 🎯 Common Use Cases

### Evaluate All Actors (See What Needs Balancing)
```bash
python scripts/training_data/evaluate_and_balance.py --all --dry-run
```

### Balance a Specific Actor
```bash
python scripts/training_data/evaluate_and_balance.py --actor-id 0042 --execute
```

### Balance All Actors That Need It
```bash
python scripts/training_data/evaluate_and_balance.py --all --execute
```

## 🛡️ Safety Notes

- **Dry-run is default** - Won't make changes unless you use `--execute`
- **Review first** - Always check the evaluation output before executing
- **One at a time** - Start with single actors before running `--all --execute`
- **Backup** - Consider backing up your training data before bulk operations

## 🔍 Troubleshooting

### "No actors found with training data"
Check that training data manifests exist:
```bash
ls -la data/actors/*/training_data/manifest.json
```

### "Failed to load manifest"
Verify actor manifest exists:
```bash
ls -la data/actor_manifests/0000_manifest.json
```

### GPT API Errors
Check your API key:
```bash
echo $OPENAI_API_KEY
```

### Image Download Errors
Check S3 credentials:
```bash
echo $AWS_ACCESS_KEY
echo $AWS_ACCESS_SECRET
```

## 📖 Full Documentation

See `README.md` for complete documentation including:
- Architecture details
- All command-line options
- Output file formats
- Integration points
- Future enhancements
