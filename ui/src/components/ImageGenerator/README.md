# ImageGenerator - Refactored Modular Structure

## Overview
The ImageGenerator component has been refactored from a **1,183-line monolithic file** into a clean, modular architecture with clear separation of concerns.

## Directory Structure

```
ImageGenerator/
├── ImageGenerator.tsx              # Main orchestration component (~180 lines)
├── ImageGenerator.css              # All styles (preserved from original)
├── index.ts                        # Public exports
│
├── hooks/                          # Custom hooks for business logic
│   ├── useImageGeneratorState.ts   # State management (~145 lines)
│   ├── useImageData.ts             # Data loading logic (~55 lines)
│   ├── useSettings.ts              # Settings persistence (~110 lines)
│   ├── usePromptBuilder.ts         # Prompt building logic (~140 lines)
│   └── useImageGeneration.ts       # Generation workflow (~280 lines)
│
├── components/                     # UI components
│   ├── ControlPanel.tsx            # Left sidebar controls (~110 lines)
│   ├── ImageComparison.tsx         # Source/generated comparison (~110 lines)
│   ├── SettingsModal.tsx           # Expert settings modal (~380 lines)
│   ├── PromptPreview.tsx           # Prompt preview section (~60 lines)
│   └── GenerationLogs.tsx          # Log display (~35 lines)
│
└── utils/                          # Utility functions
    └── imageProcessing.ts          # Image processing utilities (~110 lines)
```

## Architecture Benefits

### 1. **Separation of Concerns**
- **State Management**: Centralized in `useImageGeneratorState`
- **Business Logic**: Distributed across focused custom hooks
- **UI Components**: Presentational components with clear props
- **Utilities**: Pure functions for image processing

### 2. **Maintainability**
- Each file has a single, clear responsibility
- Files are ~35-380 lines (manageable size)
- Easy to locate and modify specific functionality
- Reduced cognitive load for developers

### 3. **Reusability**
- Hooks can be reused in other contexts
- UI components are decoupled and composable
- Utility functions are pure and testable

### 4. **Testability**
- Each hook can be tested in isolation
- UI components can be tested with mock props
- Utility functions have no dependencies

### 5. **Type Safety**
- Proper TypeScript interfaces throughout
- Correct `Dispatch<SetStateAction<T>>` types for React state setters
- Explicit prop types for all components

## Component Breakdown

### Main Component (`ImageGenerator.tsx`)
**Responsibility**: Orchestration layer that connects all hooks and components

- Initializes all custom hooks
- Manages data flow between hooks
- Renders layout structure
- Delegates logic to appropriate hooks

### Custom Hooks

#### `useImageGeneratorState`
- Manages all component state using `useState`
- Returns state values and setters
- Provides `addLog` helper function
- **Lines**: ~145

#### `useImageData`
- Loads input images from API
- Loads style registry
- Handles loading errors
- **Lines**: ~55

#### `useSettings`
- Loads saved settings from file
- Saves settings to persistent storage
- Resets settings to defaults
- **Lines**: ~110

#### `usePromptBuilder`
- Loads captions for selected images
- Builds prompts from style metadata
- Updates prompt preview in real-time
- Handles monochrome prompt cleaning
- **Lines**: ~140

#### `useImageGeneration`
- Complete image generation workflow
- Handles image format conversion
- Applies monochrome filters
- Injects workflow parameters
- Sends requests to RunPod
- Parses various response formats
- **Lines**: ~280

### UI Components

#### `ControlPanel`
Props-based component for left sidebar controls:
- Image selector
- Style selector
- Prompt textarea
- Prompt preview toggle
- Settings button
- Generation logs

#### `ImageComparison`
Side-by-side comparison display:
- Source image with B&W preview
- Generate button with loading state
- Generated image result
- Error display

#### `SettingsModal`
Expert settings modal with all workflow parameters:
- Seed (with randomize)
- Steps, CFG, Guidance, Denoise
- Width/Height dimensions
- Sampler/Scheduler selection
- LoRA strength controls
- Monochrome contrast (conditional)
- Save/Reset/Close actions

#### `PromptPreview`
Collapsible prompt preview:
- Character count
- Copy to clipboard
- Breakdown by section (trigger/frontpad/caption/backpad)
- Monochrome indicator

#### `GenerationLogs`
Log display with history:
- Timestamped log entries
- Last 10 entries shown
- Clear logs button

### Utilities

#### `imageProcessing.ts`
Pure functions for image manipulation:
- `blobToBase64Jpeg`: Convert any image format to JPEG base64
- `applyMonochromeFilter`: Apply grayscale + contrast adjustment

## Data Flow

```
User Action
    ↓
Main Component (ImageGenerator.tsx)
    ↓
Custom Hook (business logic)
    ↓
State Update (useImageGeneratorState)
    ↓
UI Component (re-render with new props)
```

## Migration Notes

### Before Refactoring
```typescript
// Single 1,183-line file
import { ImageGenerator } from './ImageGenerator';
```

### After Refactoring
```typescript
// Same import - backward compatible!
import { ImageGenerator } from './ImageGenerator';

// Or import from modular structure
import { ImageGenerator } from './ImageGenerator/ImageGenerator';
```

**No breaking changes** - the original `ImageGenerator.tsx` file now re-exports from the modular structure.

## Key Design Decisions

### 1. **Hook Composition Pattern**
Each hook focuses on one aspect of functionality:
- State management → `useImageGeneratorState`
- Data fetching → `useImageData`
- Settings persistence → `useSettings`
- Prompt building → `usePromptBuilder`
- Generation workflow → `useImageGeneration`

### 2. **Presentational Components**
UI components receive all data via props:
- No direct state management
- No business logic
- Easy to test and reason about
- Can be reused in different contexts

### 3. **Type Safety**
Proper TypeScript types throughout:
```typescript
// Correct React state setter types
setImages: Dispatch<SetStateAction<Image[]>>

// Not simplified function types
setImages: (images: Image[]) => void
```

### 4. **Utility Isolation**
Pure functions separated from React:
- No React dependencies
- Easy to test
- Reusable across projects
- Clear input/output contracts

## Performance Considerations

### Maintained from Original
- All `useEffect` dependencies preserved
- No unnecessary re-renders introduced
- Same memoization patterns
- Identical API call patterns

### Future Optimization Opportunities
- `useMemo` for expensive computations
- `useCallback` for event handlers
- Code splitting for large modals
- Lazy loading for style registry

## Testing Strategy

### Unit Tests
- **Hooks**: Test with `@testing-library/react-hooks`
- **Components**: Test with `@testing-library/react`
- **Utilities**: Standard Jest tests

### Integration Tests
- Full generation workflow
- Settings persistence
- Prompt building logic

### E2E Tests
- User selects image → generates → sees result
- Settings modal → save → reload → settings preserved

## Development Workflow

### Adding New Features
1. Identify which layer (hook/component/utility)
2. Create focused module in appropriate directory
3. Import and connect in main component
4. Keep files under ~400 lines

### Modifying Existing Features
1. Locate specific file by responsibility
2. Make changes in isolated context
3. Update TypeScript types if needed
4. Test affected modules

### Debugging
1. Console logs show which layer (hook/component)
2. React DevTools show component hierarchy
3. TypeScript catches type errors at compile time

## Conclusion

The refactored ImageGenerator provides:
- ✅ **Better organization**: Clear file structure
- ✅ **Easier maintenance**: Focused, manageable files
- ✅ **Improved testability**: Isolated, testable units
- ✅ **Type safety**: Proper TypeScript throughout
- ✅ **Reusability**: Composable hooks and components
- ✅ **Backward compatibility**: No breaking changes

**Total reduction**: From 1 monolithic file (1,183 lines) to 11 focused modules (~1,535 lines with better organization and documentation).
