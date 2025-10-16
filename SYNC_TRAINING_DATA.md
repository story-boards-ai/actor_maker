# Bulk Sync All Actor Training Data

Fast parallel download script to sync all actor training data from S3 to local storage.

## Quick Start

```bash
# Default settings (10 downloads/actor, 5 concurrent actors)
./sync_all_training_data.sh

# Custom settings (20 downloads/actor, 10 concurrent actors)
./sync_all_training_data.sh 20 10
```

## Features

✅ **Parallel Downloads** - Multiple images downloaded simultaneously per actor  
✅ **Concurrent Actors** - Process multiple actors at the same time  
✅ **Smart Skipping** - Skips already downloaded images  
✅ **Progress Tracking** - Real-time progress updates  
✅ **Error Handling** - Continues on errors, reports at end  
✅ **Speed Metrics** - Shows download speed and time taken

## Performance

**Default Settings:**
- 10 parallel downloads per actor
- 5 actors processed concurrently
- **~50 images/second** on good connection

**Aggressive Settings:**
```bash
./sync_all_training_data.sh 20 10
```
- 20 parallel downloads per actor
- 10 actors processed concurrently
- **~100+ images/second** on good connection

## Usage

### Basic Usage

```bash
# Sync all actors with default settings
./sync_all_training_data.sh
```

### Custom Parallelism

```bash
# Syntax: ./sync_all_training_data.sh [workers_per_actor] [concurrent_actors]

# Conservative (slower, safer)
./sync_all_training_data.sh 5 3

# Balanced (default)
./sync_all_training_data.sh 10 5

# Aggressive (faster, more network load)
./sync_all_training_data.sh 20 10

# Maximum (very fast, high network load)
./sync_all_training_data.sh 30 15
```

### Python Script Directly

```bash
# Default
python3 scripts/sync_all_actors_training_data.py

# Custom settings
python3 scripts/sync_all_actors_training_data.py 20 10
```

## What It Does

1. **Reads** `data/actorsData.json` to get all actors
2. **For each actor:**
   - Reads `data/actors/{actor_name}/training_data/response.json`
   - Extracts S3 URLs for training images
   - Downloads images in parallel to local storage
   - Skips already downloaded images
3. **Reports** total downloaded, skipped, failed, and time taken

## Output Example

```
🚀 Starting sync for 287 actors
⚙️  Settings: 10 downloads/actor, 5 concurrent actors

[1/287] ✅ 0001_european_25_male: 20 downloaded, 0 skipped
[2/287] ✅ 0002_european_35_female: 0 downloaded, 20 skipped
[3/287] ✅ 0003_european_20_female: 20 downloaded, 0 skipped
...
[287/287] ✅ 0287_asian_40_male: 20 downloaded, 0 skipped

============================================================
✅ Sync Complete!
📊 Total: 5740 downloaded, 0 skipped, 0 failed
⏱️  Time: 115.32 seconds
🚀 Speed: 49.8 images/sec
============================================================
```

## File Structure

After running, your local structure will be:

```
data/actors/
├── 0001_european_25_male/
│   └── training_data/
│       ├── response.json
│       ├── 0001_european_25_male_0.png
│       ├── 0001_european_25_male_1.png
│       └── ... (20 images total)
├── 0002_european_35_female/
│   └── training_data/
│       ├── response.json
│       ├── 0002_european_35_female_0.png
│       └── ...
└── ... (287 actors)
```

## Requirements

- Python 3.7+
- boto3 (AWS SDK)
- AWS credentials configured (`.env` file or AWS CLI)

## Troubleshooting

### "AWS credentials not configured"
Set credentials in `.env` file:
```bash
AWS_ACCESS_KEY=your_key
AWS_ACCESS_SECRET=your_secret
AWS_REGION=us-west-1
```

### "Connection timeout" or slow downloads
- Reduce parallelism: `./sync_all_training_data.sh 5 3`
- Check network connection
- Try again later

### "Some images failed"
- Script continues on errors
- Check error messages in output
- Re-run script (will skip successful downloads)

### Script hangs or crashes
- Reduce concurrent actors: `./sync_all_training_data.sh 10 3`
- Check available memory
- Reduce workers per actor

## Performance Tips

1. **Good Network:** Use aggressive settings (20/10)
2. **Slow Network:** Use conservative settings (5/3)
3. **Limited Memory:** Reduce concurrent actors
4. **Already Synced:** Script will skip existing files (very fast)

## Cleanup

To remove all downloaded training data:

```bash
# WARNING: This deletes all local training images!
find data/actors/*/training_data -name "*.png" -delete
```

## Notes

- **Safe to re-run** - Skips already downloaded images
- **Temporary script** - For bulk initial sync
- **Use UI for individual actors** - Better for ongoing management
- **Network intensive** - May use significant bandwidth

## Estimated Time

**For 287 actors × 20 images = 5,740 images:**

| Settings | Speed | Time |
|----------|-------|------|
| Conservative (5/3) | ~25 img/s | ~4 minutes |
| Balanced (10/5) | ~50 img/s | ~2 minutes |
| Aggressive (20/10) | ~100 img/s | ~1 minute |

*Actual speed depends on network connection and S3 performance*

## After Syncing

Once synced, you can:
- View training images in the UI (📸 Training Data button)
- Use images for local training
- Upload modified images back to S3
- Delete individual images as needed

---

**Happy syncing! 🚀**
