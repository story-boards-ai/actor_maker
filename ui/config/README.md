# Vite Configuration Modules

This directory contains the modular Vite configuration, refactored from a monolithic 1554-line file.

## Structure

```
config/
├── server-plugin.ts          # Main plugin orchestrator
├── middleware/
│   └── file-serving.ts        # Static file serving middleware
├── routes/
│   ├── images-api.ts          # Image listing and serving
│   ├── Prompts-api.ts        # Prompt management
│   ├── settings-api.ts        # Settings persistence
│   ├── styles-api.ts          # Style management
│   ├── generation-api.ts      # Image generation
│   └── s3-api.ts              # S3 operations
└── utils/
    ├── python-executor.ts     # Python process spawning
    ├── image-processor.ts     # Image handling utilities
    ├── content-types.ts       # MIME type mapping
    └── path-helpers.ts        # Path construction
```

## How It Works

1. **Entry Point**: `vite.config.ts` imports `createServerPlugin()`
2. **Plugin Orchestration**: `server-plugin.ts` creates middleware chain
3. **Middleware Execution**: Each module handles specific routes/functionality
4. **Utilities**: Shared code used across modules

## Adding New Features

### Adding a new API endpoint:
1. Create or update a route file in `routes/`
2. The plugin automatically includes it in the middleware chain

### Adding new utility functions:
1. Add to appropriate utility file in `utils/`
2. Import where needed

### Adding new file serving:
1. Update `middleware/file-serving.ts`

## Maintenance Guidelines

- **Keep modules focused**: Each file should have a single responsibility
- **Share common code**: Use utilities to avoid duplication
- **Maintain consistency**: Follow existing patterns
- **Document changes**: Update this README when adding new modules

## Testing

To verify the refactored config works:
```bash
npm run dev
```

All existing functionality should work exactly as before.

## Rollback

If issues occur, restore the original:
```bash
cp vite.config.ts.backup vite.config.ts
```
