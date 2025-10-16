# Background Actor Training Data Generation

Run actor training data generation in the background - **close your terminal/tab and it keeps running!**

## Quick Start

### 1. Start Background Generation

```bash
python generate_actor_training_data_bg.py \
  --portrait-url "https://your-portrait.jpg" \
  --user-id "user_123" \
  --actor-id "actor_456" \
  --actor-type "human" \
  --actor-sex "male"
```

**You can now close the terminal/tab!** The process continues running in the background.

### 2. Check Status

```bash
python generate_actor_training_data_bg.py --status actor_456
```

**Output:**
```
================================================================================
ACTOR TRAINING STATUS: actor_456
================================================================================
Status: running
Progress: 45%
Updated: 2025-10-16T12:45:30.123456
Message: Generating image 6/12

Total Images: 5
Target Images: 12
================================================================================
```

### 3. View Results

When complete, check the status file:
```bash
cat status/actor_training_actor_456.json
```

**Example output:**
```json
{
  "task_name": "actor_training_actor_456",
  "status": "completed",
  "updated_at": "2025-10-16T12:50:15.123456",
  "pid": 12345,
  "progress": 100,
  "message": "Training data generation complete",
  "result": {
    "training_image_urls": [
      "https://s3.amazonaws.com/bucket/user_123/custom-actors/actor_456/training_data/actor_456_td_01.jpg",
      "https://s3.amazonaws.com/bucket/user_123/custom-actors/actor_456/training_data/actor_456_td_02.jpg",
      ...
    ],
    "total_training_images": 12,
    "target_training_images": 12
  }
}
```

## Features

✅ **Runs independently** - Close terminal, shut down laptop, it keeps running
✅ **Progress tracking** - Check status anytime with `--status`
✅ **Error handling** - Failures are logged with details
✅ **Status files** - JSON status files in `status/` directory
✅ **Detailed logs** - All output in `logs/actor_training_bg.log`
✅ **Debug images** - Saved to `debug/actor_training_data/<actor_id>/`

## How It Works

### Process Lifecycle

1. **Start**: Script starts background task and writes PID file
2. **Detach**: Process detaches from terminal (uses `atexit` and signal handlers)
3. **Run**: Generates 12 training images with progress updates
4. **Track**: Updates `status/<task_name>.json` continuously
5. **Complete**: Writes final results to status file
6. **Cleanup**: Removes PID file on exit

### Status File States

- **`running`**: Task is currently executing
- **`completed`**: Task finished successfully
- **`failed`**: Task encountered an error
- **`cancelled`**: Task was manually cancelled

## Usage Examples

### Basic Usage

```bash
# Start generation
python generate_actor_training_data_bg.py \
  --portrait-url "https://portrait.jpg" \
  --user-id "user_123" \
  --actor-id "actor_456"

# Check status
python generate_actor_training_data_bg.py --status actor_456
```

### With Actor Type

```bash
# Generate for a creature
python generate_actor_training_data_bg.py \
  --portrait-url "https://creature-portrait.jpg" \
  --user-id "user_123" \
  --actor-id "creature_789" \
  --actor-type "creature"
```

### Female Character

```bash
python generate_actor_training_data_bg.py \
  --portrait-url "https://female-portrait.jpg" \
  --user-id "user_123" \
  --actor-id "actor_999" \
  --actor-type "human" \
  --actor-sex "female"
```

## Monitoring

### Watch Status in Real-Time

```bash
# Linux/Mac
watch -n 5 "python generate_actor_training_data_bg.py --status actor_456"

# Or manually check every few seconds
while true; do 
  python generate_actor_training_data_bg.py --status actor_456
  sleep 5
done
```

### View Live Logs

```bash
tail -f logs/actor_training_bg.log
```

### Check All Running Tasks

```bash
ls -la status/*.json
```

## Troubleshooting

### Task Already Running

```
Training data generation already running for actor: actor_456
Check status with: python generate_actor_training_data_bg.py --status actor_456
```

**Solution**: Wait for current task to complete or check status

### Task Failed

```bash
# Check status for error details
python generate_actor_training_data_bg.py --status actor_456

# Check logs
tail -100 logs/actor_training_bg.log
```

### Clean Up Stale Status Files

```bash
# Remove old status files
rm status/actor_training_*.json

# Remove old PID files
rm status/actor_training_*.pid
```

## Integration with Training Pipeline

### After Generation Completes

```python
import json
from pathlib import Path

# Read status file
status_file = Path("status/actor_training_actor_456.json")
status = json.loads(status_file.read_text())

if status["status"] == "completed":
    result = status["result"]
    training_image_urls = result["training_image_urls"]
    
    # Use these URLs for LoRA training
    print(f"Ready to train with {len(training_image_urls)} images")
```

### Automated Workflow

```bash
#!/bin/bash

ACTOR_ID="actor_456"

# Start generation
python generate_actor_training_data_bg.py \
  --portrait-url "https://portrait.jpg" \
  --user-id "user_123" \
  --actor-id "$ACTOR_ID" \
  --actor-type "human" \
  --actor-sex "male"

# Wait for completion
while true; do
  STATUS=$(python generate_actor_training_data_bg.py --status "$ACTOR_ID" | grep "Status:" | awk '{print $2}')
  
  if [ "$STATUS" = "completed" ]; then
    echo "Training data generation completed!"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Training data generation failed!"
    exit 1
  fi
  
  sleep 10
done

# Start LoRA training with generated images
# ... your training code here ...
```

## File Structure

```
actor_maker/
├── generate_actor_training_data_bg.py  # Main background script
├── src/
│   ├── background_runner.py            # Background task runner
│   └── actor_training_data_generator.py
├── logs/
│   └── actor_training_bg.log           # All logs
├── status/
│   ├── actor_training_actor_456.json   # Status file
│   └── actor_training_actor_456.pid    # PID file (while running)
└── debug/
    └── actor_training_data/
        └── actor_456/                   # Debug images
            ├── training_data_output_1.jpg
            ├── training_data_output_2.jpg
            └── training_data_grid.jpg
```

## Comparison: Background vs Foreground

| Feature | Background Script | Foreground Script |
|---------|------------------|-------------------|
| **Close terminal** | ✅ Keeps running | ❌ Stops |
| **Progress tracking** | ✅ Status files | ❌ Terminal only |
| **Multiple tasks** | ✅ Run many at once | ❌ One at a time |
| **Error recovery** | ✅ Logged to file | ❌ Lost if terminal closed |
| **Integration** | ✅ Easy to automate | ⚠️ Requires terminal |

## Best Practices

1. **Always check status** before starting a new task for the same actor
2. **Monitor logs** for the first few runs to ensure everything works
3. **Clean up old status files** periodically
4. **Use unique actor IDs** to avoid conflicts
5. **Set up log rotation** for production use

## Advanced: Running on Server

### Using nohup (Alternative)

```bash
nohup python examples/generate_actor_training_data_example.py > logs/actor_456.log 2>&1 &
```

### Using screen (Alternative)

```bash
screen -dmS actor_456 python examples/generate_actor_training_data_example.py
```

### Using systemd (Production)

Create `/etc/systemd/system/actor-training@.service`:
```ini
[Unit]
Description=Actor Training Data Generation for %i

[Service]
Type=simple
WorkingDirectory=/path/to/actor_maker
ExecStart=/usr/bin/python3 generate_actor_training_data_bg.py --actor-id %i ...
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Support

For issues:
1. Check `logs/actor_training_bg.log`
2. Check `status/<task_name>.json`
3. Verify environment variables are set
4. Ensure Replicate API token is valid

---

**The background generation system allows you to close your terminal/tab and continue with other work while training data is being generated!** 🚀
