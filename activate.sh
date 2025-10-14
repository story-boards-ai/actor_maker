#!/bin/bash
# Convenience script to activate the virtual environment
# Usage: source activate.sh

if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Virtual environment activated"
    echo "Python: $(which python)"
    echo "Pip: $(which pip)"
    echo ""
    echo "To deactivate, run: deactivate"
else
    echo "❌ Virtual environment not found!"
    echo "Run 'make venv' or 'make setup' to create it"
fi
