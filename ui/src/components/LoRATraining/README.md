# LoRA Training Tab - Refactored Structure

This directory contains the refactored LoRA Training Tab component, broken down from a massive 1754-line monolithic file into a modular, maintainable architecture.

## 📁 Directory Structure

```
LoRATraining/
├── LoRATrainingTab.tsx          # Main component (orchestrates everything)
├── types.ts                      # TypeScript interfaces and types
├── index.ts                      # Public exports
├── components/                   # UI Components
│   ├── CountdownTimer.tsx       # Training progress timer
│   ├── NgrokPanel.tsx           # Ngrok tunnel management
│   ├── DatasetSelector.tsx      # Dataset selection with S3 sync status
│   ├── ParametersForm.tsx       # Training parameters configuration
│   ├── ConsolePanel.tsx         # Training console logs
│   ├── VersionsPanel.tsx        # Training history/versions
│   ├── ValidationModal.tsx      # Pre-training validation warnings
│   └── TrainingGuidelinesModal.tsx  # Training best practices guide
├── hooks/                        # Custom React hooks
│   ├── useTrainingState.ts      # State management with localStorage
│   ├── useTrainingOperations.ts # Training API calls and logic
│   ├── useNgrok.ts              # Ngrok tunnel operations
│   └── useDataLoading.ts        # Data fetching and S3 sync checks
└── utils/                        # Utility functions
    ├── storage.ts               # localStorage helpers
    └── calculations.ts          # Parameter calculations and recommendations
```

## 🎯 Key Improvements

### Before
- **1754 lines** in a single file
- Mixed concerns (UI, state, API, calculations)
- Difficult to test individual pieces
- Hard to maintain and extend

### After
- **~300 lines** per file (max)
- Clear separation of concerns
- Each component/hook has a single responsibility
- Easy to test, maintain, and extend

## 📦 Components

### Main Component
**`LoRATrainingTab.tsx`** - Orchestrates all sub-components and hooks
- Manages style selection
- Coordinates training workflow
- Handles modal visibility

### UI Components

**`CountdownTimer.tsx`** - Real-time training progress
- Shows elapsed time
- Displays remaining time estimate
- Progress bar visualization

**`NgrokPanel.tsx`** - Webhook tunnel management
- Start/stop ngrok tunnel
- Display public URL and port
- Copy URL to clipboard
- Open ngrok inspector

**`DatasetSelector.tsx`** - Training dataset selection
- Selection set dropdown
- S3 sync status indicator
- Auto-adjust parameters button
- Image count display

**`ParametersForm.tsx`** - Training configuration
- Core parameters (dim, alpha, LR, steps, trigger token)
- Advanced parameters (scheduler, optimizer, batch size, etc.)
- Collapsible advanced section
- Training guidelines button

**`ConsolePanel.tsx`** - Training logs and status
- Real-time console logs
- Training status indicator
- Manual status check button
- Abort training button
- Countdown timer integration

**`VersionsPanel.tsx`** - Training history
- List of all training versions
- Version details (parameters, dataset, status)
- Download trained models
- Error messages

**`ValidationModal.tsx`** - Pre-training validation
- Missing captions warning
- Missing S3 files warning
- Quick links to caption editor and S3 manager

**`TrainingGuidelinesModal.tsx`** - Best practices guide
- Dataset size recommendations
- Parameter guidelines
- Quick tips
- Common mistakes

## 🪝 Hooks

### `useTrainingState`
Manages all component state with localStorage persistence
- Selection sets, versions, parameters
- UI state (tabs, modals, loading)
- Console logs and current training
- S3 sync status and validation issues

### `useTrainingOperations`
Handles all training-related API calls and logic
- Validate and start training
- Check training status
- Abort training
- Console logging
- Version management

### `useNgrok`
Manages ngrok tunnel operations
- Check ngrok status
- Start/stop tunnel
- Track URL and port

### `useDataLoading`
Handles data fetching and validation
- Load selection sets
- Load training versions
- Check S3 sync status
- Restore training sessions from localStorage

## 🛠️ Utilities

### `storage.ts`
localStorage helpers for state persistence
- `loadFromStorage()` - Load with fallback
- `saveToStorage()` - Save with error handling
- `clearAllStoredState()` - Reset all state
- `getStorageKey()` - Generate storage keys

### `calculations.ts`
Training parameter calculations
- `calculateRecommendedSteps()` - Based on image count
- `calculateEstimatedDuration()` - Training time estimate
- `autoAdjustParameters()` - Optimize all parameters
- `getNextVersionNumber()` - Auto-increment versions

## 📝 Types

### Core Interfaces
- `TrainingParameters` - All training configuration
- `TrainingVersion` - Training history record
- `SelectionSet` - Dataset definition
- `CurrentTraining` - Active training state
- `ConsoleLog` - Log entry structure
- `S3SyncStatus` - S3 sync state
- `ValidationIssue` - Pre-training validation

### Constants
- `DEFAULT_PARAMETERS` - Safe default values

## 🔄 Data Flow

```
User Action
    ↓
Main Component (LoRATrainingTab)
    ↓
Hooks (useTrainingOperations, useNgrok, etc.)
    ↓
API Calls / State Updates
    ↓
UI Components Re-render
```

## 🧪 Testing Strategy

Each module can now be tested independently:

1. **Components** - Test UI rendering and user interactions
2. **Hooks** - Test state management and side effects
3. **Utils** - Test pure functions and calculations
4. **Integration** - Test full training workflow

## 🚀 Usage

```tsx
import { LoRATrainingTab } from './components/LoRATraining';

function App() {
  return <LoRATrainingTab />;
}
```

All exports are also available from the index:

```tsx
import { 
  LoRATrainingTab,
  useTrainingState,
  calculateRecommendedSteps,
  DEFAULT_PARAMETERS 
} from './components/LoRATraining';
```

## 🎨 Styling

Styles remain in the original `LoRATrainingTab.css` file, which is imported by the main component.

## 📊 Metrics

- **Original**: 1754 lines, 1 file
- **Refactored**: ~2000 lines total, 17 files
- **Average file size**: ~120 lines
- **Largest file**: ~350 lines (useTrainingOperations.ts)
- **Smallest file**: ~40 lines (CountdownTimer.tsx)

## ✅ Benefits

1. **Maintainability** - Easy to find and fix issues
2. **Testability** - Each piece can be tested independently
3. **Reusability** - Components and hooks can be used elsewhere
4. **Readability** - Clear structure and single responsibilities
5. **Scalability** - Easy to add new features
6. **Type Safety** - Centralized type definitions
7. **Performance** - Better code splitting opportunities

## 🔮 Future Improvements

- Add unit tests for hooks and utilities
- Add integration tests for training workflow
- Extract more reusable components (e.g., Modal wrapper)
- Add Storybook stories for UI components
- Implement error boundaries
- Add performance monitoring
