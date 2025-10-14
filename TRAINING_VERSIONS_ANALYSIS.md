# Training Versions JSON Analysis

## Problem Summary

The `training_versions.json` files show inconsistencies:
1. **Two different entry formats**: Detailed entries vs minimal entries
2. **Duplications**: Same model appears multiple times with different IDs
3. **Inconsistent data**: Some entries have full parameters, others have empty parameters

## Root Cause: Two Separate Writing Mechanisms

### 1. **Webhook Handler** (Primary Training Flow)
**File**: `/ui/config/utils/webhook-handler.ts`

**When it writes**: When RunPod training completes and sends webhook callback

**What it writes**:
```typescript
{
  "id": "3e248bb6-012c-4384-ae6c-4b19c126d093-e1",  // RunPod job ID
  "name": "V7",
  "timestamp": "2025-10-12T08:14:00.884Z",
  "parameters": {
    "network_dim": 16,
    "network_alpha": 16,
    "learning_rate": 0.0001,
    // ... full training parameters
  },
  "status": "completed",
  "selectionSetId": 1,
  "imageCount": 43,
  "loraUrl": "https://...",
  "completedAt": "2025-10-12T08:41:05.201Z"
}
```

**Key characteristics**:
- ✅ Full training parameters
- ✅ Complete metadata (imageCount, selectionSetId, etc.)
- ✅ Proper status tracking (pending → completed/failed)
- ✅ Uses RunPod job ID as version ID
- ✅ Includes timestamps for completion/failure

**Process**:
1. User starts training → Creates version entry with status "pending"
2. RunPod processes training
3. Webhook fires → Updates existing entry by matching RunPod job ID
4. Sets status to "completed" or "failed", adds loraUrl

### 2. **S3 Sync Utility** (Secondary Sync Flow)
**File**: `/ui/config/utils/s3-lora-sync.ts`

**When it writes**: When manually syncing LoRA files from S3 bucket

**What it writes**:
```typescript
{
  "id": "style_1_vV7",  // Filename without .safetensors
  "name": "style_1_vV7.safetensors",
  "status": "completed",
  "loraUrl": "https://...",
  "timestamp": "2025-10-12T08:41:02+00:00",  // S3 last_modified
  "lastSynced": "2025-10-12T09:46:20.075Z",
  "parameters": {},  // ❌ EMPTY
  "description": "Synced from S3"
}
```

**Key characteristics**:
- ❌ Empty parameters object
- ❌ No training metadata (imageCount, selectionSetId)
- ❌ Uses filename as ID instead of RunPod job ID
- ✅ Includes lastSynced timestamp
- ✅ Has "Synced from S3" description

**Process**:
1. User clicks "Sync S3 LoRAs" button
2. Python script lists all LoRA files in S3
3. For each file, creates/updates version entry
4. Uses filename as version ID (e.g., "style_1_vV7")

## Why Duplications Occur

Looking at the example in `1_ink_intensity/training_versions.json`:

**Entry 1** (Lines 3-25):
```json
{
  "id": "3e248bb6-012c-4384-ae6c-4b19c126d093-e1",
  "name": "V7",
  "loraUrl": "https://storyboard-user-files.s3-accelerate.amazonaws.com/actor_maker_user/custom-styles-models/style_1_vV7.safetensors"
}
```

**Entry 2** (Lines 166-173):
```json
{
  "id": "style_1_vV7",
  "name": "style_1_vV7.safetensors",
  "loraUrl": "https://storyboard-user-files.s3.us-west-1.amazonaws.com/actor_maker_user/custom-styles-models/style_1_vV7.safetensors"
}
```

**Same model, different IDs!**
- Webhook handler uses RunPod job ID: `3e248bb6-012c-4384-ae6c-4b19c126d093-e1`
- S3 sync uses filename: `style_1_vV7`
- Both point to the same S3 file (note: different S3 URLs but same file)

## Why This Happens

1. **User trains a model** → Webhook creates detailed entry with RunPod job ID
2. **User clicks "Sync S3 LoRAs"** → S3 sync finds the same file in S3
3. **S3 sync doesn't know about RunPod job ID** → Creates new entry with filename as ID
4. **Result**: Two entries for the same model

## Code Analysis

### Webhook Handler Logic (webhook-handler.ts:79-88)
```typescript
// Find version by RunPod job ID (this is the version.id)
const versionIndex = data.versions.findIndex((v: any) => v.id === runpodJobId);

if (versionIndex === -1) {
  console.warn('[Training Webhook] Version not found for RunPod job ID:', runpodJobId);
  return { success: false, error: `Version not found for job ID: ${runpodJobId}` };
}
```
✅ Updates existing entry by RunPod job ID

### S3 Sync Logic (s3-lora-sync.ts:148-173)
```typescript
// Create a version ID from the filename
const versionId = file.filename.replace('.safetensors', '');

// Check if this version already exists
let version = data.versions.find((v: any) => v.id === versionId);

if (version) {
  // Update existing version
  version.loraUrl = file.url;
  version.status = 'completed';
  version.lastSynced = new Date().toISOString();
} else {
  // Create new version
  version = {
    id: versionId,
    name: file.filename,
    status: 'completed',
    loraUrl: file.url,
    timestamp: file.last_modified,
    lastSynced: new Date().toISOString(),
    parameters: {},  // ❌ EMPTY
    description: 'Synced from S3'
  };
  data.versions.push(version);
}
```
❌ Looks for filename-based ID, doesn't find webhook entry, creates duplicate

## Solutions

### Option 1: Make S3 Sync Smarter (Recommended)
Modify S3 sync to check if a version with the same loraUrl already exists:

```typescript
// Check if this loraUrl already exists (regardless of ID)
let version = data.versions.find((v: any) => 
  v.loraUrl && v.loraUrl.includes(file.filename)
);

if (version) {
  // Update existing version's URL and sync time
  version.loraUrl = file.url;
  version.lastSynced = new Date().toISOString();
  console.log('[S3 Sync] Updated existing version:', version.id);
} else {
  // Only create new version if no match found
  // ... create new version
}
```

### Option 2: Standardize Version IDs
Always use filename-based IDs for both webhook and S3 sync:

```typescript
// In webhook handler, extract filename from loraUrl
const filename = loraUrl.split('/').pop()?.replace('.safetensors', '');
const versionId = filename || runpodJobId;
```

### Option 3: Add Metadata to S3 Sync
Store RunPod job ID in S3 object metadata during training, retrieve during sync:

```python
# During training upload
s3.put_object(
    Bucket=bucket,
    Key=key,
    Body=file,
    Metadata={'runpod_job_id': job_id}
)

# During sync
metadata = s3.head_object(Bucket=bucket, Key=key)['Metadata']
job_id = metadata.get('runpod_job_id')
```

## Recommended Fix

**Implement Option 1** - It's the least invasive and handles both cases:
1. Prevents duplicates by matching on loraUrl
2. Preserves detailed webhook entries (with parameters)
3. Only creates minimal entries for truly new S3 files
4. Doesn't require changes to training flow or S3 uploads

## Implementation Status

### ✅ COMPLETED: S3 Sync Fix

**File Modified**: `/ui/config/utils/s3-lora-sync.ts` (lines 148-189)

**Changes Made**:
1. Enhanced version matching logic to check multiple criteria:
   - Match by loraUrl containing filename (handles different S3 URLs)
   - Match by version name
   - Match by version ID (for previous S3 sync entries)

2. Update behavior:
   - If match found: Updates loraUrl, status, and lastSynced
   - Preserves existing parameters and metadata from webhook
   - Only creates new entry if no match found

3. Better logging:
   - Logs when updating existing version
   - Logs when creating new version
   - Shows version ID and filename for debugging

**Result**: S3 sync now updates existing webhook entries instead of creating duplicates.

### ✅ COMPLETED: Cleanup Script

**File Created**: `/scripts/cleanup_duplicate_versions.py`

**Features**:
- Scans all style folders for training_versions.json files
- Identifies duplicates by matching loraUrl/filename
- Keeps the best entry (detailed parameters > has completedAt > newest)
- Removes duplicate entries
- Creates backups before modifying files
- Dry-run mode by default (use --apply to actually clean up)

**Usage**:
```bash
# Dry run (see what would be removed)
python3 scripts/cleanup_duplicate_versions.py

# Actually clean up duplicates
python3 scripts/cleanup_duplicate_versions.py --apply

# Specify base directory
python3 scripts/cleanup_duplicate_versions.py --base-dir /path/to/actor_maker --apply
```

**Priority Logic**:
1. Entries with detailed parameters (from webhook) are preferred
2. Entries with completedAt timestamp are preferred
3. Newer entries are preferred
4. Minimal "Synced from S3" entries are removed if detailed entry exists
