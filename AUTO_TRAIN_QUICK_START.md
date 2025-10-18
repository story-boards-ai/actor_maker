# Auto Train Actors - Quick Start

## TL;DR

Train actors automatically that have good training data but no validated models yet.

```bash
# 1. Start dev server
cd ui && npm run dev

# 2. Run script (in another terminal)
python3 scripts/auto_train_actors.py
```

## What It Does

1. ✅ Finds actors with:
   - Training data marked as "good"
   - No custom model marked as "good"
   - Training data synced to S3

2. 🚀 Starts ngrok once (reuses for all trainings)

3. 🎯 Trains up to 2 actors consecutively with optimal parameters

4. 📊 Monitors training until completion

5. ✅ Saves successful models to manifests automatically

## Prerequisites

- Vite dev server running (`cd ui && npm run dev`)
- `.env` file configured with:
  - `RUNPOD_API_KEY`
  - `AWS_ACCESS_KEY` / `AWS_ACCESS_SECRET`
  - `NGROK_AUTHTOKEN`

## From UI (Easiest)

1. Go to **Scripts** tab
2. Find "Auto Train Actors" (Training Data category)
3. Click **Run Script**
4. Confirm

## From Command Line

```bash
python3 scripts/auto_train_actors.py
```

## Training Parameters (Auto-Calculated)

| Training Images | Steps | Learning Rate | Repeats |
|----------------|-------|---------------|---------|
| 10-15 images   | 1,500 | 2e-4          | 2       |
| 16-30 images   | 2,000 | 2.5e-4        | 2       |
| 31-60 images   | 2,500 | 1.5e-4        | 1       |
| 60+ images     | 3,000 | 1e-4          | 1       |

All use: Rank 16/8, Cosine scheduler, AdamW 8-bit, BF16

## Expected Duration

- **~2-3 minutes per 100 steps**
- 1,500 steps ≈ 30-45 minutes
- 2,000 steps ≈ 40-60 minutes
- 2,500 steps ≈ 50-75 minutes

## After Training

1. Models automatically saved to manifests
2. Available in **Actor Training** tab (History)
3. Test in **Validator** tab
4. Mark as "good" if validated

## Troubleshooting

**"Make sure Vite dev server is running"**
→ Start: `cd ui && npm run dev`

**"No eligible actors found"**
→ Mark training data as "good" in Actor Library

**Script hangs at "Monitoring"**
→ Normal! Training takes 30-60 minutes

## Configuration

Edit `scripts/auto_train_actors.py`:

```python
MAX_CONCURRENT_TRAININGS = 2  # Change to train more/fewer actors
```

## Full Documentation

See [AUTO_TRAIN_ACTORS.md](AUTO_TRAIN_ACTORS.md) for complete details.
