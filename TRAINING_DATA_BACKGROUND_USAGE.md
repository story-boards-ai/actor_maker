# Training Data Generation - Background Mode

Generate training data in the background - **close your terminal and it keeps running!**

## Quick Usage

### Option 1: Simple Toggle (Recommended)

Edit the example script and set `run_in_background = True`:

```python
# examples/generate_actor_training_data_example.py

run_in_background = True  # ✅ Can close terminal
# run_in_background = False  # ❌ Must keep terminal open
```

Then run:
```bash
python examples/generate_actor_training_data_example.py
```

**You can now close the terminal!** The process continues running.

### Option 2: Programmatic Usage

```python
from src.training_data_background import BackgroundTrainingDataGenerator

# Generate actor training data in background
result = BackgroundTrainingDataGenerator.generate_actor_training_data(
    portrait_url="https://portrait.jpg",
    user_id="user_123",
    actor_id="actor_456",
    actor_type="human",
    actor_sex="male",
    run_in_background=True  # ✅ Background mode
)

# Or run synchronously (foreground)
result = BackgroundTrainingDataGenerator.generate_actor_training_data(
    portrait_url="https://portrait.jpg",
    user_id="user_123",
    actor_id="actor_456",
    run_in_background=False  # ❌ Foreground mode
)
```

### Option 3: Check Status

```python
from src.training_data_background import BackgroundTrainingDataGenerator

# Check if running
is_running = BackgroundTrainingDataGenerator.is_running("actor_456", "actor")
print(f"Running: {is_running}")

# Get detailed status
status = BackgroundTrainingDataGenerator.get_status("actor_456", "actor")
print(f"Status: {status['status']}")
print(f"Progress: {status['progress']}%")
print(f"Message: {status.get('message')}")

# Get results when complete
if status['status'] == 'completed':
    result = status['result']
    print(f"Generated {result['total_training_images']} images")
    for url in result['training_image_urls']:
        print(f"  - {url}")
```

## For Both Actor and Style Training

### Actor Training Data (12 images)

```python
from src.training_data_background import BackgroundTrainingDataGenerator

result = BackgroundTrainingDataGenerator.generate_actor_training_data(
    portrait_url="https://portrait.jpg",
    user_id="user_123",
    actor_id="actor_456",
    actor_type="human",
    actor_sex="male",
    run_in_background=True  # ✅ Background
)
```

### Style Training Data (20 images)

```python
from src.training_data_background import BackgroundTrainingDataGenerator

result = BackgroundTrainingDataGenerator.generate_style_training_data(
    source_image_url="https://style-example.jpg",
    user_id="user_123",
    style_id="style_789",
    run_in_background=True  # ✅ Background
)
```

## Status Files

Background tasks create status files in `status/` directory:

```bash
status/
├── actor_training_actor_456.json   # Actor training status
├── actor_training_actor_456.pid    # Process ID (while running)
└── style_training_style_789.json   # Style training status
```

**Example status file:**
```json
{
  "task_name": "actor_training_actor_456",
  "status": "running",
  "progress": 45,
  "message": "Generating image 6/12",
  "updated_at": "2025-10-16T12:45:30.123456",
  "pid": 12345
}
```

**When complete:**
```json
{
  "task_name": "actor_training_actor_456",
  "status": "completed",
  "progress": 100,
  "message": "Training data generation complete",
  "updated_at": "2025-10-16T12:50:15.123456",
  "result": {
    "training_image_urls": ["url1", "url2", ...],
    "total_training_images": 12,
    "target_training_images": 12
  }
}
```

## Integration Examples

### From Your Backend (Node.js/TypeScript)

Call the Python script with background mode:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateActorTrainingData(actorId: string, portraitUrl: string) {
  // Start background generation
  const command = `python examples/generate_actor_training_data_example.py`;
  
  // Set environment variables
  const env = {
    ...process.env,
    PORTRAIT_URL: portraitUrl,
    ACTOR_ID: actorId,
    RUN_IN_BACKGROUND: 'true'
  };
  
  await execAsync(command, { env });
  
  // Return immediately - process runs in background
  return { status: 'started', actorId };
}

// Check status later
async function checkTrainingDataStatus(actorId: string) {
  const statusFile = `status/actor_training_${actorId}.json`;
  const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
  return status;
}
```

### Webhook Notification (Optional)

Add webhook support to notify when complete:

```python
# In your task function
def task():
    result = generator.generate_training_data(...)
    
    # Notify webhook when complete
    import requests
    requests.post('https://your-backend/webhooks/training-data-complete', json={
        'actor_id': actor_id,
        'status': 'completed',
        'result': result
    })
    
    return result
```

## Comparison

| Mode | Can Close Terminal | Progress Tracking | Use Case |
|------|-------------------|-------------------|----------|
| **Background** (`run_in_background=True`) | ✅ Yes | ✅ Status files | Production, long-running |
| **Foreground** (`run_in_background=False`) | ❌ No | ✅ Terminal logs | Development, debugging |

## Best Practices

1. **Always use background mode in production**
2. **Check status files** to monitor progress
3. **Clean up old status files** periodically
4. **Use unique IDs** for each actor/style
5. **Set up webhooks** for completion notifications

---

**Now you can generate training data and close your terminal - it keeps running!** 🚀
