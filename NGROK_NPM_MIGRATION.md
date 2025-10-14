# Ngrok NPM Package Migration

## Summary
Migrated from using system ngrok binary to the npm ngrok package to resolve cross-platform compatibility issues.

## Problem
The code was hardcoded to use `/opt/homebrew/bin/ngrok` (macOS Homebrew path), which caused spawn errors on Linux systems:
```
Error: spawn /opt/homebrew/bin/ngrok ENOENT
```

## Solution
Replaced the system ngrok spawn approach with the npm `ngrok` package, which:
- Works cross-platform (Linux, macOS, Windows)
- Handles ngrok binary installation automatically
- Provides a cleaner API with TypeScript support
- Eliminates the need for platform-specific path detection

## Changes Made

### 1. Installed ngrok npm package
```bash
npm install ngrok --save
```

### 2. Updated `/ui/config/routes/training-api.ts`

**Removed:**
- `spawn` and `ChildProcess` imports from `child_process`
- `ngrokProcess` variable for tracking spawned process
- Complex process spawning logic with stdout/stderr parsing

**Added:**
- `import ngrok from 'ngrok'` - npm package import
- Simplified `handleNgrokStart()` using `ngrok.connect()`
- Simplified `handleNgrokStop()` using `ngrok.disconnect()`
- Cleaner error handling

### 3. Key API Changes

**Before (spawn approach):**
```typescript
const ngrokPath = '/opt/homebrew/bin/ngrok';
ngrokProcess = spawn(ngrokPath, ['http', port, '--log=stdout']);
// Complex stdout parsing to extract URL
```

**After (npm package):**
```typescript
ngrokUrl = await ngrok.connect({
  addr: port,
  onStatusChange: (status) => console.log('[Ngrok] Status changed:', status),
  onLogEvent: (log) => console.log('[Ngrok]', log)
});
```

**Stop Before:**
```typescript
if (ngrokProcess && !ngrokProcess.killed) {
  ngrokProcess.kill();
}
```

**Stop After:**
```typescript
await ngrok.disconnect();
```

## Benefits
1. **Cross-platform compatibility** - Works on Linux, macOS, and Windows
2. **Automatic binary management** - npm package handles ngrok binary installation
3. **Cleaner code** - Removed ~100 lines of process management code
4. **Better error handling** - Package provides structured error messages
5. **TypeScript support** - Built-in type definitions (v5.0.0-beta.2)
6. **Easier maintenance** - No need to detect or manage system paths

## Testing
After migration, test the following:
1. Start ngrok tunnel from UI
2. Check tunnel status
3. Stop ngrok tunnel
4. Verify webhook URLs are correctly generated

## Dependencies
- `ngrok@^5.0.0-beta.2` (includes TypeScript definitions)
