# Prompt Usage Tracking

## Overview
Added comprehensive tracking of which prompts have been used to generate training images, with visual indicators in the UI to help users see usage patterns and avoid over-generating with the same prompt.

## Features

### 📊 **Usage Tracking**
- **Metadata Storage**: Each generated image saves its prompt to `prompt_metadata.json`
- **Usage Counting**: Backend calculates how many times each prompt has been used
- **Real-time Updates**: UI refreshes usage stats after each generation

### 🎨 **Visual Indicators**

**Dropdown Options**:
- Shows usage count next to each prompt: `[3x used]` or `[unused]`
- Easy to see which prompts need more coverage

**Preview Panel**:
- **Used Prompts**: Blue badge showing "Used 3x"
- **Unused Prompts**: Green badge showing "Unused"
- Helps users make informed decisions

## Implementation

### Backend

#### Metadata Storage
**File**: `data/actors/{actor_name}/training_data/prompt_metadata.json`

```json
{
  "images": {
    "0000_european_16_male_5.jpg": {
      "prompt": "The man runs across a rain-slick street...",
      "prompt_preview": "The man runs across a rain-slick street at night, mid-stride...",
      "generated_at": "2025-01-16T11:34:22.123456",
      "s3_url": "https://...",
      "index": 5
    }
  }
}
```

#### API Endpoints

**GET `/api/actors/:actorId/prompt-usage`**
- Returns usage statistics per prompt
- Response format:
```json
{
  "actor_id": 123,
  "actor_name": "0000_european_16_male",
  "prompt_usage": {
    "The man runs across a rain-slick street...": 3,
    "Close-up of the man looking out a window...": 1
  }
}
```

#### Python Script Enhancement
**File**: `/scripts/generate_single_training_image.py`

**Added**:
- Saves prompt metadata after each generation
- Includes timestamp, prompt text, and preview
- Updates metadata.json atomically

### Frontend

#### TrainingImageModal Updates
**File**: `/ui/src/components/ActorTrainingDataManager/TrainingImageModal.tsx`

**State Management**:
```typescript
const [promptUsage, setPromptUsage] = useState<Record<string, number>>({});
```

**Data Loading**:
- Fetches prompt usage when modal opens
- Updates after successful generation
- Displays in real-time

**UI Enhancements**:
1. **Dropdown**: Shows `[Nx used]` or `[unused]` suffix
2. **Preview Badge**: Color-coded usage indicator
   - Blue badge: Previously used prompts
   - Green badge: Unused prompts

## User Experience

### Workflow
1. Click "✨ Generate Single Image"
2. See dropdown with usage indicators:
   - `Rain-Slick Street Run (photorealistic) [3x used]`
   - `Window Light (photorealistic) [unused]`
3. Select prompt and see preview with badge
4. Generate image
5. Usage count automatically updates

### Benefits

**For Users**:
- ✅ **Visibility**: Clear view of which prompts have been used
- ✅ **Balance**: Easy to ensure diverse training data
- ✅ **Flexibility**: Can still use same prompt multiple times if desired
- ✅ **No Restrictions**: Duplicates are allowed, just tracked

**For Training Quality**:
- ✅ **Diversity**: Encourages using variety of prompts
- ✅ **Coverage**: Easy to see which styles/scenes need more examples
- ✅ **Balance**: Helps maintain balanced dataset across categories

## Technical Details

### File Structure
```
/data/actors/{actor_name}/training_data/
  ├── prompt_metadata.json          # Usage tracking
  ├── response.json                 # S3 URLs list
  ├── {actor_name}_0.jpg           # Training images
  ├── {actor_name}_1.jpg
  └── ...
```

### Metadata Schema
```typescript
{
  images: {
    [filename: string]: {
      prompt: string;           // Full prompt text
      prompt_preview: string;   // First 100 chars
      generated_at: string;     // ISO timestamp
      s3_url: string;          // S3 location
      index: number;           // Image index
    }
  }
}
```

### Usage Calculation
- Backend reads `prompt_metadata.json`
- Counts occurrences of each unique prompt
- Returns as `Record<string, number>` map
- Frontend displays counts in UI

## Future Enhancements
- [ ] Show usage distribution chart
- [ ] Recommend least-used prompts
- [ ] Filter images by prompt
- [ ] Export usage statistics
- [ ] Prompt usage history timeline
- [ ] Batch generation with auto-balancing
