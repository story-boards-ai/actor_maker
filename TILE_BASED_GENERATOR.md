# Tile-Based Multi-Select Image Generator

## Overview
Redesigned the single image generator from a dropdown list to a tile-based multi-select interface for faster iteration and batch generation.

## Features

### 🎯 **Tile-Based Selection**
- **Visual tiles** instead of dropdown
- **Click to select/deselect** - instant feedback
- **Color-coded by category**:
  - 🔵 Blue: Photorealistic scenes
  - ⚫ Gray: B&W stylized illustrations
  - 🌸 Pink: Color stylized illustrations
- **Checkmark indicator** on selected tiles
- **Usage counter** shows how many times each prompt was used

### ⚡ **Multi-Select Capabilities**
- **Select multiple prompts** at once
- **Select All** button - grab all 16 prompts
- **Clear** button - deselect everything
- **Counter** shows "X selected" in real-time
- **Generate button** updates: "✨ Generate 5 Images"

### 📊 **Progress Tracking**
- **Real-time progress bar** during generation
- **Current status**: "Generating 3/5: Rain-Slick Street Run..."
- **Success/failure count**: "✅ Generated 4 images (1 failed)"
- **Sequential generation** - one after another
- **Auto-reload** after completion

## UI Design

### Tile Layout
```
┌─────────────────────────────────────────────────┐
│  Generate Training Images          [Select All] │
│                                        [Clear]   │
├─────────────────────────────────────────────────┤
│  5 selected • Click tiles to select/deselect    │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ ✓ Rain   │ │   Window │ │ ✓ Subway │        │
│  │   Street │ │   Light  │ │   Platform│        │
│  │ PHOTO... │ │ PHOTO... │ │ PHOTO... │        │
│  │ 3x used  │ │ unused   │ │ 1x used  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│  ... (scrollable grid)                          │
├─────────────────────────────────────────────────┤
│  Generating 3/5: Subway Platform...             │
│  ████████░░░░░░░░ 60%                           │
├─────────────────────────────────────────────────┤
│                    [Cancel] [✨ Generate 5 Images]│
└─────────────────────────────────────────────────┘
```

### Color Scheme
- **Photorealistic**: Blue (#3b82f6)
  - Background: #dbeafe
  - Text: #1e40af
- **B&W Stylized**: Gray (#6b7280)
  - Background: #f3f4f6
  - Text: #1f2937
- **Color Stylized**: Pink (#ec4899)
  - Background: #fce7f3
  - Text: #9f1239

## Implementation

### State Management
```typescript
const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set());
const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
```

### Toggle Selection
```typescript
const togglePromptSelection = (promptId: string) => {
  const newSelection = new Set(selectedPromptIds);
  if (newSelection.has(promptId)) {
    newSelection.delete(promptId);
  } else {
    newSelection.add(promptId);
  }
  setSelectedPromptIds(newSelection);
};
```

### Batch Generation
```typescript
async function generateTrainingImages() {
  const selectedPrompts = prompts.filter(p => selectedPromptIds.has(p.id));
  
  for (let i = 0; i < selectedPrompts.length; i++) {
    const prompt = selectedPrompts[i];
    setGenerationProgress({ current: i, total: selectedPrompts.length });
    setGenerationMessage(`Generating ${i + 1}/${selectedPrompts.length}: ${prompt.label}...`);
    
    // Generate image
    await fetch('/api/actors/.../generate-single', { ... });
  }
}
```

## User Workflow

### Quick Single Generation
1. Click "✨ Generate Single Image"
2. Click one tile (e.g., "Subway Platform")
3. Click "✨ Generate 1 Image"
4. Wait ~30 seconds
5. Done!

### Batch Generation
1. Click "✨ Generate Single Image"
2. Click multiple tiles or "Select All"
3. Click "✨ Generate 5 Images"
4. Watch progress bar
5. All images generated sequentially

### Selective Generation
1. Click "Select All" (16 selected)
2. Click to deselect unwanted prompts
3. End up with 8 selected
4. Click "✨ Generate 8 Images"

## Benefits

### Speed
- ✅ **No dropdown scrolling** - see all options at once
- ✅ **One-click selection** - no need to open/close dropdown
- ✅ **Batch generation** - generate 5 images in one go
- ✅ **Visual scanning** - quickly identify unused prompts

### Usability
- ✅ **Clear visual feedback** - selected tiles are highlighted
- ✅ **Category grouping** - color-coded by type
- ✅ **Usage tracking** - see which prompts need more coverage
- ✅ **Progress visibility** - know exactly what's happening

### Flexibility
- ✅ **Single or batch** - works for both workflows
- ✅ **Partial selection** - pick exactly what you need
- ✅ **Quick iteration** - test multiple prompts fast

## Technical Details

### Grid Layout
- **CSS Grid**: `repeat(auto-fill, minmax(200px, 1fr))`
- **Responsive**: Adapts to modal width
- **Scrollable**: Max height 400px with overflow
- **Gap**: 12px between tiles

### Tile Dimensions
- **Min width**: 200px
- **Padding**: 12px
- **Border**: 2px solid (color-coded)
- **Border radius**: 8px

### Performance
- **Sequential generation**: One at a time to avoid overwhelming API
- **Error handling**: Continues even if one fails
- **Progress tracking**: Real-time updates
- **Auto-reload**: Refreshes usage stats after completion

## Future Enhancements
- [ ] Filter by category (show only photorealistic)
- [ ] Sort by usage (unused first)
- [ ] Keyboard shortcuts (Ctrl+A for select all)
- [ ] Drag to select multiple tiles
- [ ] Save selection presets
- [ ] Parallel generation (generate 3 at once)
- [ ] Estimated time remaining
