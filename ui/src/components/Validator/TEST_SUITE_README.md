# Test Suite System for Validator

## Overview

The test suite system allows you to run comprehensive batch tests on trained LoRA models using predefined sets of prompts. This is essential for:

- **Quality assurance**: Validate model performance across diverse scenarios
- **Comparison**: Compare different training versions side-by-side
- **Documentation**: Create visual galleries of model capabilities
- **Regression testing**: Ensure new training doesn't degrade existing capabilities

## Features

### 🎬 20 Cinematic Scene Prompts

The default "Cinematic Scenes" test suite includes 20 carefully crafted storyboard prompts covering:

- **Noir scenes** (detective in rain-soaked alley)
- **Horror moments** (close-up terror reactions)
- **Western landscapes** (lone figure in desert)
- **Thriller sequences** (hacker workspaces, split focus)
- **Romance** (moonlit beach embraces)
- **Action** (superhero impacts, chase sequences, team walks)
- **Period dramas** (Victorian libraries, formal dinners)
- **Sci-fi** (space exploration, zero gravity)
- **Fantasy** (warrior victories)
- **And more...**

Each prompt is designed to test different cinematographic techniques (angles, framing, lighting, composition).

### 📊 Automated Batch Processing

- Generates all 20 images sequentially with your current settings
- Progress tracking with live counter
- Automatic local storage of results
- Comprehensive metadata logging

### 🖼️ Beautiful Results Viewer

- **Modal interface** with large image preview
- **Thumbnail grid** for quick navigation
- **Keyboard controls** (← → arrows, ESC to close)
- **Detailed metadata** for each image:
  - Category badge (color-coded by genre)
  - Original test prompt
  - Full assembled prompt (with frontpad/backpad)
  - Seed value
  - Generation timestamp
- **Settings summary** (expandable footer with all generation parameters)

### 💾 Organized File Storage

Results are saved to:
```
resources/style_images/{styleId}/test_results/{resultId}/
  ├── result.json          # Complete metadata
  ├── cs-01.jpg           # Test image 1
  ├── cs-02.jpg           # Test image 2
  └── ...                 # All 20 images
```

Result ID format: `{suiteId}_{timestamp}`  
Example: `cinematic-scenes-v1_2025-10-11T18-23-45Z`

## How to Use

### 1. Select Your Model

- Choose a **Style** from the style selector
- Choose a **Trained LoRA Model** from the dropdown
- Configure your generation settings (or use saved defaults)

### 2. Load Test Suites

- Click the **"📂 Load"** button in the Test Suite section
- The available test suites will load (currently: "Cinematic Scenes")

### 3. Select a Test Suite

- Choose from the dropdown (shows: `Suite Name (20 prompts)`)
- Read the description to understand what it tests

### 4. Run the Suite

- Click **"🎬 Run Test Suite"**
- Watch the progress bar as images generate (may take 20-40 minutes)
- Check the logs for detailed progress
- Single images still work - test suite runs are independent

### 5. View Results

- Results modal opens automatically when complete
- **Navigate**: Use left/right arrows or click thumbnails
- **Inspect**: View prompts, settings, metadata
- **Export**: Images are already saved locally in the style folder

## Creating Custom Test Suites

### Test Suite JSON Format

Create a new file in `/ui/test-suites/{your-suite-name}.json`:

```json
{
  "id": "your-suite-id",
  "name": "Your Suite Name",
  "description": "What this suite tests",
  "version": "1.0",
  "prompts": [
    {
      "id": "test-01",
      "prompt": "Your test prompt here",
      "category": "genre-name",
      "description": "What this tests"
    }
  ]
}
```

### Prompt Design Tips

1. **Be specific**: Include camera angles, lighting, composition details
2. **Vary complexity**: Mix simple and complex scenes
3. **Test edge cases**: Unusual angles, difficult lighting, multiple subjects
4. **Cover use cases**: Include scenarios relevant to your style
5. **Keep consistent**: Use similar structure across prompts for fair comparison

### Category Colors

Available category badges:
- `noir`, `horror`, `western`, `thriller`, `romance`, `action`
- `period`, `drama`, `family`, `sci-fi`, `espionage`, `fantasy`
- `music`, `adventure`

Each has a distinct color scheme in the results viewer.

## Technical Details

### API Endpoints

Two backend routes handle file storage:

**POST /api/save-test-image**
- Downloads image from RunPod URL
- Saves to local filesystem
- Returns local path for results

**POST /api/save-test-result**
- Saves complete test metadata as JSON
- Includes all settings, prompts, and image references

### Image Generation Flow

1. Load test suite prompts
2. For each prompt:
   - Use current settings (steps, CFG, guidance, etc.)
   - Generate seed (random if unlocked, fixed if locked)
   - Build full prompt (trigger + frontpad + test prompt + backpad)
   - Call generation API
   - Download and save result
   - Add 1 second delay between requests
3. Compile results into TestSuiteResult object
4. Save all images and metadata
5. Display results modal

### Performance Notes

- **Generation time**: ~1-2 minutes per image = 20-40 minutes total
- **Storage**: ~20-40 MB per test suite (depending on resolution)
- **Network**: Downloads all images from RunPod to local storage
- **Blocking**: UI remains responsive; you can't run another test while one is active

## Best Practices

### For Model Training

1. **Baseline test**: Run test suite on first training version
2. **After changes**: Run after each significant training iteration
3. **Compare results**: Visual side-by-side comparison of result folders
4. **Document progress**: Keep test results to track improvements

### For Quality Assurance

1. **Consistent settings**: Use same settings across test runs for fair comparison
2. **Locked seeds**: Consider locking seed for exact reproducibility
3. **Multiple runs**: Run 2-3 times to account for randomness
4. **Category analysis**: Check if certain categories consistently fail

### For Documentation

1. **Share results**: Results folder is perfect for showcasing model capabilities
2. **Portfolio**: Use results for client presentations
3. **Training examples**: Show before/after training improvements

## Troubleshooting

### Test suite won't load
- Ensure JSON file is in `/ui/test-suites/` directory
- Check JSON syntax validity
- Verify file is served by dev server

### Generation fails mid-suite
- Check logs for specific error
- Verify RunPod endpoint is available
- Check credit/quota limits
- Test with single image first

### Images not saving locally
- Check file permissions on `resources/style_images/` directory
- Verify backend API routes are configured
- Check disk space availability

### Modal won't display images
- Check browser console for path errors
- Verify images were actually saved
- Check network tab for 404s

## Future Enhancements

Potential additions (not yet implemented):

- **Multiple test suites**: Character portraits, landscape scenes, action sequences
- **Comparison mode**: Side-by-side view of two test results
- **Export reports**: PDF generation with all results
- **Filtering**: View only specific categories
- **Ratings**: Add quality ratings to each result
- **A/B testing**: Automated comparison of parameter variations

## Example Workflow

```
1. Train LoRA model → "my-style-v1"
2. Go to Validator tab
3. Select style + trained model
4. Load test suite → "Cinematic Scenes"
5. Run test suite → 20 images generate
6. Review results in modal
7. Identify weak areas (e.g., "horror scenes lack contrast")
8. Adjust training data/parameters
9. Train new version → "my-style-v2"
10. Run same test suite
11. Compare folders side-by-side
12. Repeat until satisfied
```

This creates a systematic, data-driven approach to model improvement!
