# Styles Maker UI

Modern web interface for the Styles Maker toolkit built with React and Radix UI.

## Features

- **Clean Design**: Modern dark theme with smooth animations
- **Radix UI Tabs**: Accessible, keyboard-friendly tab navigation
- **4 Main Sections**:
  - **Style Library**: Browse and manage your LoRA style models with preview images
    - **View Training Images**: Click the button on any style card to see all training images used for that version
    - **Version Tracking**: Currently showing v1.0 training data, ready for v2.0 expansion
  - **Prompt Editor**: Edit Prompts for your source images
    - View all input images with their Prompts
    - Edit and save Prompts to .txt files
    - Filter by images with/without Prompts
    - Real-time Prompt status indication
  - **Image Generation**: Generate images using trained models
  - **Workflow Management**: Manage ComfyUI workflows
- **Dynamic Style Display**: Automatically loads and displays styles from your styles registry

## Quick Start

### Installation

```bash
cd ui
npm install
```

### Development

```bash
npm run dev
```

This will start the dev server at `http://localhost:3000` and automatically open in your browser.

### Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Tech Stack

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Radix UI**: Accessible, unstyled components
- **Vite**: Fast build tool and dev server

## Project Structure

```
ui/
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── vite.config.ts       # Vite config
```

## Customization

### Colors

Edit CSS variables in `src/index.css`:

```css
:root {
  --color-primary: #3b82f6;
  --color-background: #0a0a0a;
  --color-surface: #111111;
  /* ... more variables */
}
```

### Adding Components

Components can be added to `src/components/` directory (create it as needed).

## Image Resolution Strategy

The UI handles style preview images with a smart fallback system:

1. **Primary**: Try loading from S3 URL (from `styles_registry.json`)
2. **Fallback**: If S3 fails, try local image from `/resources/style_images/{style_folder}/`
3. **Placeholder**: If both fail, show a colorful gradient with style name

### S3 Image Issues

If you see "broken" images, it's likely because:
- S3 bucket requires authentication
- Images are not publicly accessible
- CORS is not configured

**Solution**: The UI automatically falls back to local images and gradient placeholders.

## Training Images Feature

### How It Works

Each style card now has a **"📸 View Training Images"** button that opens a modal showing all training images used for that style version.

### Version 1.0 (Current)

Training images are stored in `/resources/style_images/{style_folder}/` and are automatically discovered by the dev server API endpoint:

```
/api/training-images/{style_folder}
```

The API scans the folder and returns all image files (jpg, jpeg, png, gif, webp).

### Version 2.0 (Future)

The system is designed to support multiple versions:
- Each version can have its own set of training images
- The modal accepts a `version` prop to show different training data
- Simply extend the `getStyleFolderName()` function to map v2.0 folders

### Adding Training Images

To add training images for a style:

1. Place images in `/resources/style_images/{style_folder}/`
2. Supported formats: jpg, jpeg, png, gif, webp
3. Images are automatically detected when you click "View Training Images"

Example:
```
resources/style_images/1_ink_intensity/
  - image1.jpg
  - image2.jpg
  - scene_1_shot_1.jpg
```

## Prompt Editor Feature

### Overview

The Prompt Editor tab provides a visual interface to manage Prompts for your source images in `/resources/input_images/`.

### Features

- **View all source images** with their associated Prompt files
- **Edit Prompts inline** with a rich text editor
- **Automatic Prompt file creation** - saves as `{filename}.txt` in the same directory
- **Filter options**:
  - All images
  - Images with Prompts
  - Images without Prompts
- **Visual status badges** indicating which images have Prompts
- **Real-time save** - Prompts are immediately written to .txt files

### API Endpoints

The Prompt Editor uses these API endpoints:

```
GET  /api/input-images          # List all images with Prompt status
GET  /api/Prompt/read/{file}   # Read a Prompt file
POST /api/Prompt/save/{file}   # Save a Prompt file
```

### Prompt File Format

Prompt files are plain text files with the same basename as the image:

```
input_001.jpg  →  input_001.txt
input_002.png  →  input_002.txt
```

Example Prompt content:
```
A person standing in front of a building, photorealistic style, high detail
```

### Workflow

1. Navigate to the **Prompt Editor** tab
2. Browse your source images
3. Click **"✏️ Edit Prompt"** on any image
4. Enter or modify the Prompt text
5. Click **"💾 Save"** to write the Prompt to a .txt file
6. Use filters to find images that need Prompts

## Next Steps

- Add bulk Prompt operations (copy, delete, export)
- Add AI-assisted Prompt generation
- Add version 2.0 training data support
- Add comparison view (v1 vs v2 training images)
- Add actual functionality to the placeholder buttons (Image Generation tab)
- Integrate with the Python backend API for training
- Add forms for training and generation
- Add image upload and preview capabilities
