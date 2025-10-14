# Test Suite Quick Start Guide

## What Is It?

Run 20 diverse cinematic storyboard prompts automatically on your trained LoRA models. Get comprehensive results showing your model's capabilities across different genres and techniques.

## 5-Step Usage

### 1️⃣ Select Model
- Pick a **trained LoRA model** from the Validator dropdown
- Choose the matching **style**

### 2️⃣ Load Suite
- Click **"📂 Load"** in the Test Suite section
- Select **"Cinematic Scenes (20 prompts)"**

### 3️⃣ Optional: Adjust Settings
- Open **⚙️ Settings** to configure
- Or use saved defaults

### 4️⃣ Run
- Click **"🎬 Run Test Suite"**
- Wait 20-40 minutes (check logs for progress)

### 5️⃣ View Results
- Modal opens automatically when done
- Use **← →** arrows to browse
- All images saved to `resources/style_images/{style}/test_results/{timestamp}/`

## What Gets Tested

The 20 cinematic scene prompts cover:

- 🌙 **Noir** - Rain-soaked detective scenes
- 😱 **Horror** - Terror close-ups, dark hallways
- 🤠 **Western** - Desert landscapes, silhouettes
- 🔍 **Thriller** - Hacker workspaces, split focus shots
- 💕 **Romance** - Beach embraces, intimate moments
- 💥 **Action** - Superhero impacts, chase sequences, team walks
- 🎩 **Period** - Victorian libraries, formal dinners
- 🎬 **Drama** - Character isolation moments
- 🚀 **Sci-Fi** - Space exploration, zero gravity
- ⚔️ **Fantasy** - Epic warrior victories
- 🎸 **Music** - Concert performances
- 🏔️ **Adventure** - Survival scenes

Each tests different:
- Camera angles (POV, overhead, dutch, low angle)
- Framing (close-up, wide shot, medium shot)
- Lighting (dramatic, natural, backlighting)
- Composition (split diopter, depth, silhouettes)

## Results Include

For each of 20 images:
- ✅ High-quality generated image
- ✅ Original test prompt
- ✅ Full assembled prompt (with style frontpad/backpad)
- ✅ Seed value used
- ✅ Category badge
- ✅ Timestamp

Plus complete generation settings (steps, CFG, guidance, sampler, etc.)

## File Organization

```
resources/style_images/
└── your_style_id/
    └── test_results/
        └── cinematic-scenes-v1_2025-10-11T18-23-45Z/
            ├── result.json          ← Complete metadata
            ├── cs-01.jpg           ← Noir scene
            ├── cs-02.jpg           ← Horror scene  
            ├── cs-03.jpg           ← Western scene
            └── ...                  ← All 20 images
```

## Tips

### For Training
- Run test suite after each training iteration
- Compare result folders visually
- Track improvements over versions

### For Quality
- Lock seed for exact reproducibility
- Use consistent settings across runs
- Run 2-3 times to account for variance

### For Documentation
- Share result folders with clients
- Use as portfolio examples
- Show before/after training improvements

## Keyboard Shortcuts

When viewing results:
- **← →** - Navigate images
- **ESC** - Close modal
- **Click thumbnails** - Jump to image

## Common Issues

**Button disabled?**
- Must select style AND model first
- Can't run while generating single image
- Can't run multiple suites at once

**Taking too long?**
- Normal! 20 images = 20-40 minutes
- Check logs for progress
- Each image ~1-2 minutes

**Where are results?**
- `resources/style_images/{your-style}/test_results/`
- Look for timestamped folders
- result.json has all metadata

## Next Steps

1. ✅ Run your first test suite
2. ✅ Review results in modal
3. ✅ Identify strengths/weaknesses
4. ✅ Adjust training if needed
5. ✅ Run again and compare

Ready to validate your models systematically! 🎬
