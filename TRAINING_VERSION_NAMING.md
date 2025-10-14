# Training Version Naming Standardization

## Problem Identified

There was an inconsistency in how training versions were named across different parts of the system, causing duplicate entries and sync issues.

## Naming Flow

### 1. Training Start (`useTrainingOperations.ts`)
When a user starts training:
- **model_name** (sent to RunPod): `style_${styleId}_v${versionName}` 
  - Example: `style_1_vV8`
- **version.name** (in training_versions.json): `${versionName}`
  - Example: `V8`
- **version.id** (in training_versions.json): RunPod job ID
  - Example: `ec487842-b853-4ca1-ba91-76bba6a59006-e2`

### 2. Training Completion (Webhook)
When RunPod completes training:
- **S3 filename**: Based on model_name → `style_1_vV8.safetensors`
- **Webhook updates**: Finds version by `version.id` (RunPod job ID)
- **Adds loraUrl**: Updates existing version with S3 URL

### 3. S3 Sync (`s3-lora-sync.ts`)
When user clicks "Sync S3 LoRAs":
- **Scans S3**: Finds files like `style_1_vV8.safetensors`
- **Extracts version**: `style_1_vV8.safetensors` → `V8`
- **Matches by name**: Looks for version with `name: "V8"`
- **Priority**: Pending/failed versions first (need URLs), then completed versions

## Standardized Naming Convention

### Training Version Entry Format
```json
{
  "id": "ec487842-b853-4ca1-ba91-76bba6a59006-e2",  // RunPod job ID
  "name": "V8",                                       // Clean version name
  "status": "completed",
  "loraUrl": "https://...style_1_vV8.safetensors",   // S3 URL
  "timestamp": "2025-10-13T19:36:17.724Z",
  "parameters": { ... },
  "description": "more steps, higher learning rate"
}
```

### S3 Filename Format
```
style_{styleId}_v{versionName}.safetensors
```
Examples:
- `style_1_vV8.safetensors`
- `style_82_vV5.safetensors`
- `style_100_vV2.safetensors`

### Version Name Format
```
V{number}
```
Examples:
- `V1`, `V2`, `V3`, etc.

## Matching Logic (Priority Order)

### First Pass: Pending/Failed Versions
Match by version name for entries that need URLs:
1. Extract version from filename: `style_1_vV8` → `V8`
2. Find version with `name: "V8"`
3. Only match if `status === 'pending' || status === 'failed' || !loraUrl`
4. Update with S3 URL and mark as completed

### Second Pass: Already-Synced Versions
If no pending version found, match existing synced entries:
1. Match by loraUrl containing filename
2. Match by exact filename in name field
3. Match by version ID

### Create New Entry
Only if no match found in either pass:
- Use clean version name: `V8` (not `style_1_vV8.safetensors`)
- Mark as completed with S3 URL
- Add description: "Synced from S3"

## Benefits

1. **No Duplicates**: Pending versions get updated instead of creating new entries
2. **Consistent Naming**: All versions use clean names like "V8"
3. **Clear Status**: Easy to see which versions are pending vs completed
4. **Proper Sync**: S3 sync updates the correct training entry
5. **Better UX**: Training tab shows consistent version names

## Files Modified

1. **`ui/config/utils/s3-lora-sync.ts`**
   - Two-pass matching logic (pending first, then synced)
   - Clean version name extraction
   - Enhanced logging for debugging

2. **`ui/src/components/LoRATraining/hooks/useTrainingOperations.ts`**
   - Already using correct naming: `name: versionName` (e.g., "V8")
   - model_name: `style_${styleId}_v${versionName}` (e.g., "style_1_vV8")

3. **`ui/config/utils/webhook-handler.ts`**
   - Updates version by RunPod job ID
   - Preserves existing version name and parameters

## Testing

To verify the fix works:

1. Start a new training (e.g., V9)
2. Wait for training to complete
3. Click "Sync S3 LoRAs" button
4. Check training_versions.json:
   - Should have ONE V9 entry (not two)
   - Entry should have loraUrl
   - Status should be "completed"
   - Parameters should be preserved

## Example: Before vs After

### Before (Duplicate Entries)
```json
{
  "versions": [
    {
      "id": "style_1_vV8",
      "name": "style_1_vV8.safetensors",  // ❌ Full filename
      "status": "completed",
      "loraUrl": "https://...style_1_vV8.safetensors",
      "description": "Synced from S3"
    },
    {
      "id": "ec487842-b853-4ca1-ba91-76bba6a59006-e2",
      "name": "V8",                        // ❌ Separate entry
      "status": "pending",                 // ❌ Still pending
      "parameters": { ... }
    }
  ]
}
```

### After (Single Updated Entry)
```json
{
  "versions": [
    {
      "id": "ec487842-b853-4ca1-ba91-76bba6a59006-e2",
      "name": "V8",                        // ✅ Clean name
      "status": "completed",               // ✅ Updated
      "loraUrl": "https://...style_1_vV8.safetensors",  // ✅ Added
      "parameters": { ... },               // ✅ Preserved
      "lastSynced": "2025-10-14T05:55:19.167Z"
    }
  ]
}
```
