# Selection Sets - Quick Start Guide

## 🚀 Getting Started in 30 Seconds

### 1. Create Your First Set
```
1. Open Training Data S3 Manager
2. Select some images (click checkboxes)
3. Click [📁 Sets]
4. Click [💾 Save New]
5. Done! Set 1 created ✅
```

### 2. Load a Set
```
1. Click [📁 Sets]
2. Click any set number (e.g., "1")
3. Done! Images selected ✅
```

### 3. Focus on Selection
```
1. Load a set or select images
2. Click [👁️ Hide Unselected]
3. Done! Only selected images shown ✅
```

## 📖 Common Workflows

### Workflow 1: Quality Tiers
**Goal**: Organize images by quality level

```
Step 1: High Quality
- Select best 20 images
- [📁 Sets] → [💾 Save New]
- Result: Set 1 (20 images)

Step 2: Medium Quality
- [Deselect All]
- Select next 30 images
- [📁 Sets] → [💾 Save New]
- Result: Set 2 (30 images)

Step 3: All Images
- [Select All]
- [📁 Sets] → [💾 Save New]
- Result: Set 3 (50 images)

Usage:
- Training run 1: Load Set 1 → Sync to S3
- Training run 2: Load Set 2 → Sync to S3
- Training run 3: Load Set 3 → Sync to S3
```

### Workflow 2: A/B Testing
**Goal**: Test different image combinations

```
Step 1: Combination A
- Select 25 diverse images
- [📁 Sets] → [💾 Save New]
- Result: Set 1

Step 2: Combination B
- [Deselect All]
- Select different 25 images
- [📁 Sets] → [💾 Save New]
- Result: Set 2

Testing:
- Train with Set 1 → Evaluate results
- Train with Set 2 → Evaluate results
- Compare which performs better
```

### Workflow 3: Iterative Refinement
**Goal**: Progressively improve selection

```
Step 1: Initial Selection
- Select 30 images
- [📁 Sets] → [💾 Save New]
- Result: Set 1

Step 2: Train and Evaluate
- Load Set 1
- Sync to S3 and train
- Review results

Step 3: Refine Selection
- Load Set 1
- Remove 5 poor performers
- Add 5 better images
- [📁 Sets] → [✏️ Update]
- Result: Set 1 updated

Step 4: Repeat
- Train with updated Set 1
- Keep refining until satisfied
```

### Workflow 4: Theme-Based Sets
**Goal**: Organize by image content

```
Landscapes:
- Select all landscape images
- [📁 Sets] → [💾 Save New]
- Result: Set 1 (Landscapes)

Portraits:
- [Deselect All]
- Select all portrait images
- [📁 Sets] → [💾 Save New]
- Result: Set 2 (Portraits)

Action:
- [Deselect All]
- Select all action images
- [📁 Sets] → [💾 Save New]
- Result: Set 3 (Action)

Usage:
- Train style-specific models
- Quick switching between themes
```

## 💡 Pro Tips

### Tip 1: Use Hide Unselected for Focus
```
Problem: Hard to see which images are selected in large grid
Solution:
1. Load a set or select images
2. [👁️ Hide Unselected]
3. Review only selected images
4. [👁️ Show All] when done
```

### Tip 2: Update Instead of Creating New
```
Problem: Too many similar sets cluttering menu
Solution:
1. Load the set you want to modify
2. Make changes (add/remove images)
3. [✏️ Update] instead of [💾 Save New]
4. Keeps menu clean
```

### Tip 3: Delete Unused Sets
```
Problem: Old experimental sets no longer needed
Solution:
1. [📁 Sets]
2. Click [🗑️] on unused sets
3. Confirm deletion
4. Keeps menu organized
```

### Tip 4: Check Active Set
```
Problem: Forgot which set is loaded
Solution:
- Look at button: [📁 Sets (2)] ← Set 2 is active
- Or open menu: Active set has blue highlight
```

### Tip 5: Combine with Select Buttons
```
Quick selections:
1. [Select Not in S3] ← Select all local-only images
2. Review selection
3. [📁 Sets] → [💾 Save New]
4. Result: Set of images needing S3 sync
```

## ⚠️ Important Notes

### Set Numbers
- ✅ Sets are numbered 1, 2, 3, etc.
- ✅ Numbers are permanent (not reused)
- ✅ Deleting Set 2 doesn't renumber others
- ✅ Next new set will be highest + 1

### Per-Style Storage
- ✅ Each style has its own sets
- ✅ Sets don't transfer between styles
- ✅ Stored in style's folder
- ✅ Independent management

### Selection State
- ✅ Loading a set selects its images
- ✅ Deselecting all clears active set
- ✅ Manual selection doesn't auto-save
- ✅ Must explicitly save/update

### File References
- ✅ Sets store filenames, not paths
- ✅ Works even if files move within style folder
- ✅ Broken if files deleted
- ✅ No validation on load (yet)

## 🔧 Troubleshooting

### Problem: Can't Save Set
```
Symptom: [💾 Save New] is disabled
Cause: No images selected
Solution: Select at least one image
```

### Problem: Can't Update Set
```
Symptom: [✏️ Update] is disabled
Cause: No set is currently loaded
Solution: Load a set first, then modify and update
```

### Problem: Can't Hide Unselected
```
Symptom: [👁️ Hide Unselected] is disabled
Cause: No images selected
Solution: Select images or load a set
```

### Problem: Set Disappeared
```
Symptom: Set no longer in menu
Cause: Accidentally deleted or file corrupted
Solution: Create new set (old data lost)
```

### Problem: Wrong Images Selected
```
Symptom: Loading set selects different images
Cause: Files renamed or moved
Solution: Update set with correct selection
```

## 📊 Best Practices

### Organization
```
✅ DO: Keep 3-5 meaningful sets
❌ DON'T: Create 20+ experimental sets

✅ DO: Delete sets you no longer need
❌ DON'T: Let unused sets accumulate

✅ DO: Update sets as you refine
❌ DON'T: Create new set for every change
```

### Naming Strategy
```
Since sets are just numbers, use a convention:
- Set 1: High quality / Best images
- Set 2: Medium quality / Good images
- Set 3: All images / Full dataset
- Set 4: Experimental / Testing
- Set 5: Theme-specific / Special purpose
```

### Workflow Integration
```
✅ DO: Create sets before training runs
✅ DO: Use hide unselected for review
✅ DO: Update sets based on results
✅ DO: Combine with S3 sync workflow
```

## 🎯 Quick Reference

### Button Functions
```
[📁 Sets]           → Open/close menu
[💾 Save New]       → Create new set
[✏️ Update]         → Update current set
[Set Number]        → Load that set
[🗑️]                → Delete set
[👁️ Hide/Show]     → Toggle visibility filter
```

### Keyboard Shortcuts
```
None currently - all mouse/touch based
Future: Could add Ctrl+1, Ctrl+2, etc.
```

### Status Indicators
```
[📁 Sets]           → No active set
[📁 Sets (2)]       → Set 2 is active
Blue highlight      → Active set in menu
Blue button         → Hide mode active
Disabled button     → Action not available
```

## 🚀 Next Steps

1. **Try it out**: Create your first set
2. **Experiment**: Test different combinations
3. **Refine**: Update sets based on results
4. **Organize**: Keep menu clean and useful
5. **Integrate**: Use with S3 sync workflow

Happy organizing! 📁✨
