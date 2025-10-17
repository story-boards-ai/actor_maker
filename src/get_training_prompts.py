#!/usr/bin/env python3
"""
CLI script to get training prompts for an actor.
Called by the Node.js frontend to retrieve prompts from actor_training_prompts.py
"""

import sys
import json
from actor_training_prompts import get_actor_training_prompts, get_actor_descriptor


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Actor type required"}), file=sys.stderr)
        sys.exit(1)
    
    actor_type = sys.argv[1]
    actor_sex = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Get descriptor
    descriptor = get_actor_descriptor(actor_type, actor_sex)
    
    # Get prompts
    prompts = get_actor_training_prompts(descriptor)
    
    # Output as JSON
    print(json.dumps(prompts))


if __name__ == '__main__':
    main()
