#!/usr/bin/env python3
"""
Regenerate actorsData.ts from actorsData.json.
This ensures the TypeScript file includes all fields from the JSON, including the 'good' flag.
"""

import json
from pathlib import Path

def regenerate_actors_ts():
    """Regenerate the TypeScript file from JSON."""
    project_root = Path(__file__).parent.parent
    
    # Read the JSON file
    json_file = project_root / "data" / "actorsData.json"
    ts_file = project_root / "data" / "actorsData.ts"
    
    if not json_file.exists():
        print(f"❌ Error: {json_file} not found")
        return 1
    
    print(f"📖 Reading {json_file}")
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    print(f"✍️  Writing {ts_file}")
    with open(ts_file, 'w') as f:
        f.write("// Auto-generated from system_actors/characters.json\n")
        f.write("// This file contains all actor metadata including poster frames and LoRA URLs\n\n")
        f.write("export const actorsLibraryData = ")
        json.dump(data, f, indent=2)
        f.write(";\n")
    
    # Count actors with 'good' flag
    good_count = sum(1 for actor in data if actor.get('good', False))
    
    print(f"✅ Successfully regenerated actorsData.ts")
    print(f"   Total actors: {len(data)}")
    print(f"   Actors marked as good: {good_count}")
    
    return 0

if __name__ == "__main__":
    exit(regenerate_actors_ts())
