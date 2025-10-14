# Filename Normalization Script

## Overview
This script normalizes filenames in your style image directories by:
- Converting all letters to **lowercase**
- Replacing **spaces** with **underscores**
- Removing **special characters** (parentheses, etc.)
- Handling **URL encoding** (e.g., `%20` → space → underscore)
- Preserving file extensions

## Usage

### 1. Dry-Run Mode (Preview Changes)
See what would be changed without actually renaming files:

```bash
# Preview changes for all style directories
python scripts/normalize_filenames.py

# Preview changes for a specific style directory
python scripts/normalize_filenames.py --style 16_dynamic_simplicity
```

### 2. Execute Mode (Actually Rename Files)
Apply the changes:

```bash
# Rename files in all style directories
python scripts/normalize_filenames.py --execute

# Rename files in a specific style directory
python scripts/normalize_filenames.py --execute --style 16_dynamic_simplicity
```

## Examples

### Before → After
- `A Boy and a Girl_scene_1_shot_1 (1).jpg` → `a_boy_and_a_girl_scene_1_shot_1_1.jpg`
- `ABANDONED VILLA EXPLORATION_scene_1_shot_10.jpg` → `abandoned_villa_exploration_scene_1_shot_10.jpg`
- `The Lost Pouch_scene_3_shot_2.jpeg` → `the_lost_pouch_scene_3_shot_2.jpeg`
- `A%20Boy%20and%20a%20Girl_scene_1_shot_1%20(1).txt` → `a_boy_and_a_girl_scene_1_shot_1_1.txt`

## Safety Features

1. **Dry-run by default**: Always previews changes first
2. **Conflict detection**: Won't overwrite existing files
3. **Change log**: Creates a log file when executing (saved to `logs/` directory)
4. **Error handling**: Reports any issues without stopping the entire process

## Recommended Workflow

1. **Preview first**:
   ```bash
   python scripts/normalize_filenames.py
   ```

2. **Review the output** to ensure changes look correct

3. **Execute for all styles**:
   ```bash
   python scripts/normalize_filenames.py --execute
   ```

4. **Check the log** in `logs/filename_normalization_YYYYMMDD_HHMMSS.log`

## Notes

- The script processes all subdirectories in `resources/style_images/`
- Files that are already normalized will be skipped (status: "unchanged")
- If a conflict is detected (target filename already exists), the file will be skipped
- A detailed log is created when using `--execute` mode
