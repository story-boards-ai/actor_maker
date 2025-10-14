# Quick Reference Card

## Installation
```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python test_setup.py  # Validate setup
```

## Basic Usage

### Import
```python
from runpod_router import generate_image
```

### Generate Image
```python
payload = {
    "input": {
        "workflow": workflow_dict,  # ComfyUI workflow
        "model_urls": [             # Optional LoRA models
            {"id": "model.safetensors", "url": "https://..."}
        ]
    }
}

result = generate_image(payload, mode="wizard", request_id="req-123")
```

### Handle Response
```python
if result and result["status"] == "COMPLETED":
    images = result["output"]["job_results"]["images"]
    for img in images:
        # img is base64 encoded string
        save_image(img)
elif result and result["status"] == "FAILED":
    error = result["output"].get("error", "Unknown")
    print(f"Failed: {error}")
else:
    print("Request failed (timeout/connection)")
```

## Environment Variables Quick Setup

```bash
# Minimum required
export RUNPOD_API_KEY="your_key"

# For pod support
export SB_SPOT_API_KEY="pod_key"
export POD_ENDPOINT="https://xxx-8000.proxy.runpod.net"

# For serverless
export RUNPOD_SERVER_100_ID="endpoint_id"
```

## Common Patterns

### With Pod Endpoint
```python
result = generate_image(
    payload,
    mode="wizard",
    pod_endpoint="https://xxx-8000.proxy.runpod.net"
)
```

### Force Serverless Only
```python
result = generate_image(payload, mode="wizard", force_serverless=True)
```

### Direct Serverless
```python
from runpod_serverless import generate_serverless_image
result = generate_serverless_image(payload, mode="wizard")
```

### Direct Pod
```python
from runpod_pod import generate_pod_image
result = generate_pod_image(endpoint, payload)
```

## Response Structure

```python
{
    "id": "job-id",
    "status": "COMPLETED",  # or FAILED, IN_PROGRESS, IN_QUEUE, CANCELLED
    "output": {
        "job_results": {
            "images": ["base64...", "base64..."]
        },
        "status": "success"
    }
}
```

## Status Codes

| Status | Meaning |
|--------|---------|
| `COMPLETED` | Success, images available |
| `FAILED` | Job failed, check error field |
| `IN_PROGRESS` | Still generating |
| `IN_QUEUE` | Waiting to start |
| `CANCELLED` | Job was cancelled |

## Modes

| Mode | Use Case | Endpoint Var |
|------|----------|--------------|
| `wizard` | Default generation | `RUNPOD_SERVER_100_ID` |
| `new_pre` | Fast Schnell generation | `RUNPOD_SERVER_SCHNELL_ID` |
| `posterFrameRegeneration` | Poster frames | `RUNPOD_SERVER_POSTER_ID` |

## Error Handling

```python
try:
    result = generate_image(payload, mode="wizard")
    
    if not result:
        # Network/timeout error
        handle_connection_error()
    elif result["status"] == "COMPLETED":
        # Success
        process_images(result["output"]["job_results"]["images"])
    elif result["status"] == "FAILED":
        # Job failed
        error = result["output"].get("error")
        handle_generation_error(error)
    else:
        # Unexpected status
        handle_unexpected_status(result["status"])
        
except Exception as e:
    # Exception during call
    handle_exception(e)
```

## Logging

```python
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

# Or specific loggers
logging.getLogger("runpod_router").setLevel(logging.DEBUG)
```

## Testing Setup

```bash
# Validate configuration
python test_setup.py

# Test with pod endpoint
POD_ENDPOINT=https://xxx.proxy.runpod.net python test_setup.py

# Run examples
python example_usage.py
```

## Configuration Classes

```python
from runpod_config import RunPodConfig

# Check what's configured
print(RunPodConfig.RUNPOD_API_KEY)
print(RunPodConfig.get_serverless_endpoint("wizard"))

# Validate config
RunPodConfig.validate()  # Raises if API key missing
```

## Timeouts

Default timeouts (override via env vars):
- Pod request: 600s (10 min)
- Serverless sync: 700s (~12 min)
- Polling interval: 1s
- Max polling: 180s (3 min)

Override:
```bash
export POD_TIMEOUT=300
export SYNC_TIMEOUT=400
export POLLING_INTERVAL=2.0
export MAX_POLLING_DURATION=240
```

## Troubleshooting

### "No endpoint available"
- Set `POD_ENDPOINT` or serverless endpoint IDs
- Check pod is running and healthy

### "API key required"
- Set `RUNPOD_API_KEY` environment variable

### Timeout errors
- Increase timeout values
- Check pod/serverless health
- Try force_serverless mode

### Pod not ready
- Wait for pod initialization
- Check pod logs
- Verify pod endpoint URL

## Files Reference

| File | Purpose |
|------|---------|
| `runpod_router.py` | Main entry point (recommended) |
| `runpod_serverless.py` | Serverless-only generation |
| `runpod_pod.py` | Pod-only generation |
| `runpod_config.py` | Configuration management |
| `example_usage.py` | Usage examples |
| `test_setup.py` | Setup validation |

## Getting Help

1. Check `README.md` for detailed docs
2. Run `python test_setup.py` for diagnostics
3. Review `example_usage.py` for patterns
4. Enable DEBUG logging
5. Check `IMPLEMENTATION_SUMMARY.md` for architecture
