# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- AWS S3 integration (`src/utils/s3.py`)
  - S3Client class for file operations
  - Upload/download/delete functionality
  - URL parsing and file existence checks
  - Base64 encoding support
- Training data S3 utilities (`src/utils/training_s3.py`)
  - TrainingS3Uploader class
  - Proper naming conventions for training files
  - Batch upload support for styles and actors
- Image processing utilities (`src/utils/image_processing.py`)
  - Format conversion (JPEG, PNG, WEBP)
  - Resizing with aspect ratio preservation
  - Thumbnail generation
  - Base64 encoding/decoding
  - Image validation and info extraction
- S3 usage examples (`examples/s3_usage.py`)
- Unit tests for S3 and image processing
- S3 implementation documentation (`docs/S3_IMPLEMENTATION.md`)

### Changed
- Updated `requirements.txt` to include boto3 and Pillow
- Updated `.env.example` with AWS credentials and bucket names
- Updated README.md to reflect utilities module completion

### Planned
- Training data generation functionality
- LoRA training execution
- Workflow manipulation utilities
- CLI scripts for common tasks
- Comprehensive test suite
- CI/CD pipeline

## [0.1.0] - 2025-10-10

### Added
- Initial project structure with organized directories
- RunPod integration module (`src/runpod/`)
  - Serverless worker image generation
  - Direct pod-based image generation
  - Smart router with automatic fallback
  - Configuration management
- Project documentation
  - README.md with quick start guide
  - PROJECT_STRUCTURE.md with detailed organization
  - CONTRIBUTING.md with development guidelines
  - QUICK_REFERENCE.md for common tasks
  - IMPLEMENTATION_SUMMARY.md with technical details
- Development tooling
  - setup.py for package installation
  - pyproject.toml for modern Python tooling
  - Makefile with common development commands
  - .editorconfig for consistent code style
- Testing infrastructure
  - test_setup.py for environment validation
  - Placeholder test directories (unit/integration)
- Example scripts
  - example_usage.py demonstrating all features
- Placeholder modules for future development
  - src/training/ for LoRA training
  - src/utils/ for shared utilities
  - src/workflows_lib/ for workflow management

### Documentation
- Complete API documentation in docstrings
- Usage examples for all features
- Architecture diagram and explanations
- Environment variable documentation

### Changed
- Reorganized from flat structure to modular architecture
- Updated import paths to use `src/` prefix
- Consolidated documentation in `docs/` directory

[Unreleased]: https://github.com/yourusername/actor_maker/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/actor_maker/releases/tag/v0.1.0
