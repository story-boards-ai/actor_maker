# Selection Sets Feature

## Overview

The Selection Sets feature allows you to save, load, and manage different selections of training images for each style. This is useful for:

- Creating different training data subsets for experimentation
- Organizing images by quality, theme, or purpose
- Quick switching between different image selections
- Maintaining multiple curated sets per style

## User Interface

### Location
The selection sets manager is located in the **Training Data S3 Manager** toolbar, accessible via the **📁 Sets** button.

### Features

#### 1. **Dropdown Menu**
- Compact dropdown interface that doesn't take up toolbar space
- Shows current active set in button label: `📁 Sets (2)`
- Click to open/close the sets menu

#### 2. **Save New Set**
- Button: **💾 Save New**
- Saves current selection as a new numbered set
- Automatically assigns next available number (1, 2, 3, etc.)
- Disabled when no images are selected
- Shows toast notification with set number and image count

#### 3. **Update Current Set**
- Button: **✏️ Update**
- Updates the currently loaded set with current selection
- Only enabled when a set is loaded
- Disabled when no images are selected
- Preserves set number

#### 4. **Load Set**
- Click any set in the list to load it
- Shows set number and image count
- Active set is highlighted with blue background
- Automatically selects all images in the set
- Shows toast notification on load

#### 5. **Delete Set**
- Button: **🗑️** (trash icon on each set)
- Confirmation dialog before deletion
- Removes set from list
- Clears current set if it was active

#### 6. **Hide Unselected Toggle**
- Button: **👁️ Hide Unselected** / **👁️ Show All**
- Filters grid to show only selected images
- Useful for focusing on current selection
- Disabled when no images are selected
- Button highlighted when active

### Visual Design

**Set Menu:**
- Clean dropdown with header "Selection Sets"
- Two action buttons at top (Save New, Update)
- Scrollable list of sets (max height: 300px)
- Each set shows:
  - Numbered badge (1, 2, 3, etc.)
  - Image count
  - Delete button
- Active set has blue highlight and colored badge

**Set Items:**
- Hover effect for better interactivity
- Active set has left border accent
- Numbered badges for quick identification
- Image count for reference

## File Storage

### Location
Selection sets are stored per style in:
```
resources/style_images/{style_id}_{style_name}/selection_sets.json
```

### File Format
```json
{
  "sets": [
    {
      "id": 1,
      "filenames": [
        "grid1.jpg",
        "grid2.jpg",
        "grid3.jpg"
      ]
    },
    {
      "id": 2,
      "filenames": [
        "grid5.jpg",
        "grid8.jpg"
      ]
    }
  ]
}
```

### Properties
- **id**: Unique number for the set (1, 2, 3, etc.)
- **filenames**: Array of image filenames in the set
- Sets are automatically sorted by ID

## API Endpoints

### GET `/api/styles/:styleId/selection-sets`
Load all selection sets for a style.

**Response:**
```json
{
  "sets": [
    { "id": 1, "filenames": ["grid1.jpg", "grid2.jpg"] },
    { "id": 2, "filenames": ["grid5.jpg"] }
  ]
}
```

### POST `/api/styles/:styleId/selection-sets`
Create a new selection set.

**Request:**
```json
{
  "id": 3,
  "filenames": ["grid1.jpg", "grid3.jpg", "grid7.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "set": { "id": 3, "filenames": ["grid1.jpg", "grid3.jpg", "grid7.jpg"] }
}
```

### PUT `/api/styles/:styleId/selection-sets/:setId`
Update an existing selection set.

**Request:**
```json
{
  "filenames": ["grid2.jpg", "grid4.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "set": { "id": 2, "filenames": ["grid2.jpg", "grid4.jpg"] }
}
```

### DELETE `/api/styles/:styleId/selection-sets/:setId`
Delete a selection set.

**Response:**
```json
{
  "success": true
}
```

## Workflow Examples

### Example 1: Creating Quality Tiers
1. Select all high-quality images
2. Click **📁 Sets** → **💾 Save New**
3. Set 1 is created with high-quality images
4. Deselect all, select medium-quality images
5. Save as Set 2
6. Switch between sets by clicking them in the menu

### Example 2: Testing Different Subsets
1. Select 20 images for initial training
2. Save as Set 1
3. Train model with Set 1
4. Select different 20 images
5. Save as Set 2
6. Train model with Set 2
7. Compare results

### Example 3: Organizing by Theme
1. Select all landscape images → Save as Set 1
2. Select all portrait images → Save as Set 2
3. Select all action images → Save as Set 3
4. Quickly switch between themes for different training runs

## Tips

1. **Use Hide Unselected** to focus on your current selection without distraction
2. **Update sets** instead of creating new ones when refining a selection
3. **Delete unused sets** to keep the menu clean
4. **Set numbers are permanent** - deleted numbers are not reused
5. **Sets are per-style** - each style has its own independent sets

## Technical Details

### State Management
- Selection sets loaded on component mount
- Current set ID tracked in state
- Deselecting all clears current set
- Loading a set updates selection and current set ID

### Auto-numbering
- Next available ID calculated from existing sets
- Uses `Math.max(...existingIds) + 1`
- First set is always ID 1

### Click Outside Detection
- Menu closes when clicking outside
- Uses ref and event listener
- Cleanup on component unmount

### Hide Unselected Filter
- Filters `visibleImages` array
- Grid only renders filtered images
- Original indices preserved for checkbox toggling
- Disabled when no selection exists

## Future Enhancements

Possible future improvements:
- Set renaming (custom names instead of just numbers)
- Set descriptions/notes
- Set duplication
- Bulk operations (merge sets, intersect sets)
- Export/import sets between styles
- Set statistics (S3 sync status, file sizes)
