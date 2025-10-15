# Character Migration from wm-characters to actor_maker

## Overview

The `migrate_characters_from_wm.py` script systematically copies character data from the `wm-characters` repository to `actor_maker` and generates detailed manifests for each actor.

## What It Does

1. **Copies Base Images**: Transfers character base images from `wm-characters/characters/{id}/base_image/` to `actor_maker/data/actors/{name}/base_image/`

2. **Copies Scene Images**: Transfers scene/post frame images from `wm-characters/images/{scene}/{gender}/` to `actor_maker/data/scenes/{scene}/{gender}/`

3. **Generates Manifests**: Creates a JSON manifest for each actor containing:
   - File paths (source and destination)
   - File sizes (bytes and MB)
   - Creation timestamps
   - Modification timestamps
   - MD5 file hashes
   - Character metadata (age, ethnicity, prompts, etc.)
   - Statistics (total files, total size)

## Directory Structure Created

```
actor_maker/
├── data/
│   ├── actors/                    # Base images per actor
│   │   ├── 0000_european_16_male/
│   │   │   └── base_image/
│   │   │       └── 0000_european_16_male_base.png
│   │   ├── 0001_european_20_female/
│   │   │   └── base_image/
│   │   └── ...
│   ├── scenes/                    # Scene images organized by scene and gender
│   │   ├── 41 firefighter/
│   │   │   ├── male/
│   │   │   └── female/
│   │   ├── 42 driving/
│   │   └── ...
│   └── actor_manifests/           # Manifest files
│       ├── 0000_manifest.json
│       ├── 0001_manifest.json
│       ├── ...
│       └── _migration_summary.json
```

## Usage

### Dry Run (Recommended First)

Test the migration without copying files:

```bash
cd /Users/markusetter/projects/storyboards_ai/actor_maker
python scripts/migrate_characters_from_wm.py --dry-run
```

### Test with Limited Characters

Process only the first 5 characters:

```bash
python scripts/migrate_characters_from_wm.py --dry-run --limit 5
```

### Full Migration

Copy all files and generate manifests:

```bash
python scripts/migrate_characters_from_wm.py
```

### Custom Paths

Specify custom source and target directories:

```bash
python scripts/migrate_characters_from_wm.py \
  --source /path/to/wm-characters \
  --target /path/to/actor_maker
```

## Manifest Structure

### Individual Actor Manifest (`{id}_manifest.json`)

```json
{
  "character_id": "0000",
  "character_name": "0000_european_16_male",
  "metadata": {
    "img": "0000_european_16_male.webp",
    "age": "16",
    "sex": "male",
    "ethnicity": "european",
    "face_prompt": "16 year old young man...",
    "id": "0000",
    "name": "0000_european_16_male",
    "outfit": "Casual high school attire..."
  },
  "migration_timestamp": "2025-10-15T07:10:00.000000",
  "base_images": [
    {
      "path": "/Users/.../wm-characters/characters/0000_european_16_male/base_image/0000_european_16_male_base.png",
      "relative_path": "characters/0000_european_16_male/base_image/0000_european_16_male_base.png",
      "size_bytes": 1466125,
      "size_mb": 1.4,
      "created_timestamp": 1728985200.0,
      "created_date": "2024-10-15T07:00:00",
      "modified_timestamp": 1728985200.0,
      "modified_date": "2024-10-15T07:00:00",
      "md5_hash": "abc123...",
      "copied_to": "/Users/.../actor_maker/data/actors/0000_european_16_male/base_image/0000_european_16_male_base.png",
      "copied_relative_path": "data/actors/0000_european_16_male/base_image/0000_european_16_male_base.png"
    }
  ],
  "scene_images": [
    {
      "path": "/Users/.../wm-characters/images/41 firefighter/male/image.jpg",
      "scene_name": "41 firefighter",
      "size_bytes": 87514,
      "size_mb": 0.08,
      "created_date": "2024-10-10T12:30:00",
      "modified_date": "2024-10-10T12:30:00",
      "md5_hash": "def456...",
      "copied_to": "/Users/.../actor_maker/data/scenes/41 firefighter/male/image.jpg"
    }
  ],
  "statistics": {
    "total_files": 15,
    "total_size_bytes": 2500000,
    "total_size_mb": 2.38,
    "base_images_count": 1,
    "scene_images_count": 14
  },
  "status": "success"
}
```

### Migration Summary (`_migration_summary.json`)

```json
{
  "migration_date": "2025-10-15T07:10:00.000000",
  "source_directory": "/Users/.../wm-characters",
  "target_directory": "/Users/.../actor_maker",
  "total_characters": 262,
  "total_files": 3500,
  "total_size_mb": 4500.5,
  "characters": [
    {
      "id": "0000",
      "name": "0000_european_16_male",
      "status": "success",
      "files": 15,
      "size_mb": 2.38
    }
  ]
}
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--source` | Path to wm-characters directory | `/Users/markusetter/projects/storyboards_ai/wm-characters` |
| `--target` | Path to actor_maker directory | `/Users/markusetter/projects/storyboards_ai/actor_maker` |
| `--dry-run` | Generate manifests without copying files | False |
| `--limit` | Limit number of characters to process | None (all) |

## Features

- **Metadata Preservation**: Preserves original file timestamps using `shutil.copy2()`
- **File Integrity**: Calculates MD5 hashes for verification
- **Gender-Aware**: Automatically matches scene images to character gender
- **Safe Execution**: Dry-run mode to preview without changes
- **Progress Tracking**: Console output shows processing status
- **Error Handling**: Continues processing if individual characters fail
- **Summary Statistics**: Generates overall migration summary

## Notes

- Scene images are shared across all characters of the same gender
- Each character gets references to all applicable scene images in their manifest
- The script creates all necessary directories automatically
- Existing files will be overwritten if the script runs multiple times
- File timestamps from the source are preserved in the copied files

## Verification

After migration, you can verify:

1. **File counts**: Check `_migration_summary.json` for totals
2. **Individual actors**: Review `{id}_manifest.json` files
3. **File integrity**: Compare MD5 hashes if needed
4. **Disk usage**: Check `total_size_mb` in manifests

## Example Output

```
Starting migration of 262 characters
Copy files: True
Source: /Users/markusetter/projects/storyboards_ai/wm-characters
Target: /Users/markusetter/projects/storyboards_ai/actor_maker

Processing character: 0000 - 0000_european_16_male
  Found 14 potential scene images for male
  Manifest saved: .../actor_manifests/0000_manifest.json

...

============================================================
Migration complete!
Total characters: 262
Total files: 3500
Total size: 4500.5 MB
Summary saved: .../actor_manifests/_migration_summary.json
============================================================
```
