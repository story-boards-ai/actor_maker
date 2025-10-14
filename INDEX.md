# Project Index

Quick navigation guide for the actor_maker project.

## 📚 Start Here

| Document | Purpose | For |
|----------|---------|-----|
| [README.md](README.md) | Main documentation, quick start, API reference | Everyone |
| [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) | Quick reference card for common tasks | Developers |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Detailed project organization | Developers |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development guidelines | Contributors |

## 🗂️ Project Structure

### Source Code (`src/`)

#### RunPod Integration ✅ **COMPLETE**
```
src/runpod/
├── __init__.py          # Module exports
├── config.py            # Configuration management
├── serverless.py        # Serverless worker generation  
├── pod.py              # Direct pod generation
└── router.py           # Smart routing with fallback
```

**What it does**: Image generation via RunPod serverless workers or pods  
**Status**: Complete and production-ready  
**Documentation**: [IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)

#### Training Module 📋 **PLANNED**
```
src/training/
└── __init__.py          # Placeholder
```

**What it will do**: LoRA training data generation and execution  
**Status**: Planned for Phase 2  
**See**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md#src-training)

#### Utilities ✅ **COMPLETE**
```
src/utils/
├── __init__.py          # Module exports
├── s3.py               # AWS S3 client
├── training_s3.py      # Training data uploads
└── image_processing.py # Image manipulation
```

**What it does**: S3 storage, image processing, training data management  
**Status**: Complete  
**Documentation**: [S3_IMPLEMENTATION.md](docs/S3_IMPLEMENTATION.md)

#### Workflow Management 📋 **PLANNED**
```
src/workflows_lib/
└── __init__.py          # Placeholder
```

**What it will do**: ComfyUI workflow manipulation  
**Status**: Planned for Phase 4  
**See**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md#src-workflows-lib)

### Workflows (`workflows/`)
```
workflows/
└── style_transfer_3_API.json    # Style transfer workflow
```

**What it is**: ComfyUI workflow JSON files  
**Add new workflows here** for different generation tasks

### Examples (`examples/`)
```
examples/
├── example_usage.py             # RunPod integration examples
└── s3_usage.py                  # S3 and image processing examples
```

**Run**: 
```bash
cd examples
python example_usage.py  # RunPod examples
python s3_usage.py       # S3 and image processing
```

### Tests (`tests/`)
```
tests/
├── test_setup.py                # Environment validation
├── unit/                        # Unit tests
│   ├── test_s3.py              # S3 client tests
│   └── test_image_processing.py # Image processing tests
└── integration/                 # Integration tests (planned)
```

**Run tests**: 
```bash
cd tests && python test_setup.py              # Setup validation
python -m pytest tests/unit/ -v               # All unit tests
python -m pytest tests/unit/test_s3.py -v     # S3 tests only
```

### Documentation (`docs/`)
```
docs/
├── IMPLEMENTATION_SUMMARY.md    # RunPod implementation details
├── QUICK_REFERENCE.md           # Quick reference card
└── S3_IMPLEMENTATION.md         # S3 implementation details
```

## 🛠️ Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (gitignored, create from .env.example) |
| `.env.example` | Environment variable template |
| `.gitignore` | Git ignore patterns |
| `.editorconfig` | Editor configuration for consistent style |
| `requirements.txt` | Python dependencies |
| `setup.py` | Package setup for pip installation |
| `pyproject.toml` | Modern Python project configuration |
| `Makefile` | Development command shortcuts |

## 📖 Documentation Files

| File | Content |
|------|---------|
| [README.md](README.md) | Main documentation |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Detailed organization |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development guidelines |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [REORGANIZATION_SUMMARY.md](REORGANIZATION_SUMMARY.md) | Reorganization details |
| [INDEX.md](INDEX.md) | This file - navigation guide |
| [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) | Quick reference card |
| [docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md) | Technical details |

## 🚀 Quick Commands

### Setup
```bash
make setup              # Initial setup (install + create .env)
make install           # Install dependencies only
make install-dev       # Install with dev dependencies
```

### Testing
```bash
make test-setup        # Validate environment configuration
make test              # Run all tests (when available)
make test-unit         # Run unit tests only
make test-integration  # Run integration tests only
make coverage          # Run tests with coverage report
```

### Code Quality
```bash
make lint              # Run linting (flake8)
make format            # Format code (black)
make type-check        # Type checking (mypy)
make check-all         # Run all checks
```

### Examples
```bash
make run-examples      # Run example scripts
cd examples && python example_usage.py
```

### Cleanup
```bash
make clean             # Remove build artifacts
make clean-all         # Deep clean including .env
```

## 📦 Module Imports

### RunPod Integration
```python
# All-in-one import
from src.runpod import (
    generate_image,              # Main function (recommended)
    generate_serverless_image,   # Serverless only
    generate_pod_image,          # Pod only
    RunPodRouter,                # Router class
    RunPodServerlessClient,      # Serverless client
    RunPodPodClient,             # Pod client
    RunPodConfig,                # Configuration
)

# Simple import
from src.runpod import generate_image
```

### S3 and Utilities
```python
# S3 operations
from src.utils import (
    S3Client,
    upload_to_s3,
    download_from_s3,
    download_s3_to_base64,
    delete_from_s3,
    upload_style_training_images,
    upload_actor_training_images,
)

# Image processing
from src.utils import (
    image_to_base64,
    base64_to_image,
    resize_image,
    create_thumbnail,
    get_image_info,
)
```

### Future Imports (Planned)
```python
from src.training import generate_training_data
from src.workflows_lib import load_workflow, modify_node
```

## 🎯 Common Tasks

### Generate an Image
```python
from src.runpod import generate_image

payload = {"input": {"workflow": {...}}}
result = generate_image(payload, mode="wizard")
```

See: [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)

### Validate Setup
```bash
cd tests
python test_setup.py
```

### Upload Training Data
```python
from src.utils import upload_style_training_images

# Prepare training images
images = [(img1_bytes, "img1.jpg"), (img2_bytes, "img2.jpg")]

# Upload
urls = upload_style_training_images(
    user_id="user123",
    style_id="style456",
    images=images
)
```

### Process Images
```python
from src.utils import resize_image, image_to_base64

# Resize
resized = resize_image(image_bytes, max_size=512)

# Convert to base64
base64_str = image_to_base64(resized)
```

### Run Examples
```bash
cd examples
python example_usage.py  # RunPod integration
python s3_usage.py       # S3 and image processing
```

### Add New Feature
1. Create file in `src/module_name/feature.py`
2. Write tests in `tests/unit/test_feature.py`
3. Add example in `examples/feature_example.py`
4. Update documentation

See: [CONTRIBUTING.md](CONTRIBUTING.md)

### Update Dependencies
```bash
pip install new-package
pip freeze | grep new-package >> requirements.txt
# Also update pyproject.toml
```

## 🔍 Finding Things

### "Where is the RunPod integration code?"
→ `src/runpod/`

### "How do I use the API?"
→ [README.md](README.md) or [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)

### "How do I contribute?"
→ [CONTRIBUTING.md](CONTRIBUTING.md)

### "What's the project structure?"
→ [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

### "How was this organized?"
→ [REORGANIZATION_SUMMARY.md](REORGANIZATION_SUMMARY.md)

### "What changed in version X?"
→ [CHANGELOG.md](CHANGELOG.md)

### "What environment variables do I need?"
→ `.env.example` or [README.md](README.md#environment-variables)

### "How do I run tests?"
→ `make test` or [CONTRIBUTING.md](CONTRIBUTING.md#testing)

### "Where are the workflows?"
→ `workflows/` directory

### "Where are the examples?"
→ `examples/` directory

## 📊 Project Status

### ✅ Completed
- [x] RunPod integration (serverless + pod)
- [x] AWS S3 integration
- [x] Image processing utilities
- [x] Training data upload utilities
- [x] Project reorganization
- [x] Comprehensive documentation
- [x] Development tooling
- [x] Testing infrastructure
- [x] Unit tests for S3 and image processing

### 📋 Planned
- [ ] Training data generation
- [ ] LoRA training execution
- [ ] Workflow manipulation utilities
- [ ] CLI scripts
- [ ] Integration test suite
- [ ] CI/CD pipeline

### 🎯 Current Phase
**Phase 1**: Infrastructure ✅ Complete  
**Phase 1.5**: Utilities ✅ Complete  
**Next Phase**: Phase 2 - Training Functionality

## 🆘 Getting Help

1. **Quick questions**: Check [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)
2. **API usage**: See [README.md](README.md) examples section
3. **Contributing**: Read [CONTRIBUTING.md](CONTRIBUTING.md)
4. **Structure questions**: See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
5. **Technical details**: See [IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)

## 🔗 External Resources

- [RunPod API Documentation](https://docs.runpod.io/)
- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI)
- [Python Packaging Guide](https://packaging.python.org/)

---

**Last Updated**: 2025-10-10  
**Version**: 0.1.0  
**Status**: Production Ready (Phase 1)
