# Setup Instructions

## Install Required Packages

The training data automation system requires additional Python packages. Install them with:

```bash
# Make sure you're in the virtual environment
source venv/bin/activate  # or: . activate.sh

# Install required packages
pip install Pillow requests openai
```

## Verify Installation

Test that the script can run:

```bash
python scripts/training_data/evaluate_and_balance.py --show-progress
```

If you see the progress summary (even if empty), the setup is complete!

## Required Environment Variables

Make sure these are set:

```bash
export OPENAI_API_KEY="sk-..."           # For GPT Vision
export REPLICATE_API_TOKEN="r8_..."      # For image generation (if using --execute)
export AWS_ACCESS_KEY="..."              # For S3 operations (if using --execute)
export AWS_ACCESS_SECRET="..."           # For S3 operations (if using --execute)
export AWS_REGION="us-west-1"            # For S3 operations (if using --execute)
```

**Note:** For dry-run mode (evaluation only), you only need `OPENAI_API_KEY`.

## Quick Test

```bash
# Test with a random actor (dry-run, safe)
python scripts/training_data/test_evaluation.py
```

This will evaluate one random actor and show you the results.
