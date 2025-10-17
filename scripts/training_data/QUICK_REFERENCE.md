# Training Data Balancer - Quick Reference

## ✅ Implementation Status: COMPLETE

Both deletion and generation are fully implemented and ready to use.

## 🚀 Quick Start

### **1. Dry Run (Safe - No Changes)**
```bash
source activate.sh
python scripts/training_data/evaluate_and_balance.py --actor-id 0001_european_20_female --dry-run
```

### **2. Execute (Makes Changes)**
```bash
source activate.sh
python scripts/training_data/evaluate_and_balance.py --actor-id 0001_european_20_female --execute
```

### **3. Process All Actors**
```bash
source activate.sh
python scripts/training_data/evaluate_and_balance.py --all --execute
```

## 📋 What It Does

### **Deletion:**
- ✅ Deletes from S3
- ✅ Deletes local files
- ✅ Updates manifest

### **Generation:**
- ✅ Uses Replicate flux-kontext-pro
- ✅ Random prompts from `actor_training_prompts.py`
- ✅ Sequential numbering (continues from max existing number)
- ✅ Uploads to S3
- ✅ Saves local copies
- ✅ Updates manifest

## 🎯 Target Distribution

| Type | Target % | Count |
|------|----------|-------|
| Photorealistic | 65% | 13 images |
| B&W Stylized | 20% | 4 images |
| Color Stylized | 15% | 3 images |
| **Total** | **100%** | **20 images** |

## 📊 Example Output

```
Processing actor: 0001_european_20_female
Found 12 training images
Current distribution:
  Photorealistic: 8 (61.5%)
  B&W Stylized: 3 (23.1%)
  Color Stylized: 2 (15.4%)

⚠️  Actor needs balancing
  To delete: 3
  To generate: 7

[EXECUTE MODE]

Deleting 3 excess images...
  Deleting image 5 (photorealistic): 0001_european_20_female_5.png
    ✓ Deleted from S3
    ✓ Deleted local file
  Deleting image 4 (photorealistic): 0001_european_20_female_4.png
    ✓ Deleted from S3
    ✓ Deleted local file
  Deleting image 8 (color_stylized): 0001_european_20_female_8.png
    ✓ Deleted from S3
    ✓ Deleted local file

Generating 7 missing images...
Using base image: data/actors/0001_european_20_female/base_image/base.png
Using descriptor: 'woman' (type: human, sex: female)
Total available prompts: 35
Current max image number: 12, starting at: 13

Generating 5 photorealistic images...
  Generating image 13 (1/5)...
    ✓ Generated and uploaded: 0001_european_20_female_13.jpg
  Generating image 14 (2/5)...
    ✓ Generated and uploaded: 0001_european_20_female_14.jpg
  ...

Generating 1 bw_stylized images...
  Generating image 18 (1/1)...
    ✓ Generated and uploaded: 0001_european_20_female_18.jpg

Generating 1 color_stylized images...
  Generating image 19 (1/1)...
    ✓ Generated and uploaded: 0001_european_20_female_19.jpg

✓ Updated manifest with 7 new images
✓ Generation complete: 7/7 images generated

Final state:
  Total images: 20
  Photorealistic: 13 (65%)
  B&W Stylized: 4 (20%)
  Color Stylized: 3 (15%)
  ✅ Balanced!
```

## ⚙️ Environment Variables Required

```bash
REPLICATE_API_TOKEN=r8_...     # For image generation
AWS_ACCESS_KEY=...             # For S3 operations
AWS_ACCESS_SECRET=...          # For S3 operations
AWS_REGION=us-west-1           # For S3 operations
OPENAI_API_KEY=sk-...          # For GPT-4 Vision evaluation
```

## 💰 Cost Estimate

- **Dry Run**: FREE (no API calls)
- **Evaluation Only**: ~$0.01 per actor (GPT-4 Vision)
- **Full Execution**: ~$0.50-1.00 per actor (GPT-4 Vision + Replicate generation)

## ⏱️ Time Estimate

- **Evaluation**: ~10-15 seconds per actor
- **Deletion**: Instant
- **Generation**: ~10-30 seconds per image
- **Total for 7 images**: ~2-5 minutes

## 🔍 Verification

```bash
# Check manifest total
cat data/actor_manifests/0001_manifest.json | jq '.total_images'

# List training files
ls -lh data/actors/0001_european_20_female/training_data/

# Check latest generation
cat data/actor_manifests/0001_manifest.json | jq '.generations[-1]'
```

## ⚠️ Important Notes

1. **Always test with --dry-run first**
2. **Backup your data** before running --execute
3. **Check logs** for any errors
4. **Verify results** in manifest and file system
5. **Monitor costs** on Replicate dashboard
