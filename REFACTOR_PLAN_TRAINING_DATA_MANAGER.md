# Training Data Manager Refactoring Plan

## Current State
**File:** `/ui/src/components/TrainingDataManager.tsx` (978 lines)
**Problem:** Monolithic component with too many responsibilities

## Analysis of Current Component

### Responsibilities (Lines of Code)
1. **State Management** (~70 lines)
   - Base images state
   - Training images state
   - Processing state
   - Settings state (15+ individual useState hooks)
   - UI state (modals, errors, loading)

2. **Data Loading** (~185 lines)
   - loadData() - Load base/training images
   - loadWorkflow() - Load ComfyUI workflow
   - loadSettings() - Load saved settings
   - Event bus subscriptions

3. **Settings Management** (~100 lines)
   - saveSettings()
   - resetSettings()
   - resetLoraToDefault()
   - randomizeSeed()

4. **Image Generation** (~220 lines)
   - generateBatch() - Complex batch processing logic
   - generateSelected()
   - generateMissing()
   - abortGeneration()

5. **Image Management** (~35 lines)
   - deleteTrainingImage()
   - recreateTrainingImage()
   - handleSendToImageGen()

6. **Selection Logic** (~30 lines)
   - toggleSelection()
   - selectAll()
   - deselectAll()
   - selectMissing()

7. **Computed Values** (~15 lines)
   - imageMap useMemo
   - selectedCount, missingCount calculations

8. **UI Rendering** (~320 lines)
   - Header
   - Toolbar
   - Progress bar
   - Grid with base/training image pairs
   - SettingsModal integration
   - Loading/error states

## Refactoring Strategy

### Phase 1: Extract Hooks ✅
Create custom hooks to manage complex state and logic

#### 1.1 Create `hooks/useTrainingDataManager/`
**Files to create:**
- `hooks/useTrainingDataManager/useTrainingImages.ts` - Image data loading and management
- `hooks/useTrainingDataManager/useImageGeneration.ts` - Generation logic and batch processing
- `hooks/useTrainingDataManager/useImageSelection.ts` - Selection state and actions
- `hooks/useTrainingDataManager/useGenerationSettings.ts` - Settings state and persistence
- `hooks/useTrainingDataManager/index.ts` - Main hook that composes all sub-hooks

### Phase 2: Extract UI Components ✅
Break down the massive render method into smaller components

#### 2.1 Create `TrainingDataManager/` component directory
**Files to create:**
- `TrainingDataManager/TrainingDataManager.tsx` - Main container (orchestration only)
- `TrainingDataManager/TrainingHeader.tsx` - Header with title, stats, actions
- `TrainingDataManager/TrainingToolbar.tsx` - Selection toolbar
- `TrainingDataManager/TrainingProgressBar.tsx` - Progress indicator
- `TrainingDataManager/TrainingGrid.tsx` - Grid container
- `TrainingDataManager/TrainingImagePair.tsx` - Single base+training pair
- `TrainingDataManager/BaseImageCard.tsx` - Base image display
- `TrainingDataManager/TrainingImageCard.tsx` - Training image display
- `TrainingDataManager/PlaceholderCard.tsx` - Empty state for missing training image
- `TrainingDataManager/LoadingState.tsx` - Loading screen
- `TrainingDataManager/ErrorState.tsx` - Error screen
- `TrainingDataManager/EmptyState.tsx` - No images state
- `TrainingDataManager/index.ts` - Export main component

#### 2.2 Create `TrainingDataManager/types.ts`
**Purpose:** Centralize all type definitions
- BaseImage
- TrainingImage
- ProcessingState
- TrainingDataManagerProps

### Phase 3: Extract Utilities ✅
Move pure functions and constants to utility files

#### 3.1 Create `utils/trainingDataManager/`
**Files to create:**
- `utils/trainingDataManager/imageMapping.ts` - Image pairing logic
- `utils/trainingDataManager/constants.ts` - BATCH_SIZE, default values
- `utils/trainingDataManager/validators.ts` - Input validation

## Implementation Steps

### Step 1: Create Type Definitions ✅ COMPLETED
**File:** `TrainingDataManager/types.ts`
- ✅ Extract all interfaces from main file
- ✅ Add shared types

### Step 2: Create Hooks ✅ COMPLETED
**Priority Order:**
1. ✅ `useGenerationSettings.ts` - Most independent, settings state only
2. ✅ `useImageSelection.ts` - Simple state management
3. ✅ `useTrainingImages.ts` - Data loading, depends on eventBus
4. ✅ `useImageGeneration.ts` - Complex, depends on other hooks
5. ✅ `index.ts` - Compose all hooks

### Step 3: Create Utility Functions ✅ COMPLETED
**Files:**
1. ✅ `constants.ts` - Extract BATCH_SIZE, default settings
2. ✅ `imageMapping.ts` - Extract imageMap logic
3. ✅ `validators.ts` - Any validation logic

### Step 4: Create UI Components ✅ COMPLETED
**Priority Order:**
1. ✅ `LoadingState.tsx` - Simple, no dependencies
2. ✅ `ErrorState.tsx` - Simple, no dependencies
3. ✅ `EmptyState.tsx` - Simple, no dependencies
4. ✅ `TrainingProgressBar.tsx` - Simple, receives props only
5. ✅ `PlaceholderCard.tsx` - Simple card component
6. ✅ `BaseImageCard.tsx` - Image display + checkbox
7. ✅ `TrainingImageCard.tsx` - Image display + actions
8. ✅ `TrainingImagePair.tsx` - Combines base + training
9. ✅ `TrainingGrid.tsx` - Maps over pairs
10. ✅ `TrainingToolbar.tsx` - Selection actions
11. ✅ `TrainingHeader.tsx` - Header with stats and actions
12. ✅ `TrainingDataManager.tsx` - Main orchestrator (final)

### Step 5: Integration ✅ COMPLETED
1. ✅ Update imports in main component
2. ✅ Replace inline code with hook calls
3. ✅ Replace JSX with new components
4. ✅ CSS moved to component directory
5. ✅ Old monolithic file backed up as TrainingDataManager.old.tsx

### Step 6: Cleanup ✅ COMPLETED
1. ✅ Ensure all imports are at top
2. ✅ Verify no circular dependencies
3. ✅ CSS moved to TrainingDataManager directory
4. ✅ Parent components (App.tsx) import path still works via index.ts

## ✅ REFACTORING COMPLETED

**Date:** 2025-10-11
**Original File:** 978 lines → **Backed up as:** `TrainingDataManager.old.tsx`
**New Structure:** 20 focused files, largest ~250 lines

## File Structure After Refactoring

```
ui/src/components/
├── TrainingDataManager/
│   ├── index.ts                    (export main component)
│   ├── types.ts                    (shared types)
│   ├── TrainingDataManager.tsx     (main orchestrator, ~100 lines)
│   ├── TrainingHeader.tsx          (~50 lines)
│   ├── TrainingToolbar.tsx         (~40 lines)
│   ├── TrainingProgressBar.tsx     (~30 lines)
│   ├── TrainingGrid.tsx            (~30 lines)
│   ├── TrainingImagePair.tsx       (~40 lines)
│   ├── BaseImageCard.tsx           (~60 lines)
│   ├── TrainingImageCard.tsx       (~80 lines)
│   ├── PlaceholderCard.tsx         (~40 lines)
│   ├── LoadingState.tsx            (~20 lines)
│   ├── ErrorState.tsx              (~25 lines)
│   └── EmptyState.tsx              (~20 lines)
│
├── hooks/
│   └── useTrainingDataManager/
│       ├── index.ts                (main hook, ~50 lines)
│       ├── useTrainingImages.ts    (~150 lines)
│       ├── useImageGeneration.ts   (~250 lines)
│       ├── useImageSelection.ts    (~60 lines)
│       └── useGenerationSettings.ts (~120 lines)
│
└── utils/
    └── trainingDataManager/
        ├── constants.ts            (~30 lines)
        ├── imageMapping.ts         (~40 lines)
        └── validators.ts           (~20 lines)
```

## Benefits After Refactoring

1. **Maintainability:** Each file has single responsibility
2. **Testability:** Hooks and utilities can be unit tested
3. **Reusability:** Components can be reused in other contexts
4. **Readability:** Smaller files are easier to understand
5. **Performance:** Can optimize individual components with memo
6. **Collaboration:** Multiple developers can work on different parts

## Risk Mitigation

1. **Keep original file** until refactoring is complete and tested
2. **Test each phase** before moving to next
3. **Use TypeScript** to catch breaking changes
4. **Event bus integration** - Ensure event listeners work correctly
5. **Settings persistence** - Verify save/load still works
6. **Batch generation** - Critical feature, test thoroughly

## Rollback Plan

If refactoring causes issues:
1. Revert to original `TrainingDataManager.tsx`
2. Keep new files for future attempts
3. Document what went wrong
4. Adjust plan and retry

## Success Criteria

✅ All existing functionality works
✅ No performance regression
✅ All files under 300 lines
✅ Clear separation of concerns
✅ Easy to understand and modify
✅ Parent components work without changes

## Notes

- Preserve all existing functionality
- Don't change CSS structure (keep class names)
- Maintain event bus integration
- Keep settings modal integration working
- Ensure abort functionality works
- Maintain cache-busting for images
