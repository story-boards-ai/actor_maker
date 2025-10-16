#!/bin/bash
# Quick script to sync all actor training data from S3
# Usage: ./sync_all_training_data.sh [workers_per_actor] [concurrent_actors]
# Default: 10 workers per actor, 5 concurrent actors

cd "$(dirname "$0")"

echo "🚀 Syncing all actor training data from S3..."
echo ""

python3 scripts/sync_all_actors_training_data.py ${1:-10} ${2:-5}

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ All done! Training data synced successfully."
else
    echo ""
    echo "⚠️  Sync completed with some errors. Check output above."
fi

exit $exit_code
