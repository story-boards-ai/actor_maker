# GPT Prompt Generation Feature

## Overview
The Prompt Editor now includes AI-powered Prompt generation using GPT-4 Vision API. This allows you to automatically generate detailed, high-quality Prompts for training images using OpenAI's vision models.

## Features

### 🎯 Core Capabilities
- **Individual Image Generation**: Generate Prompts one image at a time
- **Batch Selection**: Select multiple images and generate Prompts in bulk
- **Generate All**: Process all images in one batch operation
- **Custom Prompts**: Full control over system and user prompts
- **Auto-Save**: Generated Prompts are automatically saved to .txt files
- **Smart Resizing**: Images are automatically resized to 768px to reduce API costs

### 🎨 User Interface

#### Header Actions
- **⚙️ Show/Hide Settings**: Toggle the prompt configuration panel
- **✨ Generate Selected**: Generate Prompts for all selected images
- **🚀 Generate All**: Generate Prompts for all images at once

#### Settings Panel
Configure two types of prompts:
1. **System Prompt**: Defines GPT's role and general instructions
2. **User Prompt**: Specific instructions for analyzing each image

#### Image Grid
Each image card features:
- **Checkbox**: Select images for batch generation
- **✨ Generate Button**: Generate Prompt for individual image
- **✏️ Edit Button**: Manually edit Prompts
- **Status Indicators**: Visual feedback for generation progress

### Selection Tools
- **Select All**: Quickly select all visible images
- **Deselect All**: Clear all selections
- **Filter Integration**: Works with Prompt filters (All/With Prompt/Without Prompt)

## Setup

### Prerequisites
1. **OpenAI API Key**: Set the `OPENAI_API_KEY` environment variable
   ```bash
   export OPENAI_API_KEY="sk-your-key-here"
   ```

2. **Python Dependencies**: Already included in `requirements.txt`
   - `openai>=1.0.0` - OpenAI Python client
   - `Pillow>=10.0.0` - Image processing

### Environment Configuration
Add to your `.env` file:
```bash
OPENAI_API_KEY=sk-your-key-here
```

## Usage

### Quick Start
1. Navigate to the **Prompt Editor** tab
2. Click **⚙️ Show Settings** to review/edit prompts
3. Select images using checkboxes or **Select All**
4. Click **✨ Generate Selected** to start generation
5. Generated Prompts are automatically saved

### Individual Image Generation
1. Find an image without a Prompt
2. Click the **✨ Generate** button on that image card
3. Wait for GPT to analyze (usually 3-5 seconds)
4. Prompt is generated and automatically saved

### Batch Generation
1. Use checkboxes to select multiple images
2. Click **✨ Generate Selected (N)** in the header
3. Confirm the batch operation
4. All selected images are processed sequentially
5. Results summary shows successful/failed generations

### Generate All Images
1. Click **🚀 Generate All (N)** in the header
2. Confirm the operation (warning about credits usage)
3. All images are processed in one batch
4. Review the results summary

## Customizing Prompts

### System Prompt
Defines GPT's role and overall behavior:
```
You are an expert image Prompting assistant for training AI models. 
Provide detailed, accurate descriptions that capture:
- Main subjects and their actions
- Visual style and composition
- Colors, lighting, and atmosphere
- Relevant details for image generation training

Keep Prompts concise but comprehensive (100-200 words).
```

### User Prompt
Specific instructions for each image:
```
Analyze this image and provide a detailed Prompt suitable for training 
an image generation model. Focus on visual elements, composition, style, 
colors, and key features. Be specific and descriptive.
```

### Tips for Better Prompts
- **Be Specific**: Mention exactly what details you want captured
- **Style Elements**: Include lighting, composition, color palette
- **Training Focus**: Emphasize elements important for your use case
- **Length Control**: Specify desired Prompt length
- **Format**: Request structured output if needed

## Cost Considerations

### Token Usage
- **Image Resizing**: Automatically resizes to 768px (85 tokens per image)
- **Model**: Uses GPT-4 Vision (gpt-4o)
- **Typical Cost**: ~$0.01-0.02 per image
- **Batch Processing**: Linear cost (N images = N × single image cost)

### Cost Optimization
1. **Selective Generation**: Only generate for images that need Prompts
2. **Review & Edit**: Manually edit Prompts when minor changes needed
3. **Batch Wisely**: Process in smaller batches to monitor costs
4. **Prompt Efficiency**: Keep prompts concise to reduce output tokens

## Technical Details

### Architecture
```
Frontend (React) → Vite Middleware → Python Script → OpenAI API
                                    ↓
                            Image Processing (PIL)
                                    ↓
                            Prompt Generation (GPT-4V)
                                    ↓
                            Auto-save to .txt files
```

### API Endpoints
- **POST /api/Prompt/generate**: Generate Prompts with GPT
  ```json
  {
    "images": [
      { "filename": "image.jpg", "path": "/resources/..." }
    ],
    "systemPrompt": "...",
    "userPrompt": "..."
  }
  ```
  
  Response:
  ```json
  {
    "success": true,
    "results": [
      {
        "filename": "image.jpg",
        "success": true,
        "Prompt": "Generated Prompt text..."
      }
    ],
    "total": 1,
    "successful": 1,
    "failed": 0
  }
  ```

### Files
- **Frontend**: `ui/src/components/PromptEditor.tsx`
- **Backend Middleware**: `ui/vite.config.ts`
- **Python Script**: `scripts/generate_Prompts.py`
- **Styles**: `ui/src/components/PromptEditor.css`
- **OpenAI Client**: `src/utils/openai_client.py`

## Error Handling

### Common Issues

#### 1. Missing API Key
```
Error: OPENAI_API_KEY environment variable is not set
```
**Solution**: Set the environment variable in `.env` or shell

#### 2. Image Not Found
```
Error: Image file not found: /path/to/image.jpg
```
**Solution**: Ensure images exist in `resources/input_images/`

#### 3. API Rate Limits
```
Error: Rate limit exceeded
```
**Solution**: Wait a few seconds and retry, or reduce batch size

#### 4. Invalid Response
```
Error: Failed to generate Prompt
```
**Solution**: Check prompt format, try with default prompts

### Troubleshooting
1. **Check Console**: Browser DevTools shows detailed errors
2. **Review Prompts**: Ensure prompts are well-formed
3. **Test Individual**: Try single image before batch
4. **API Status**: Verify OpenAI API is operational

## Best Practices

### 1. Prompt Engineering
- Start with default prompts and iterate
- Test on a few images before batch processing
- Keep prompts focused on your specific use case
- Include examples if needed for consistency

### 2. Workflow Efficiency
- Filter images without Prompts first
- Generate in batches of 10-20 images
- Review and edit generated Prompts as needed
- Save custom prompts for different image types

### 3. Quality Control
- Spot-check generated Prompts for accuracy
- Edit Prompts that need refinement
- Keep track of which prompt variations work best
- Maintain consistency across your dataset

## Future Enhancements
- [ ] Multiple prompt templates
- [ ] Prompt templates/presets
- [ ] Progress bar for batch operations
- [ ] Prompt quality scoring
- [ ] Retry failed generations
- [ ] Export/import prompt configurations
- [ ] GPT-4 Turbo support for cost reduction
- [ ] Claude Vision integration as alternative

## Support
For issues or questions:
1. Check this documentation
2. Review console logs for errors
3. Test with default prompts
4. Verify OpenAI API key is valid
