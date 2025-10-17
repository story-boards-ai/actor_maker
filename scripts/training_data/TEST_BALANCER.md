# Training Data Balancer Implementation Test

## ✅ Implementation Complete

The balancer now has **full image generation and deletion** capabilities:

### **1. Local File Deletion ✓**
- Deletes files from S3
- Deletes local files from `data/actors/{actor_id}/training_data/`
- Updates manifest to remove deleted entries
- Logs both S3 and local deletion status

### **2. Image Generation ✓**
- Uses existing `ReplicateService` with flux-kontext-pro
- Loads prompts from `actor_training_prompts.py`
- Randomly selects prompts by type (photorealistic, bw_stylized, color_stylized)
- Numbers images sequentially based on existing max number
- Uploads to S3 and saves local copies
- Updates manifest with new images

### **3. Process Flow**

```
1. Load actor manifest and metadata
2. Find base image (from base_images array or base_image directory)
3. Prepare base image as base64 JPEG
4. Get actor descriptor (e.g., "woman", "man", "character")
5. Load all 35 training prompts from actor_training_prompts.py
6. Categorize prompts:
   - Photorealistic: prompts[0:15] (15 prompts)
   - B&W Stylized: prompts[15:26] (11 prompts)
   - Color Stylized: prompts[26:35] (9 prompts)
7. Find max existing image number
8. For each type to generate:
   - Randomly select N prompts (without replacement)
   - Generate image with Replicate flux-kontext-pro
   - Download and upload to S3
   - Save local copy
   - Number sequentially (max_number + 1, max_number + 2, etc.)
9. Update manifest with new generation
```

### **4. Sequential Numbering**

The system extracts numbers from existing filenames:
- `0001_european_20_female_12.png` → 12
- `actor_0001_td_05.jpg` → 5
- `0001_15.jpg` → 15

Finds the maximum (e.g., 15) and starts new images at 16, 17, 18, etc.

### **5. Filename Format**

New images use format: `{actor_id}_{number}.jpg`

Examples:
- `0001_european_20_female_16.jpg`
- `0001_european_20_female_17.jpg`
- `0001_european_20_female_18.jpg`

### **6. Manifest Updates**

Each generated image includes:
```json
{
  "prompt": "Full cinematic prompt...",
  "prompt_preview": "First 100 chars...",
  "generated_at": "2025-10-17T16:55:00.000000",
  "s3_url": "https://...",
  "local_path": "data/actors/.../filename.jpg",
  "index": 16,
  "type": "photorealistic",
  "generated_by": "balancer"
}
```

## 🧪 Testing Instructions

### **Dry Run Test (Safe)**
```bash
source activate.sh
python scripts/training_data/evaluate_and_balance.py \
  --actor-id 0001_european_20_female \
  --dry-run
```

### **Execute Test (Makes Changes)**
```bash
source activate.sh
python scripts/training_data/evaluate_and_balance.py \
  --actor-id 0001_european_20_female \
  --execute
```

### **What to Verify**

1. **Deletion Phase**:
   - Check logs show "✓ Deleted from S3"
   - Check logs show "✓ Deleted local file"
   - Verify files removed from `data/actors/{actor_id}/training_data/`
   - Verify manifest updated (total_images decreased)

2. **Generation Phase**:
   - Check logs show base image found and prepared
   - Check logs show descriptor (e.g., "woman")
   - Check logs show "Total available prompts: 35"
   - Check logs show prompt categories
   - Check logs show "Current max image number: X, starting at: Y"
   - Check logs show "✓ Generated and uploaded: {filename}"
   - Verify new files in `data/actors/{actor_id}/training_data/`
   - Verify S3 uploads successful
   - Verify manifest updated with new generation

3. **Sequential Numbering**:
   - Check new filenames follow pattern: `{actor_id}_{number}.jpg`
   - Verify numbers are sequential (no gaps or duplicates)
   - Verify numbers start after max existing number

4. **Prompt Selection**:
   - Verify correct number of each type generated
   - Check logs show which prompts were selected
   - Verify prompts match requested types

## 🔍 Verification Commands

```bash
# Check manifest
cat data/actor_manifests/0001_manifest.json | jq '.total_images'

# List training data files
ls -lh data/actors/0001_european_20_female/training_data/

# Check latest generation in manifest
cat data/actor_manifests/0001_manifest.json | jq '.generations[-1]'

# Count images by type in manifest
cat data/actor_manifests/0001_manifest.json | jq '.images | to_entries | group_by(.value.type) | map({type: .[0].value.type, count: length})'
```

## ⚠️ Important Notes

1. **Requires Environment Variables**:
   - `REPLICATE_API_TOKEN` - For image generation
   - `AWS_ACCESS_KEY`, `AWS_ACCESS_SECRET`, `AWS_REGION` - For S3 operations

2. **Cost Consideration**:
   - Each image generation costs Replicate API credits
   - Dry-run mode is FREE (no generation)
   - Execute mode will incur costs

3. **Time Estimate**:
   - Each image takes ~10-30 seconds to generate
   - Deleting 3 images: instant
   - Generating 7 images: ~2-5 minutes total

4. **Error Handling**:
   - If generation fails for one image, continues with next
   - Partial success is possible (e.g., 5/7 images generated)
   - Manifest only updated with successfully generated images
