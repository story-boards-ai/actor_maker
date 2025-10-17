# Python Virtual Environment Execution

## Problem

When the Node.js backend spawns Python scripts using `spawn('python3', ...)`, it uses the system Python instead of the project's virtual environment Python. This causes `ModuleNotFoundError` for packages installed in the venv.

## Solution

All backend handlers now check for the venv Python and use it if available:

```typescript
// Use venv Python if available, fallback to python3
const pythonPath = path.join(projectRoot, 'venv', 'bin', 'python');
const pythonCmd = require('fs').existsSync(pythonPath) ? pythonPath : 'python3';

const pythonProcess = spawn(pythonCmd, args);
```

## Files Updated

### Image Generation Handlers
**File**: `/ui/config/routes/actors/image-generation.handlers.ts`

Updated functions:
- `handleGenerateAllPromptImages` - Uses venv Python
- `handleGenerateSingleTrainingImage` - Uses venv Python
- `handleRegeneratePosterFrame` - Uses venv Python

### Training Data Handlers
**File**: `/ui/config/routes/actors/training-data.handlers.ts`

Updated functions:
- `handleDeleteTrainingImage` - Uses venv Python
- `handleDeleteAllTrainingData` - Uses venv Python

## How It Works

1. **Check for venv**: Looks for `venv/bin/python` in project root
2. **Use venv if exists**: If found, uses venv Python with all installed packages
3. **Fallback to system**: If venv not found, falls back to `python3` (system Python)
4. **Logging**: Logs which Python is being used for debugging

## Benefits

✅ **Correct Dependencies**: Uses packages installed in venv  
✅ **Consistent Environment**: Same Python environment as development  
✅ **Graceful Fallback**: Works even if venv not present  
✅ **Debugging**: Logs Python path for troubleshooting  

## Virtual Environment Setup

If you need to recreate the venv:

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Or use the convenience script:

```bash
source activate.sh
```

## Verification

To verify the correct Python is being used, check the logs:

```
[Generate Single] Using Python: /Users/markusetter/projects/storyboards_ai/actor_maker/venv/bin/python
```

If you see this, the venv Python is being used correctly.

## Common Issues

### Issue: "ModuleNotFoundError: No module named 'replicate'"

**Cause**: System Python being used instead of venv Python

**Solution**: 
1. Verify venv exists: `ls venv/bin/python`
2. Check venv has packages: `venv/bin/pip list`
3. Reinstall if needed: `venv/bin/pip install -r requirements.txt`

### Issue: "venv/bin/python not found"

**Cause**: Virtual environment not created

**Solution**:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Still using system Python

**Cause**: Code not updated or server not restarted

**Solution**:
1. Verify handlers have venv check code
2. Restart the Node.js server
3. Check logs for "Using Python:" message

## Platform Differences

### macOS/Linux
```
venv/bin/python
```

### Windows
```
venv\Scripts\python.exe
```

The current implementation is for macOS/Linux. For Windows support, add:

```typescript
const pythonPath = process.platform === 'win32'
  ? path.join(projectRoot, 'venv', 'Scripts', 'python.exe')
  : path.join(projectRoot, 'venv', 'bin', 'python');
```

## Testing

Test that venv Python is being used:

```bash
# Start the server
npm run dev

# Trigger image generation from UI
# Check logs for:
[Generate Single] Using Python: /path/to/venv/bin/python

# Verify it works without errors
```

## Related Files

- `/activate.sh` - Convenience script to activate venv
- `/requirements.txt` - Python dependencies
- `/Makefile` - Has `make venv` and `make setup` targets
- `/venv/` - Virtual environment directory (gitignored)
