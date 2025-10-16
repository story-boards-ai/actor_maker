# Fetch Model Dates from S3

This script fetches the creation dates of safetensors model files from S3 and updates the `actorsData.ts` file with this information.

## What it does

1. **Fetches model metadata from S3**: Connects to the `story-boards-assets` S3 bucket and lists all `.safetensors` files in the `system_actors/lora_models/` directory
2. **Extracts creation dates**: Gets the `LastModified` timestamp for each model file
3. **Updates actorsData.ts**: Adds a `model_created_at` field to each actor object in the data file
4. **Saves JSON reference**: Creates a `model_dates.json` file with all the metadata for reference

## Prerequisites

- AWS credentials configured (via `aws configure` or environment variables)
- Python 3.x installed
- boto3 library installed: `pip install boto3`

## Usage

```bash
# From the project root
python scripts/fetch_model_dates_from_s3.py

# Or make it executable and run directly
chmod +x scripts/fetch_model_dates_from_s3.py
./scripts/fetch_model_dates_from_s3.py
```

## Output

The script will:
- Print progress as it fetches each model's metadata
- Update `/home/markus/actor_maker/data/actorsData.ts` with `model_created_at` fields
- Create `/home/markus/actor_maker/data/model_dates.json` with full metadata

## Example Output

```
Fetching safetensors model creation dates from S3...

✓ 0000: 2024-12-15 12:19:57
✓ 0001_european_20_female: 2024-12-15 12:20:03
✓ 0002_european_35_female: 2024-12-15 12:20:08
...

✓ Found 289 model files

✓ Saved model dates to /home/markus/actor_maker/data/model_dates.json

Updating actorsData.ts...
✓ Added model_created_at for 0000
✓ Added model_created_at for 0001_european_20_female
...

✓ Updated /home/markus/actor_maker/data/actorsData.ts

✅ Done!
```

## Data Format

The `model_created_at` field will be added to each actor in ISO 8601 format:

```typescript
{
  "id": 0,
  "name": "0000_european_16_male",
  "url": "https://story-boards-assets.s3-accelerate.amazonaws.com/system_actors/lora_models/0000.safetensors",
  "model_created_at": "2024-12-15T12:19:57.123456+00:00",  // ← New field
  // ... other fields
}
```

## UI Display

The model creation date will be displayed in the actor cards in the Library view:
- **Label**: "Model Date"
- **Format**: "Dec 15, 2024" (localized short date format)
- **Location**: In the info section below Description

## Notes

- The script is idempotent - you can run it multiple times safely
- If a `model_created_at` field already exists, it will be updated with the latest S3 data
- The script matches models by ID or name to handle different naming conventions
