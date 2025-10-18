#!/bin/bash
# Wrapper script to run auto training data generator with venv and environment variables

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load environment variables from .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "Loading environment variables from .env..."
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$' | xargs)
else
    echo "⚠️  Warning: .env file not found at $PROJECT_ROOT/.env"
    echo "   Make sure REPLICATE_API_TOKEN and AWS credentials are set"
fi

# Use venv Python if available
if [ -f "$PROJECT_ROOT/venv/bin/python" ]; then
    PYTHON="$PROJECT_ROOT/venv/bin/python"
else
    PYTHON="python3"
fi

echo "Using Python: $PYTHON"
echo ""

# Verify critical environment variables
if [ -z "$REPLICATE_API_TOKEN" ]; then
    echo "❌ ERROR: REPLICATE_API_TOKEN is not set"
    echo "   Please set it in your .env file"
    exit 1
fi

if [ -z "$AWS_ACCESS_KEY" ]; then
    echo "⚠️  Warning: AWS_ACCESS_KEY is not set"
fi

echo "✓ Environment variables loaded"
echo ""

# Run the script with all arguments passed through
"$PYTHON" "$SCRIPT_DIR/auto_generate_training_data.py" "$@"
