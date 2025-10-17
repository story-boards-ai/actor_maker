# Action Plans Guide

## What This Does

Creates detailed action plans for all actors showing exactly what needs to be done to balance their training data.

## Run It

```bash
# Create action plans for all actors
python scripts/training_data/create_action_plans.py
```

## Output

Action plans are saved to `data/action_plans/`:

```
data/action_plans/
├── summary.json                              # Overall summary
├── progress.json                             # Progress tracker
├── 0000_european_16_male_action_plan.json   # Per-actor plans
├── 0001_european_20_female_action_plan.json
└── ...
```

## Action Plan Format

Each `{actor_id}_action_plan.json` contains:

```json
{
  "actor_id": "0019_european_20_female",
  "created_at": "2025-10-17T14:55:00.000000",
  "status": "pending",
  
  "current_state": {
    "total_images": 7,
    "distribution": {
      "photorealistic": 7,
      "bw_stylized": 0,
      "color_stylized": 0
    }
  },
  
  "target_state": {
    "total_images": 20,
    "distribution": {
      "photorealistic": 13,
      "bw_stylized": 4,
      "color_stylized": 3
    }
  },
  
  "is_balanced": false,
  
  "files_to_delete": [
    {
      "image_number": 7,
      "type": "photorealistic",
      "filename": "0019_european_20_female_7.png",
      "local_path": "/path/to/data/actors/0019_european_20_female/training_data/0019_european_20_female_7.png",
      "s3_url": "https://...",
      "quality_score": 5
    }
  ],
  
  "images_to_generate": [
    {"type": "photorealistic", "count": 6},
    {"type": "bw_stylized", "count": 4},
    {"type": "color_stylized", "count": 3}
  ],
  
  "gpt_analysis": "Currently, there are too many photorealistic images...",
  
  "image_classifications": [
    {"image_number": 1, "type": "photorealistic", "quality_score": 8},
    ...
  ]
}
```

## Key Fields

### `files_to_delete`
**Exact files to delete**, with:
- `filename`: File name
- `local_path`: Full path to delete
- `s3_url`: S3 URL to delete from
- `quality_score`: Why it was selected (low quality)

### `images_to_generate`
**How many images to generate** by type:
- `photorealistic`: Cinematic scenes
- `bw_stylized`: Black & white illustrations
- `color_stylized`: Color illustrations

### `is_balanced`
- `true`: No action needed
- `false`: Needs balancing

## Progress Tracking

The script has built-in progress tracking:

```bash
# Check progress
python scripts/training_data/create_action_plans.py --show-progress

# Reset and start fresh
python scripts/training_data/create_action_plans.py --reset-progress

# Resume (default)
python scripts/training_data/create_action_plans.py

# Start fresh (ignore progress)
python scripts/training_data/create_action_plans.py --no-resume
```

## Summary File

`data/action_plans/summary.json` contains:

```json
{
  "created_at": "2025-10-17T14:55:00.000000",
  "total_actors": 108,
  "balanced": 12,
  "needs_action": 96,
  "actors": [
    {
      "success": true,
      "actor_id": "0000_european_16_male",
      "is_balanced": false,
      "files_to_delete": 1,
      "images_to_generate": 7
    },
    ...
  ]
}
```

## Use Cases

### 1. Review Before Execution
```bash
# Create plans
python scripts/training_data/create_action_plans.py

# Review plans
cat data/action_plans/0019_european_20_female_action_plan.json

# Check summary
cat data/action_plans/summary.json
```

### 2. Batch Processing
```bash
# Create plans for all actors
python scripts/training_data/create_action_plans.py

# Later: Execute plans (separate script)
# python scripts/training_data/execute_action_plans.py
```

### 3. Selective Execution
```bash
# Create plans
python scripts/training_data/create_action_plans.py

# Execute only specific actors
# python scripts/training_data/execute_action_plans.py --actor-id 0019
```

## Features

✅ **Detailed file paths** - Know exactly which files to delete
✅ **S3 URLs included** - Can delete from S3 too
✅ **Quality scores** - Understand why files were selected
✅ **Progress tracking** - Resume anytime with Ctrl+C
✅ **GPT analysis** - Understand the reasoning
✅ **Summary report** - See overall status

## Next Steps

After creating action plans:

1. **Review** the plans in `data/action_plans/`
2. **Check** the summary to see how many actors need action
3. **Execute** the plans (manually or with execution script)
4. **Verify** results and re-evaluate

## Tips

- Plans are saved as JSON for easy parsing
- Use `jq` to filter/query plans: `cat summary.json | jq '.actors[] | select(.is_balanced == false)'`
- Plans include everything needed for execution
- Safe to interrupt (Ctrl+C) - progress is saved
