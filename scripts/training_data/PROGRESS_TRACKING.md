# Progress Tracking Guide

The training data automation system now includes **automatic progress tracking** so you can start and stop processing at any time.

## 🎯 Key Features

- **Automatic saving** - Progress saved after each actor
- **Resume capability** - Continue from where you left off
- **Ctrl+C safe** - Interrupt anytime, progress is saved
- **Progress file** - Stored in `debug/training_data_evaluation/progress.json`

## 🚀 Usage

### Start Processing (Auto-Resume)
```bash
# Start processing all actors
python scripts/training_data/evaluate_and_balance.py --all --dry-run

# If interrupted (Ctrl+C), just run again - it will resume automatically
python scripts/training_data/evaluate_and_balance.py --all --dry-run
```

### Start Fresh (Ignore Previous Progress)
```bash
# Force start from beginning
python scripts/training_data/evaluate_and_balance.py --all --dry-run --no-resume
```

### Check Progress
```bash
# Show current progress without processing
python scripts/training_data/evaluate_and_balance.py --show-progress
```

**Output:**
```
======================================================================
PROGRESS SUMMARY
======================================================================
Started:     2025-10-17T14:15:23.456789
Last update: 2025-10-17T14:45:12.789012

Total:       289 actors
Completed:   45 (15.6%)
Failed:      2
Skipped:     0
Remaining:   242

Currently processing: 0046_european_25_female
======================================================================
```

### Reset Progress
```bash
# Clear all progress and start fresh next time
python scripts/training_data/evaluate_and_balance.py --reset-progress
```

## 📊 What Gets Tracked

The progress file (`progress.json`) contains:

```json
{
  "started_at": "2025-10-17T14:15:23.456789",
  "last_updated": "2025-10-17T14:45:12.789012",
  "total_count": 289,
  "completed_count": 45,
  "failed_count": 2,
  "skipped_count": 0,
  "completed_actors": [
    "0000",
    "0001",
    "0002",
    ...
  ],
  "failed_actors": [
    {
      "actor_id": "0023",
      "error": "Failed to download image",
      "timestamp": "2025-10-17T14:30:45.123456"
    }
  ],
  "skipped_actors": [],
  "current_actor": "0046"
}
```

## 🔄 Typical Workflow

### Day 1: Start Processing
```bash
# Start processing all 289 actors
python scripts/training_data/evaluate_and_balance.py --all --dry-run

# After 45 actors, you need to stop (Ctrl+C)
# Progress: 45/289 completed
```

### Day 2: Resume
```bash
# Continue from actor 46
python scripts/training_data/evaluate_and_balance.py --all --dry-run

# Output shows:
# "RESUMING FROM PREVIOUS PROGRESS"
# "Resuming with 244 remaining actors"
# "Overall progress: 15.6%"
```

### Day 3: Finish
```bash
# Continue again
python scripts/training_data/evaluate_and_balance.py --all --dry-run

# Eventually completes all 289 actors
# "FINAL SUMMARY"
# "Completed: 289 (100%)"
```

## 🛡️ Safety Features

### Automatic Saving
- Progress saved after **every actor** completes
- No data loss even if interrupted mid-processing
- Safe to Ctrl+C at any time

### Resume by Default
- Automatically resumes if previous progress exists
- No need to remember where you left off
- Skips already-completed actors

### Failed Actor Tracking
- Failed actors are logged with error messages
- Can review failures later
- Won't retry failed actors on resume (unless you reset)

### Graceful Interruption
```bash
# Press Ctrl+C anytime
^C
⚠️  Interrupted by user (Ctrl+C)
Progress has been saved. Run again with --resume to continue.

PROGRESS SUMMARY
======================================================================
Total:       289 actors
Completed:   45 (15.6%)
Failed:      2
Remaining:   242
======================================================================

✅ Gracefully stopped. Progress has been saved.
```

## 📋 Command Reference

| Command | Description |
|---------|-------------|
| `--all --dry-run` | Process all actors (auto-resume) |
| `--all --dry-run --no-resume` | Start fresh, ignore progress |
| `--show-progress` | Show current progress |
| `--reset-progress` | Clear all progress |
| `--all --execute` | Execute with progress tracking |

## 🎯 Use Cases

### Long-Running Batch Processing
```bash
# Process 289 actors over multiple sessions
python scripts/training_data/evaluate_and_balance.py --all --dry-run

# Can stop/start as many times as needed
# Progress is always preserved
```

### Testing Then Executing
```bash
# 1. Dry-run all actors (with resume)
python scripts/training_data/evaluate_and_balance.py --all --dry-run

# 2. Review results

# 3. Reset progress
python scripts/training_data/evaluate_and_balance.py --reset-progress

# 4. Execute for real (with resume)
python scripts/training_data/evaluate_and_balance.py --all --execute
```

### Selective Processing
```bash
# Process specific actor (no progress tracking)
python scripts/training_data/evaluate_and_balance.py --actor-id 0042 --dry-run

# Process all actors (with progress tracking)
python scripts/training_data/evaluate_and_balance.py --all --dry-run
```

## 🔍 Monitoring Progress

### During Processing
The script shows progress for each actor:
```
======================================================================
Processing actor 46/289: 0046_european_25_female
Overall progress: 15.9%
======================================================================
```

### After Completion
Final summary shows:
```
======================================================================
FINAL SUMMARY
======================================================================
Processed: 244 actors in this session
  Successful: 240
  Already balanced: 120
  Failed: 4

PROGRESS SUMMARY
======================================================================
Total:       289 actors
Completed:   289 (100.0%)
Failed:      4
Remaining:   0
======================================================================
```

## 💡 Tips

1. **Let it run** - Progress is saved automatically, safe to leave running
2. **Ctrl+C anytime** - Safe to interrupt, just resume later
3. **Check progress** - Use `--show-progress` to see status without processing
4. **Fresh start** - Use `--no-resume` when you want to reprocess everything
5. **Review failures** - Check `progress.json` for failed actors and errors

## 📁 Progress File Location

```
debug/training_data_evaluation/progress.json
```

This file is automatically created and updated. You can:
- **View it** - See detailed progress
- **Delete it** - Force fresh start next time
- **Backup it** - Save progress state
- **Share it** - Track progress across systems

## 🎉 Benefits

- ✅ **No lost work** - Progress always saved
- ✅ **Flexible scheduling** - Stop/start anytime
- ✅ **Long-running safe** - Process hundreds of actors over days
- ✅ **Error resilient** - Failed actors tracked, don't block progress
- ✅ **Transparent** - Always know where you are
- ✅ **Simple** - Just run the same command to resume
