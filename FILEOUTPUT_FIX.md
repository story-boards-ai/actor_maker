# FileOutput Serialization Fix

## Issue
Training image generation was failing with error:
```
"Object of type FileOutput is not JSON serializable"
```

The debug response file was incomplete:
```json
{
  "timestamp": "2025-10-18T13:17:32.936627",
  "actor_id": "285",
  "actor_name": "0285_south_american_13_male",
  "generated_url": 
}
```

## Root Cause
The Replicate API returns a `FileOutput` object instead of a plain string URL. When the Python script tried to serialize this object to JSON for the debug response file, it failed because `FileOutput` objects are not JSON serializable.

The code was attempting to use the `FileOutput` object directly:
```python
result_url = output[0] if isinstance(output, list) else output
```

But `result_url` was still a `FileOutput` object, not a string.

## Solution
Modified `/home/markus/actor_maker/src/replicate_service.py` to properly extract the URL string from the `FileOutput` object:

```python
# Extract URL from output - handle FileOutput objects
if isinstance(output, list):
    result_url = output[0]
else:
    result_url = output

# Convert FileOutput to string URL if needed
if hasattr(result_url, 'url'):
    result_url = result_url.url
elif hasattr(result_url, '__str__'):
    result_url = str(result_url)
```

### How It Works:
1. **Check for `.url` attribute**: `FileOutput` objects have a `.url` property containing the actual URL string
2. **Fallback to string conversion**: If no `.url` attribute, convert the object to string
3. **Result**: `result_url` is now a plain string that can be:
   - Logged to console
   - Serialized to JSON
   - Used for downloading the image

## Impact
- ✅ Debug response files now save correctly with the URL
- ✅ Image generation completes successfully
- ✅ Images appear in the training data grid
- ✅ No more "Object of type FileOutput is not JSON serializable" errors

## Files Modified
- `/home/markus/actor_maker/src/replicate_service.py` (lines 90-100)

## Testing
After this fix, check:
1. Debug response file should be complete:
   ```bash
   cat debug/replicate_requests/replicate_response.json
   ```
   
2. Should contain a valid URL:
   ```json
   {
     "timestamp": "2025-10-18T13:17:32.936627",
     "actor_id": "285",
     "actor_name": "0285_south_american_13_male",
     "generated_url": "https://replicate.delivery/...",
     "success": true
   }
   ```

3. Generated image should appear in the training data grid
