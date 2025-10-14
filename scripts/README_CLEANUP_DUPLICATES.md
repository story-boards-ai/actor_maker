# Cleanup Duplicate Training Versions

## Problem

The `training_versions.json` files can contain duplicate entries for the same LoRA model due to two different writing mechanisms:
1. **Webhook handler** - Creates detailed entries when training completes
2. **S3 sync utility** - Creates minimal entries when syncing from S3

This results in the same model appearing twice with different IDs.

## Solution

### 1. Prevention (Already Fixed)
The S3 sync utility (`/ui/config/utils/s3-lora-sync.ts`) has been updated to:
- Match existing entries by loraUrl/filename instead of just ID
- Update existing entries instead of creating duplicates
- Preserve detailed parameters from webhook entries

### 2. Cleanup Existing Duplicates

Use the `cleanup_duplicate_versions.py` script to remove existing duplicates.

## Usage

### Dry Run (Recommended First)
See what would be removed without making changes:
```bash
python3 scripts/cleanup_duplicate_versions.py
```

### Apply Cleanup
Actually remove duplicates (creates backups):
```bash
python3 scripts/cleanup_duplicate_versions.py --apply
```

### Custom Base Directory
If running from a different location:
```bash
python3 scripts/cleanup_duplicate_versions.py --base-dir /path/to/actor_maker --apply
```

## What It Does

1. **Scans** all style folders in `resources/style_images/`
2. **Identifies** duplicates by matching loraUrl/filename
3. **Prioritizes** entries to keep:
   - ✅ Entries with detailed parameters (from webhook)
   - ✅ Entries with completedAt timestamp
   - ✅ Newer entries
4. **Removes** duplicate entries (keeps the best one)
5. **Creates backups** with `.backup` extension before modifying

## Example Output

```
================================================================================
Training Versions Cleanup Script
================================================================================

⚠️  DRY RUN MODE - No files will be modified
   Run with --apply to actually clean up duplicates

📁 Found 15 training_versions.json files

Processing: resources/style_images/1_ink_intensity/training_versions.json
  📊 Total versions: 8
  🔍 Found 2 versions for: style_1_vV7.safetensors
    ✅ Keeping: ID=3e248bb6-012c-4384-ae6c-4b19c126d093-e1, params=yes, name=V7
    ❌ Removing: ID=style_1_vV7, params=no, name=style_1_vV7.safetensors
  📝 Summary: 1 duplicate(s) will be removed

================================================================================
SUMMARY
================================================================================
Files processed: 15
Files with duplicates: 3
Total duplicates found: 5
Total duplicates removed: 5

💡 Run with --apply to actually remove duplicates
```

## Safety Features

- **Dry run by default** - Must explicitly use `--apply` to make changes
- **Automatic backups** - Original files saved with `.backup` extension
- **Smart prioritization** - Always keeps the most detailed entry
- **Detailed logging** - Shows exactly what will be kept/removed

## After Cleanup

Once duplicates are cleaned up, the S3 sync utility will no longer create new duplicates thanks to the updated matching logic.
