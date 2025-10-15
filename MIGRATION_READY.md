# Character Migration System - Ready to Execute

## Summary

A complete migration system has been created to systematically copy character data from `wm-characters` to `actor_maker` with full metadata tracking.

## What's Been Created

### 1. Migration Script
**Location**: `scripts/migrate_characters_from_wm.py`

**Features**:
- ✅ Copies base images per character
- ✅ Copies scene/post frame images organized by scene and gender
- ✅ Generates detailed JSON manifests per actor
- ✅ Tracks file metadata (size, timestamps, MD5 hashes)
- ✅ Preserves original file creation/modification dates
- ✅ Dry-run mode for safe testing
- ✅ Progress tracking and error handling

### 2. Documentation
**Location**: `scripts/README_MIGRATION.md`

Complete guide with usage examples, manifest structure, and verification steps.

## Test Results (Dry Run)

Tested with 3 characters:
- ✅ **0000_european_16_male**: 279 files, 370.22 MB
- ✅ **0001_european_20_female**: 362 files, 470.34 MB  
- ✅ **0002_european_35_female**: 362 files, 469.99 MB

**Total**: 1,003 files, 1,310.55 MB

All manifests generated successfully with complete metadata.

## Manifest Data Included

Each actor manifest contains:

```json
{
  "character_id": "0000",
  "character_name": "0000_european_16_male",
  "metadata": {
    "age": "16",
    "sex": "male",
    "ethnicity": "european",
    "face_prompt": "...",
    "outfit": "..."
  },
  "base_images": [{
    "path": "...",
    "size_bytes": 1466125,
    "size_mb": 1.4,
    "created_date": "2025-05-10T17:55:08",
    "modified_date": "2025-05-10T21:35:38",
    "md5_hash": "83a07325d2a67b8a1415914ccd38cebc"
  }],
  "scene_images": [{
    "scene_name": "8 market",
    "path": "...",
    "size_mb": 1.92,
    "created_date": "2024-12-15T12:19:58",
    "md5_hash": "e79cbf8a7d80776d9457713ce4fd091e"
  }],
  "statistics": {
    "total_files": 279,
    "total_size_mb": 370.22,
    "base_images_count": 1,
    "scene_images_count": 278
  }
}
```

## Quick Start Commands

### 1. Test with 5 Characters (Recommended)
```bash
cd /Users/markusetter/projects/storyboards_ai/actor_maker
python3 scripts/migrate_characters_from_wm.py --dry-run --limit 5
```

### 2. Full Migration (All 262 Characters)
```bash
python3 scripts/migrate_characters_from_wm.py
```

### 3. Check Results
```bash
# View summary
cat data/actor_manifests/_migration_summary.json

# View specific actor manifest
cat data/actor_manifests/0000_manifest.json
```

## Expected Results (Full Migration)

Based on wm-characters structure:
- **Characters**: ~262 actors
- **Estimated Files**: ~100,000+ (base images + scene images)
- **Estimated Size**: ~100+ GB
- **Processing Time**: 10-30 minutes (depending on disk speed)

## Directory Structure After Migration

```
actor_maker/
├── data/
│   ├── actors/                          # Base images
│   │   ├── 0000_european_16_male/
│   │   │   └── base_image/
│   │   │       └── *.png
│   │   └── [262 character folders]
│   ├── scenes/                          # Scene images
│   │   ├── 0 hiking/
│   │   │   ├── male/
│   │   │   └── female/
│   │   └── [45+ scene folders]
│   └── actor_manifests/                 # Metadata
│       ├── 0000_manifest.json
│       ├── [262 manifest files]
│       └── _migration_summary.json
```

## Safety Features

- ✅ **Dry-run mode**: Test without copying files
- ✅ **Limit option**: Process subset of characters
- ✅ **Non-destructive**: Creates new directories, doesn't modify source
- ✅ **Resumable**: Can re-run to update/overwrite
- ✅ **Verification**: MD5 hashes for file integrity checks

## Next Steps

1. **Review the test results** in `data/actor_manifests/`
2. **Run with more characters** if satisfied: `--limit 10`
3. **Execute full migration** when ready (remove `--dry-run`)
4. **Verify results** using the summary and individual manifests

## Notes

- Scene images are shared across all characters of the same gender
- Each character manifest references all applicable scene images
- Original file timestamps are preserved
- The script is idempotent (safe to run multiple times)
