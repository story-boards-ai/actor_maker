# S3 Sync and Status Check Fixes - Complete Summary

## Date: October 14, 2025

## Problems Fixed

### 1. **RunPod Status Check Failing After Hours**
**Problem:** Status checks returned 404 "redis err: client is nil" for jobs completed hours ago.

**Root Cause:** 
- RunPod's `/run` endpoint returns job IDs with suffixes (e.g., `uuid-e2`)
- The `/status` endpoint expects the base UUID without the suffix
- Job data is stored in Redis with TTL and expires after a few hours

**Fix Applied:**
```typescript
// Strip the -e1, -e2, etc. suffix before querying status
const cleanJobId = jobId.replace(/-e\d+$/, '');
const statusUrl = `https://api.runpod.ai/v2/${runpodEndpoint}/status/${cleanJobId}`;
```

**File:** `ui/config/routes/training-api.ts`

---

### 2. **Webhook Handler Not Matching Job IDs**
**Problem:** Webhooks sent by RunPod couldn't update training versions because of ID mismatch.

**Root Cause:**
- Stored version IDs have suffixes: `26945dbf-4e87-4574-ad26-b1f71e865942-e2`
- Webhook sends base UUID: `26945dbf-4e87-4574-ad26-b1f71e865942`
- Exact match failed, so versions stayed "pending" even after completion

**Fix Applied:**
```typescript
// Match versions by base UUID (strip suffix from stored ID)
const versionIndex = data.versions.findIndex((v: any) => {
  if (v.id === runpodJobId) return true;
  const baseId = v.id.replace(/-e\d+$/, '');
  return baseId === runpodJobId;
});
```

**File:** `ui/config/utils/webhook-handler.ts`

---

### 3. **S3 Sync Overwriting Accelerated URLs**
**Problem:** S3 sync replaced fast accelerated URLs with slow regular S3 URLs.

**Root Cause:**
- Python script returned regular S3 URLs: `s3.us-west-1.amazonaws.com`
- Sync unconditionally overwrote existing accelerated URLs: `s3-accelerate.amazonaws.com`

**Fix Applied:**
```typescript
// Only update loraUrl if it's missing OR if we're upgrading to accelerated URL
// Never downgrade from accelerated to regular S3 URL
const hasAcceleratedUrl = version.loraUrl && version.loraUrl.includes('s3-accelerate');
const newIsAccelerated = file.url && file.url.includes('s3-accelerate');

if (!version.loraUrl) {
  version.loraUrl = file.url;  // Add if missing
} else if (!hasAcceleratedUrl && newIsAccelerated) {
  version.loraUrl = file.url;  // Upgrade to accelerated
} else if (hasAcceleratedUrl) {
  // Keep existing accelerated URL - DON'T OVERWRITE
} else {
  version.loraUrl = file.url;  // Update regular URLs
}
```

**File:** `ui/config/utils/s3-lora-sync.ts`

---

### 4. **S3 Sync Not Matching Version Names**
**Problem:** S3 sync created duplicate entries instead of updating existing versions.

**Root Cause:**
- Version names: "V1", "V2", "V3", "V4"
- S3 filenames: "style_59_vV1.safetensors", "style_59_vV2.safetensors"
- No matching logic existed to connect them

**Fix Applied:**
```typescript
// Match by version number (e.g., "V4" matches "style_59_vV4.safetensors")
const filenameVersionMatch = file.filename.match(/_(v[V]?\d+)\.safetensors$/i);
if (filenameVersionMatch) {
  const filenameVersion = filenameVersionMatch[1].toUpperCase();
  const normalizedFilenameVersion = filenameVersion.replace(/^VV/, 'V');
  
  if (v.name && v.name.toUpperCase() === normalizedFilenameVersion) {
    return true;  // Match found!
  }
}
```

**File:** `ui/config/utils/s3-lora-sync.ts`

---

### 5. **Duplicate Entries from Failed Syncs**
**Problem:** Multiple duplicate entries existed in training_versions.json files.

**Solution:** Ran cleanup script to remove duplicates:
```bash
python3 scripts/cleanup_duplicate_versions.py --apply
```

**Results:**
- 7 files had duplicates
- 7 duplicates removed
- Backups created with `.backup` extension

---

### 6. **CurrentTraining Type Missing "pending" Status**
**Problem:** TypeScript error when setting currentTraining status to "pending".

**Fix Applied:**
```typescript
export interface CurrentTraining {
  jobId: string;
  startTime: number;
  estimatedDuration: number;
  status: 'pending' | 'starting' | 'training' | 'completed' | 'failed';  // Added 'pending'
}
```

**File:** `ui/src/components/LoRATraining/types.ts`

---

### 7. **All S3 URLs Changed to Regular Format**
**Problem:** Previous sync changed all accelerated URLs to regular format.

**Solution:** Bulk replaced all URLs back to accelerated format:
```bash
find resources/style_images -name "training_versions.json" -type f \
  -exec sed -i '' 's|s3\.us-west-1\.amazonaws\.com|s3-accelerate.amazonaws.com|g' {} \;
```

---

## How to Check Job Status Hours Later

### Option 1: Webhook (RECOMMENDED - Automatic)
- Webhook automatically updates training_versions.json when job completes
- No manual intervention needed
- Works indefinitely (not limited by Redis TTL)
- **Now fixed** to properly match job IDs

### Option 2: Manual Status Check (Within TTL Window)
- Click "Check Status" button in History tab
- Works if job is still within Redis TTL (~few hours)
- **Now fixed** to strip suffix before querying

### Option 3: RunPod Dashboard (Always Works)
- Go to https://runpod.io/console/serverless
- Find your endpoint
- View job history and logs
- Works indefinitely

### Option 4: S3 Sync (For Completed Jobs)
- Click "Sync S3 LoRAs" button
- Finds completed LoRAs in S3
- **Now fixed** to:
  - Match by version name
  - Preserve accelerated URLs
  - Not create duplicates

---

## Testing Checklist

- [x] Status check strips `-e` suffix
- [x] Webhook matches jobs with suffix mismatch
- [x] S3 sync preserves accelerated URLs
- [x] S3 sync matches by version name
- [x] S3 sync doesn't create duplicates
- [x] All duplicate entries cleaned up
- [x] All URLs restored to accelerated format
- [x] TypeScript types updated for "pending" status

---

## Files Modified

1. `ui/config/routes/training-api.ts` - Status check suffix stripping
2. `ui/config/utils/webhook-handler.ts` - Webhook ID matching
3. `ui/config/utils/s3-lora-sync.ts` - URL preservation + version name matching
4. `ui/src/components/LoRATraining/types.ts` - Added "pending" status
5. `resources/style_images/*/training_versions.json` - Cleaned duplicates, restored URLs

---

## Key Learnings

1. **RunPod Job IDs:** The `-e1`, `-e2` suffixes indicate execution attempts (retries)
2. **Redis TTL:** Job status is only available for a few hours after completion
3. **Webhooks are Essential:** For long-running jobs, webhooks are the only reliable way to get results
4. **S3 Accelerated URLs:** Provide faster downloads via CloudFront CDN
5. **Version Name Matching:** Critical for connecting S3 files to training configurations

---

## Future Improvements

1. Consider storing webhook payloads for debugging
2. Add retry logic for failed webhook updates
3. Implement job status caching to reduce API calls
4. Add UI indicator for jobs outside Redis TTL window
5. Consider periodic S3 sync for auto-recovery
