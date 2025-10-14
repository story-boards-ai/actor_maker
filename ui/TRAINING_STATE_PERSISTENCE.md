# Training State Persistence

## Overview

The LoRA training tab now features **automatic state persistence** using browser localStorage. This allows you to:

- ✅ **Switch between multiple style training tabs** without losing progress
- ✅ **Close and reopen style tabs** - your training state is preserved
- ✅ **Navigate to other pages** and come back without interruption
- ✅ **Run multiple trainings simultaneously** in different tabs
- ✅ **Auto-resume monitoring** when you return to a training in progress

## What Gets Persisted

Each style has its own isolated storage namespace. The following state is automatically saved:

### Training State
- **Current Training**: Active training job ID, start time, estimated duration, status
- **Console Logs**: All training logs and messages
- **Training Versions**: Training history is saved to files

### Configuration
- **Selected Dataset**: Your selected training dataset (selection set)
- **Training Parameters**: All hyperparameters (learning rate, steps, network dim, etc.)
- **Training Description**: The description text for your current training
- **UI State**: Active tab (console vs history), advanced settings visibility

## How It Works

### Automatic Saving
Every time you make a change, it's automatically saved to localStorage:
- Change a parameter → Saved instantly
- Start a training → State saved
- Logs added → Saved in real-time

### Automatic Loading
When you open a style's training tab:
- Previous state is restored from localStorage
- If a training was in progress, you'll see a notification
- Auto-polling starts to check training status

### Auto-Polling
When a training is active:
- **Every 30 seconds**: Automatically checks training status with RunPod
- **On tab reopen**: Immediately checks status when you return
- **Updates automatically**: Logs, status, and completion are tracked

## Usage Examples

### Example 1: Multiple Concurrent Trainings
```
1. Open Style 100 → Start training (1000 steps)
2. Switch to Style 101 → Start training (800 steps)
3. Switch to Style 102 → Start training (1200 steps)
4. Go to any tab → See current progress
5. All trainings continue independently
```

### Example 2: Close and Resume
```
1. Start training for Style 100
2. Close the browser tab
3. Open a new tab and navigate to Style 100
4. Training state restored automatically
5. Continue monitoring from where you left off
```

### Example 3: Navigate Away
```
1. Start training
2. Go to caption editor or S3 manager
3. Return to training tab
4. State is preserved, polling continues
```

## Storage Keys

Each style uses unique localStorage keys in the format:
```
training_{styleId}_selectedSetId
training_{styleId}_parameters
training_{styleId}_currentTraining
training_{styleId}_consoleLogs
training_{styleId}_activeTab
training_{styleId}_description
training_{styleId}_showAdvanced
```

## Clear Stored State

If you need to reset everything for a style:

1. Open the **Console** tab
2. Click the **"Reset State"** button (top right)
3. Refresh the page

This clears all stored state for that specific style.

## Technical Details

### Storage Limits
- localStorage has ~5-10MB limit per domain
- Console logs are capped to prevent overflow
- Old training history is managed via file system

### Polling Mechanism
```typescript
// Polls every 30 seconds when training is active
if (currentTraining.status === 'training') {
  setInterval(() => pollTrainingStatus(), 30000);
}

// Initial check 2 seconds after mount
setTimeout(() => pollTrainingStatus(), 2000);
```

### Version Updates
When training completes (via webhook or polling):
- Training versions file is updated
- localStorage is updated with completion status
- Toast notification shown

## Browser Compatibility

Works in all modern browsers that support localStorage:
- Chrome/Edge ✅
- Firefox ✅
- Safari ✅
- Opera ✅

## Privacy & Data

- **Local only**: All data stored in your browser's localStorage
- **Per-domain**: Isolated to your development server
- **No cloud sync**: Data doesn't leave your machine
- **Easy clear**: Use "Reset State" button or clear browser data

## Troubleshooting

### Training state not restored?
1. Check browser console for localStorage errors
2. Verify localStorage is enabled in browser settings
3. Try the "Reset State" button and restart training

### Multiple trainings interfering?
- Each style has isolated storage - they shouldn't interfere
- If issues persist, try "Reset State" on affected styles

### State corruption?
- Use "Reset State" button to clear corrupted data
- Refresh the page to start fresh

## Benefits Summary

✅ **No more lost progress** when switching tabs  
✅ **Multi-task efficiently** with multiple trainings  
✅ **Uninterrupted workflow** - navigate freely without worry  
✅ **Automatic recovery** - training state survives browser restarts  
✅ **Per-style isolation** - each training is independent  
✅ **Auto-polling** - no manual status checking needed
