# Selection Sets UI Layout

## Visual Layout

### Toolbar Layout (No Extra Rows!)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Training Data S3 Manager Toolbar                                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  LEFT SIDE                                    RIGHT SIDE                         │
│  ┌──────────────────────────────────┐        ┌──────────────────────────────┐  │
│  │ [Select All]                     │        │ [📁 Sets (2)] ▼              │  │
│  │ [Select Not in S3 (5)]           │        │ [👁️ Hide Unselected]         │  │
│  │ [Deselect All]                   │        │ Columns: ━━━━━━━━ 4          │  │
│  └──────────────────────────────────┘        └──────────────────────────────┘  │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Dropdown Menu (Opens on Click)

```
                                                  ┌─────────────────────────────┐
                                                  │ Selection Sets              │
                                                  ├─────────────────────────────┤
                                                  │                             │
                                                  │ [💾 Save New] [✏️ Update]   │
                                                  │                             │
                                                  ├─────────────────────────────┤
                                                  │                             │
                                                  │  ┌──┐                       │
                                                  │  │1 │ 15 images        🗑️  │
                                                  │  └──┘                       │
                                                  │                             │
                                                  │  ┌──┐                       │
                                                  │  │2 │ 23 images        🗑️  │ ← Active (blue)
                                                  │  └──┘                       │
                                                  │                             │
                                                  │  ┌──┐                       │
                                                  │  │3 │ 8 images         🗑️  │
                                                  │  └──┘                       │
                                                  │                             │
                                                  │  ┌──┐                       │
                                                  │  │4 │ 30 images        🗑️  │
                                                  │  └──┘                       │
                                                  │                             │
                                                  └─────────────────────────────┘
                                                           ↑
                                                    280px wide
                                                    Max 300px tall
                                                    Scrollable
```

## Component Breakdown

### 1. Sets Button
```
┌──────────────────┐
│ 📁 Sets (2)   ▼ │  ← Shows current active set number
└──────────────────┘
     ↓ Click
┌──────────────────┐
│ 📁 Sets       ▼ │  ← No active set
└──────────────────┘
```

### 2. Hide Unselected Toggle
```
┌──────────────────────────┐
│ 👁️ Hide Unselected      │  ← Default state (show all)
└──────────────────────────┘
     ↓ Click
┌──────────────────────────┐
│ 👁️ Show All             │  ← Active state (hiding unselected)
└──────────────────────────┘  ← Button highlighted in blue
```

### 3. Set Item (Normal)
```
┌─────────────────────────────┐
│  ┌──┐                       │
│  │1 │ 15 images        🗑️  │  ← Hover: light gray background
│  └──┘                       │
└─────────────────────────────┘
```

### 4. Set Item (Active)
```
┌─────────────────────────────┐
│█ ┌──┐                       │  ← Blue left border
│█ │2 │ 23 images        🗑️  │  ← Blue background
│█ └──┘                       │  ← Blue numbered badge
└─────────────────────────────┘
```

### 5. Menu Actions
```
┌─────────────────────────────┐
│ [💾 Save New] [✏️ Update]   │
└─────────────────────────────┘
       ↓            ↓
    Enabled      Enabled only
    when         when set is
    images       loaded AND
    selected     images selected
```

## State Indicators

### Button States

#### Sets Button
```
📁 Sets          ← No active set
📁 Sets (1)      ← Set 1 is active
📁 Sets (5)      ← Set 5 is active
```

#### Hide Button
```
👁️ Hide Unselected    ← Normal (white background)
👁️ Show All           ← Active (blue background)
```

#### Action Buttons
```
[💾 Save New]         ← Enabled (white)
[💾 Save New]         ← Disabled (grayed, 40% opacity)

[✏️ Update]           ← Enabled (white)
[✏️ Update]           ← Disabled (grayed, 40% opacity)
```

## Interaction Flow

### Creating a Set
```
1. User selects images
   ┌─────────────────────┐
   │ ☑ Image 1          │
   │ ☑ Image 2          │
   │ ☐ Image 3          │
   └─────────────────────┘

2. Opens Sets menu
   [📁 Sets] ← Click

3. Clicks Save New
   [💾 Save New] ← Click

4. Set created
   Toast: "Saved as Set 3 (2 images)"
   Button updates: [📁 Sets (3)]
```

### Loading a Set
```
1. Opens Sets menu
   [📁 Sets (3)] ← Click

2. Clicks set in list
   ┌──┐
   │1 │ 15 images  ← Click
   └──┘

3. Images selected automatically
   ┌─────────────────────┐
   │ ☑ Image 1          │
   │ ☑ Image 2          │
   │ ☑ Image 3          │
   └─────────────────────┘

4. Menu closes, button updates
   Toast: "Loaded Set 1 (15 images)"
   Button: [📁 Sets (1)]
```

### Hiding Unselected
```
1. Select some images
   Grid shows: 50 images (10 selected)

2. Click Hide Unselected
   [👁️ Hide Unselected] ← Click

3. Grid filters
   Grid shows: 10 images (10 selected)
   Button: [👁️ Show All] (blue)

4. Click Show All
   [👁️ Show All] ← Click

5. Grid unfilters
   Grid shows: 50 images (10 selected)
   Button: [👁️ Hide Unselected] (white)
```

## Responsive Behavior

### Small Screens
```
Toolbar wraps to multiple lines:

┌────────────────────────────┐
│ [Select All]               │
│ [Select Not in S3]         │
│ [Deselect All]             │
└────────────────────────────┘
┌────────────────────────────┐
│ [📁 Sets]                  │
│ [👁️ Hide]                  │
│ Columns: ━━━━ 4            │
└────────────────────────────┘

Dropdown stays 280px wide
(positioned from right edge)
```

### Large Screens
```
Everything fits on one line:

┌──────────────────────────────────────────────────────────────┐
│ [Select All] [Select Not in S3] [Deselect All]              │
│                    [📁 Sets] [👁️ Hide] [Columns: ━━━━ 4]    │
└──────────────────────────────────────────────────────────────┘
```

## Visual Hierarchy

### Color Coding
```
Primary Blue (#3b82f6):
- Active set highlight
- Active set badge
- Active hide button
- Hover borders

Gray (#6b7280):
- Secondary text
- Image counts
- Inactive elements

Red (#dc2626):
- Delete buttons (on hover)

Green (#10b981):
- S3 sync status dots
```

### Typography
```
Bold:
- Set numbers
- "Selection Sets" header
- Active elements

Regular:
- Image counts
- Button labels
- Filenames

Small:
- Image counts (0.8125rem)
- Button text (0.875rem)
```

## Accessibility

### Keyboard Navigation
```
Tab Order:
1. Sets button
2. Hide button
3. Column slider
4. (When menu open) Save New
5. (When menu open) Update
6. (When menu open) Set 1
7. (When menu open) Delete Set 1
8. (When menu open) Set 2
... etc
```

### Screen Reader
```
Sets button: "Sets menu, current set 2"
Hide button: "Hide unselected images"
Set item: "Set 1, 15 images, load button"
Delete button: "Delete set 1"
```

### Tooltips
```
[📁 Sets]        → "Manage selection sets"
[💾 Save New]    → "Save current selection as new set"
[✏️ Update]      → "Update current set with current selection"
[Set 1]          → "Load Set 1"
[🗑️]             → "Delete set"
[👁️ Hide]        → "Show only selected images"
```

## Animation Details

### Menu Open/Close
```
Transition: 200ms ease
- Opacity: 0 → 1
- Transform: translateY(-10px) → translateY(0)
```

### Set Item Hover
```
Transition: 200ms ease
- Background: white → #f9fafb
- Border: transparent → #3b82f6
```

### Button States
```
Transition: 200ms ease
- Background color
- Border color
- Opacity
```

### Delete Button Hover
```
Transition: 200ms ease
- Opacity: 0.6 → 1
- Transform: scale(1) → scale(1.1)
```

This layout ensures a clean, professional, and space-efficient interface! 🎨
