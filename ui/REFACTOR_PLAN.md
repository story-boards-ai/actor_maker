# Vite Config Refactoring Plan

## Current State
- **File**: `vite.config.ts`
- **Size**: 1554 lines
- **Issues**: Monolithic configuration with mixed concerns

## Refactoring Strategy

### Phase 1: Extract Utilities ✓
Create shared utilities for common operations:
- `config/utils/python-executor.ts` - Python process spawning and execution
- `config/utils/image-processor.ts` - Base64 and image URL handling
- `config/utils/content-types.ts` - MIME type mapping
- `config/utils/path-helpers.ts` - Path construction helpers

### Phase 2: Extract File Serving Middleware ✓
Create dedicated middleware for file serving:
- `config/middleware/file-serving.ts` - Static file serving middleware
  - Styles registry
  - Workflows
  - Debug files
  - Resources (images)
  - Public folder

### Phase 3: Extract API Routes ✓
Organize API endpoints by domain:
- `config/routes/images-api.ts` - Image listing and serving
  - /api/input-images
  - /api/training-images/:folder
  - /api/styles/:id/training-images
- `config/routes/Prompts-api.ts` - Prompt management
  - /api/Prompt/read/:filename
  - /api/Prompt/save/:filename
  - /api/Prompt/generate
- `config/routes/settings-api.ts` - Settings persistence
  - /api/settings/save
  - /api/settings/load
- `config/routes/styles-api.ts` - Style management
  - /api/styles/update-prompts
- `config/routes/generation-api.ts` - Image generation
  - /api/generate-image
  - /api/training-data/generate
  - /api/training-data/delete
  - /api/training-data/save-generated
- `config/routes/s3-api.ts` - S3 operations
  - /api/s3/check-status
  - /api/s3/upload
  - /api/s3/delete
  - /api/s3/download

### Phase 4: Create Main Server Plugin ✓
- `config/server-plugin.ts` - Orchestrates all middleware and routes

### Phase 5: Update Main Config ✓
- Simplify `vite.config.ts` to use the extracted plugin

## File Structure After Refactoring

```
ui/
├── vite.config.ts (simplified)
├── config/
│   ├── server-plugin.ts (main plugin orchestrator)
│   ├── middleware/
│   │   └── file-serving.ts
│   ├── routes/
│   │   ├── images-api.ts
│   │   ├── Prompts-api.ts
│   │   ├── settings-api.ts
│   │   ├── styles-api.ts
│   │   ├── generation-api.ts
│   │   └── s3-api.ts
│   └── utils/
│       ├── python-executor.ts
│       ├── image-processor.ts
│       ├── content-types.ts
│       └── path-helpers.ts
```

## Benefits
1. **Maintainability**: Each file has a single responsibility
2. **Readability**: Easier to find and understand code
3. **Testability**: Smaller units are easier to test
4. **Scalability**: Easy to add new routes/middleware
5. **Reusability**: Shared utilities can be used across modules

## Migration Notes
- All functionality preserved
- No breaking changes
- Existing API endpoints unchanged
- Server configuration unchanged

## Progress Tracking

### Completed ✅
- [x] Phase 1: Extract Utilities
- [x] Phase 2: Extract File Serving Middleware
- [x] Phase 3: Extract API Routes
- [x] Phase 4: Create Main Server Plugin
- [x] Phase 5: Update Main Config

### Current Status
✅ **REFACTORING COMPLETE**

## Refactoring Summary

The monolithic 1554-line `vite.config.ts` has been successfully refactored into a modular structure:

- **Original**: 1554 lines in a single file
- **New main config**: 17 lines (99% reduction!)
- **Total new files**: 11 files organized by responsibility

All functionality has been preserved. The server will work exactly as before, but the code is now:
- ✅ More maintainable
- ✅ Easier to understand
- ✅ Better organized
- ✅ Easier to test
- ✅ Easier to extend

The original file has been backed up as `vite.config.ts.backup`

## Rollback Plan
If issues arise:
1. Keep original `vite.config.ts` as `vite.config.ts.backup`
2. Can restore from backup if needed
3. Git commit before changes for easy revert
