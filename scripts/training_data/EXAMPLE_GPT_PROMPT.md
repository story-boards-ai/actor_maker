# Example GPT-4.1 Mini Vision Prompt

This is the actual prompt sent to GPT-4.1 mini for evaluating training data.

## Prompt Template

```
Analyze this grid of 22 training images for an actor LoRA model.

The images are arranged in a grid (left-to-right, top-to-bottom, numbered 1 to 22).

**Target Distribution:**
- 65% Photorealistic (13 images): Cinematic film scenes, realistic lighting, natural environments
- 20% B&W Stylized (4 images): Black and white illustrations (pen & ink, charcoal, manga, etc.)
- 15% Color Stylized (3 images): Color illustrations (comic book, watercolor, digital painting, etc.)

**Your Task:**
1. Categorize each image by number (1-22) into one of three types:
   - "photorealistic": Real-world cinematic scenes
   - "bw_stylized": Black and white artistic/illustrated
   - "color_stylized": Color artistic/illustrated

2. Count how many of each type we have

3. Determine what needs to be adjusted:
   - If we have TOO MANY of a type: list image numbers to DELETE (lowest quality first)
   - If we have TOO FEW of a type: specify how many to GENERATE

**Return JSON format:**
{
  "image_classifications": [
    {"image_number": 1, "type": "photorealistic", "quality_score": 8},
    {"image_number": 2, "type": "bw_stylized", "quality_score": 7},
    ...
  ],
  "counts": {
    "photorealistic": 10,
    "bw_stylized": 6,
    "color_stylized": 4
  },
  "recommendations": {
    "delete_photorealistic": [],
    "delete_bw_stylized": [2, 5],
    "delete_color_stylized": [8],
    "generate_photorealistic": 3,
    "generate_bw_stylized": 0,
    "generate_color_stylized": 0
  },
  "analysis": "Brief explanation of the current mix and what needs adjustment"
}

Be precise and objective. Quality score 1-10 (consider composition, clarity, variety).
```

## Example Response

```json
{
  "image_classifications": [
    {"image_number": 1, "type": "photorealistic", "quality_score": 9},
    {"image_number": 2, "type": "photorealistic", "quality_score": 8},
    {"image_number": 3, "type": "photorealistic", "quality_score": 6},
    {"image_number": 4, "type": "photorealistic", "quality_score": 8},
    {"image_number": 5, "type": "photorealistic", "quality_score": 7},
    {"image_number": 6, "type": "photorealistic", "quality_score": 9},
    {"image_number": 7, "type": "photorealistic", "quality_score": 5},
    {"image_number": 8, "type": "photorealistic", "quality_score": 8},
    {"image_number": 9, "type": "photorealistic", "quality_score": 7},
    {"image_number": 10, "type": "photorealistic", "quality_score": 8},
    {"image_number": 11, "type": "photorealistic", "quality_score": 6},
    {"image_number": 12, "type": "photorealistic", "quality_score": 9},
    {"image_number": 13, "type": "photorealistic", "quality_score": 7},
    {"image_number": 14, "type": "photorealistic", "quality_score": 8},
    {"image_number": 15, "type": "photorealistic", "quality_score": 7},
    {"image_number": 16, "type": "bw_stylized", "quality_score": 8},
    {"image_number": 17, "type": "bw_stylized", "quality_score": 7},
    {"image_number": 18, "type": "bw_stylized", "quality_score": 6},
    {"image_number": 19, "type": "bw_stylized", "quality_score": 8},
    {"image_number": 20, "type": "color_stylized", "quality_score": 9},
    {"image_number": 21, "type": "color_stylized", "quality_score": 7},
    {"image_number": 22, "type": "color_stylized", "quality_score": 8}
  ],
  "counts": {
    "photorealistic": 15,
    "bw_stylized": 4,
    "color_stylized": 3
  },
  "recommendations": {
    "delete_photorealistic": [3, 7],
    "delete_bw_stylized": [],
    "delete_color_stylized": [],
    "generate_photorealistic": 0,
    "generate_bw_stylized": 0,
    "generate_color_stylized": 0
  },
  "analysis": "The dataset has 15 photorealistic images (68.2%) which exceeds the target of 13 (65%). The B&W stylized (4 images, 18.2%) and color stylized (3 images, 13.6%) are close to target. Recommend deleting the 2 lowest quality photorealistic images (#3 with score 6 and #7 with score 5) to reach the target distribution of 13 photorealistic images."
}
```

## How It Works

1. **Image Grid**: All training images are arranged in a 5-column grid
2. **Numbering**: Images are numbered 1-N, left-to-right, top-to-bottom
3. **Analysis**: GPT-4.1 mini examines each image and categorizes it
4. **Quality Scoring**: Each image gets a 1-10 score based on:
   - Composition quality
   - Image clarity
   - Variety (different from other images)
   - Suitability for training
5. **Recommendations**: Based on counts vs targets, GPT recommends:
   - Which specific images to delete (lowest quality first)
   - How many of each type to generate

## Why This Works

- **Visual Analysis**: GPT Vision can accurately distinguish between photorealistic and stylized images
- **Quality Assessment**: Can identify low-quality images (blurry, repetitive, poor composition)
- **Structured Output**: JSON mode ensures consistent, parseable responses
- **Objective Criteria**: Clear definitions for each category
- **Context Aware**: Understands the goal is LoRA training diversity

## Customization

You can modify the prompt in `training_data_evaluator.py`:
- Change target percentages
- Add more categories
- Adjust quality criteria
- Add specific requirements
