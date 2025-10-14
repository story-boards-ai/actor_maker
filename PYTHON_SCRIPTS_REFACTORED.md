# Python Scripts Refactored

## Overview

All inline Python scripts have been refactored into proper Python files in the `/scripts` directory. This improves maintainability, testability, and follows best practices.

---

## ❌ Before: Inline Python Scripts

Previously, Python code was embedded as strings in TypeScript files:

```typescript
const pythonScript = `
import sys
import json
from src.utils.s3 import S3Client

try:
    # 50+ lines of Python code here...
    print(json.dumps(result))
except Exception as e:
    sys.exit(1)
`

executePython({ scriptCode: pythonScript, ... })
```

**Problems:**
- ❌ No syntax highlighting
- ❌ No linting or type checking
- ❌ Hard to test independently
- ❌ Difficult to maintain
- ❌ No IDE support
- ❌ Code duplication

---

## ✅ After: Dedicated Python Files

Now each operation has its own Python file:

```typescript
const pythonScriptPath = path.join(projectRoot, 'scripts', 's3_upload.py')

executePython({ 
  scriptPath: pythonScriptPath,
  cwd: projectRoot,
  stdinData: { styleId, images },
  logPrefix: '[S3-UPLOAD]'
})
```

**Benefits:**
- ✅ Full Python IDE support
- ✅ Syntax highlighting and linting
- ✅ Easy to test independently
- ✅ Better maintainability
- ✅ Reusable across projects
- ✅ Version control friendly

---

## 📁 New Python Scripts

### 1. `/scripts/s3_check_status.py`
**Purpose:** List all files in S3 for a style

**Input (stdin):**
```json
{
  "styleId": "16"
}
```

**Output (stdout):**
```json
{
  "files": ["image1.jpg", "image2.jpg"],
  "count": 2
}
```

**Usage:**
```bash
echo '{"styleId":"16"}' | python scripts/s3_check_status.py
```

---

### 2. `/scripts/s3_upload.py`
**Purpose:** Upload images to S3 with metadata tracking

**Input (stdin):**
```json
{
  "styleId": "16",
  "images": [
    {
      "filename": "image1.jpg",
      "localPath": "/resources/style_images/16_dynamic_simplicity/image1.jpg"
    }
  ]
}
```

**Output (stdout):**
```json
{
  "uploaded": 1,
  "failed": 0,
  "uploaded_files": [
    {
      "filename": "image1.jpg",
      "s3_key": "styles/16/image1.jpg",
      "s3_url": "https://...",
      "size_bytes": 123456,
      "md5_hash": "abc123...",
      "uploaded_at": "2025-10-11T11:00:00.000Z",
      "local_path": "/resources/..."
    }
  ]
}
```

**Features:**
- URL decoding for filenames with spaces
- MD5 hash calculation
- Metadata capture for manifest
- Error handling per file

---

### 3. `/scripts/s3_delete.py`
**Purpose:** Delete images from S3

**Input (stdin):**
```json
{
  "styleId": "16",
  "filenames": ["image1.jpg", "image2.jpg"]
}
```

**Output (stdout):**
```json
{
  "deleted": 2,
  "failed": 0
}
```

---

### 4. `/scripts/s3_download.py`
**Purpose:** Download all images from S3 for a style

**Input (stdin):**
```json
{
  "styleId": "16",
  "localDir": "/path/to/resources/style_images/16_dynamic_simplicity"
}
```

**Output (stdout):**
```json
{
  "downloaded": 25,
  "failed": 0
}
```

**Features:**
- Creates local directory if needed
- Downloads all files for a style
- Error handling per file

---

### 5. `/scripts/s3_compare.py`
**Purpose:** Compare local files with S3 to detect differences

**Input (stdin):**
```json
{
  "styleId": "16",
  "localImages": [
    {
      "filename": "image1.jpg",
      "localPath": "/resources/..."
    }
  ]
}
```

**Output (stdout):**
```json
{
  "missing_in_s3": [...],
  "missing_locally": [...],
  "different": [...],
  "identical": [...],
  "errors": [],
  "summary": {
    "total_local": 25,
    "total_s3": 23,
    "missing_in_s3": 3,
    "missing_locally": 1,
    "different": 2,
    "identical": 20,
    "errors": 0
  }
}
```

**Features:**
- Size comparison (fast)
- MD5 hash comparison (accurate)
- Bidirectional sync detection
- Detailed categorization

---

## 🏗️ Script Structure

All scripts follow the same pattern:

```python
#!/usr/bin/env python3
"""
Script description.
"""
import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.s3 import S3Client


def main():
    """Main function."""
    try:
        # Read input from stdin
        data = json.loads(sys.stdin.read())
        
        # Process data
        result = process(data)
        
        # Output result to stdout
        print(json.dumps(result))
        
    except Exception as e:
        # Error to stderr
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

---

## 🔧 Integration with TypeScript

### Updated API Routes

**File:** `/ui/config/routes/s3-api.ts`

**Before:**
```typescript
const pythonScript = `...inline code...`
executePython({ scriptCode: pythonScript, ... })
```

**After:**
```typescript
const pythonScriptPath = path.join(projectRoot, 'scripts', 's3_upload.py')
executePython({ 
  scriptPath: pythonScriptPath,
  cwd: projectRoot,
  stdinData: { styleId, images },
  logPrefix: '[S3-UPLOAD]'
})
```

---

## ✅ Benefits

### 1. **Maintainability**
- Python code in `.py` files with proper structure
- Easy to find and modify
- Clear separation of concerns

### 2. **Testability**
- Can test scripts independently
- Easy to write unit tests
- Can run from command line

### 3. **IDE Support**
- Full Python syntax highlighting
- Linting (pylint, flake8)
- Type checking (mypy)
- Autocomplete and IntelliSense

### 4. **Reusability**
- Scripts can be used outside the web app
- Can be called from other Python code
- Can be used in CI/CD pipelines

### 5. **Version Control**
- Proper diff tracking
- Better code review
- Clear change history

### 6. **Error Handling**
- Easier to debug
- Better error messages
- Proper logging

---

## 🧪 Testing

Each script can be tested independently:

```bash
# Test s3_check_status
echo '{"styleId":"16"}' | python scripts/s3_check_status.py

# Test s3_upload
echo '{"styleId":"16","images":[...]}' | python scripts/s3_upload.py

# Test s3_compare
echo '{"styleId":"16","localImages":[...]}' | python scripts/s3_compare.py
```

---

## 📊 Code Reduction

**Inline Python in TypeScript:**
- s3-api.ts: ~450 lines of embedded Python

**Refactored:**
- s3_check_status.py: ~40 lines
- s3_upload.py: ~95 lines
- s3_delete.py: ~45 lines
- s3_download.py: ~55 lines
- s3_compare.py: ~145 lines
- s3-api.ts: ~280 lines (TypeScript only)

**Total:** Better organized, more maintainable, and easier to test!

---

## 🔄 Migration Complete

All S3 operations now use dedicated Python files:
- ✅ s3_check_status.py
- ✅ s3_upload.py
- ✅ s3_delete.py
- ✅ s3_download.py
- ✅ s3_compare.py

No more inline Python scripts in TypeScript files!

---

## 📝 Best Practices Applied

1. ✅ **Shebang line** - Scripts are executable
2. ✅ **Docstrings** - Clear documentation
3. ✅ **Main function** - Proper entry point
4. ✅ **Error handling** - Try/except with proper exit codes
5. ✅ **JSON I/O** - Stdin for input, stdout for output
6. ✅ **Path handling** - Proper path resolution
7. ✅ **Imports** - Clean import structure
8. ✅ **Type hints** - Could be added for better type safety

---

## ✨ Result

Clean separation between TypeScript (API routing) and Python (S3 operations). Each language does what it does best, with proper tooling support for both.
