#!/usr/bin/env python3
"""
Verify that all manifests have correct actor data matching actorsData.json.

This script:
1. Loads actorsData.json (source of truth)
2. Checks each manifest in actor_manifests/
3. Reports any mismatches in character_name, metadata, etc.
4. Optionally fixes mismatches

Usage:
    python scripts/verify_manifest_data.py [--fix]
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Tuple

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_actors_data() -> Dict[int, Dict[str, Any]]:
    """Load actors data from JSON file and index by ID."""
    actors_file = project_root / "data" / "actorsData.json"
    
    if not actors_file.exists():
        logger.error(f"actorsData.json not found: {actors_file}")
        sys.exit(1)
    
    with open(actors_file, 'r') as f:
        actors_list = json.load(f)
    
    # Index by ID for quick lookup
    actors_dict = {}
    for actor in actors_list:
        actor_id = actor.get('id')
        if actor_id is not None:
            actors_dict[actor_id] = actor
    
    logger.info(f"Loaded {len(actors_dict)} actors from actorsData.json")
    return actors_dict


def find_all_manifests() -> List[Path]:
    """Find all manifest files."""
    manifests_dir = project_root / "data" / "actor_manifests"
    
    if not manifests_dir.exists():
        logger.error(f"Manifests directory not found: {manifests_dir}")
        sys.exit(1)
    
    manifests = sorted(manifests_dir.glob("*_manifest.json"))
    logger.info(f"Found {len(manifests)} manifest files")
    return manifests


def extract_actor_id_from_manifest_path(manifest_path: Path) -> int:
    """Extract numeric actor ID from manifest filename."""
    # e.g., "0285_manifest.json" -> 285
    filename = manifest_path.stem  # "0285_manifest"
    numeric_id = filename.split('_')[0]  # "0285"
    return int(numeric_id)


def verify_manifest(
    manifest_path: Path,
    actors_data: Dict[int, Dict[str, Any]]
) -> Tuple[bool, List[str]]:
    """
    Verify that manifest data matches actorsData.json.
    
    Returns:
        (is_valid, list_of_issues)
    """
    issues = []
    
    # Extract actor ID from filename
    actor_id = extract_actor_id_from_manifest_path(manifest_path)
    
    # Check if actor exists in actorsData.json
    if actor_id not in actors_data:
        issues.append(f"Actor ID {actor_id} not found in actorsData.json")
        return False, issues
    
    # Load manifest
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
    except Exception as e:
        issues.append(f"Failed to load manifest: {e}")
        return False, issues
    
    # Get expected data from actorsData.json
    expected = actors_data[actor_id]
    expected_name = expected['name']
    expected_id = str(expected['id']).zfill(4)  # "0285"
    
    # Check character_id
    manifest_char_id = manifest.get('character_id', '')
    if manifest_char_id != expected_id:
        issues.append(f"character_id mismatch: manifest='{manifest_char_id}' vs expected='{expected_id}'")
    
    # Check character_name
    manifest_char_name = manifest.get('character_name', '')
    if manifest_char_name != expected_name:
        issues.append(f"character_name mismatch: manifest='{manifest_char_name}' vs expected='{expected_name}'")
    
    # Check metadata fields
    metadata = manifest.get('metadata', {})
    
    # Check metadata.name
    if metadata.get('name') != expected_name:
        issues.append(f"metadata.name mismatch: manifest='{metadata.get('name')}' vs expected='{expected_name}'")
    
    # Check metadata.id
    if metadata.get('id') != expected_id:
        issues.append(f"metadata.id mismatch: manifest='{metadata.get('id')}' vs expected='{expected_id}'")
    
    # Check metadata.age
    if metadata.get('age') != expected.get('age'):
        issues.append(f"metadata.age mismatch: manifest='{metadata.get('age')}' vs expected='{expected.get('age')}'")
    
    # Check metadata.sex
    if metadata.get('sex') != expected.get('sex'):
        issues.append(f"metadata.sex mismatch: manifest='{metadata.get('sex')}' vs expected='{expected.get('sex')}'")
    
    # Check metadata.ethnicity
    if metadata.get('ethnicity') != expected.get('ethnicity'):
        issues.append(f"metadata.ethnicity mismatch: manifest='{metadata.get('ethnicity')}' vs expected='{expected.get('ethnicity')}'")
    
    # Check metadata.face_prompt
    if metadata.get('face_prompt') != expected.get('face_prompt'):
        issues.append(f"metadata.face_prompt mismatch")
    
    return len(issues) == 0, issues


def fix_manifest(
    manifest_path: Path,
    actors_data: Dict[int, Dict[str, Any]]
) -> bool:
    """
    Fix manifest to match actorsData.json.
    
    Returns:
        True if fixed successfully, False otherwise
    """
    actor_id = extract_actor_id_from_manifest_path(manifest_path)
    
    if actor_id not in actors_data:
        logger.error(f"Cannot fix: Actor ID {actor_id} not found in actorsData.json")
        return False
    
    # Load manifest
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load manifest: {e}")
        return False
    
    # Get correct data from actorsData.json
    correct = actors_data[actor_id]
    correct_id = str(correct['id']).zfill(4)
    
    # Update manifest
    manifest['character_id'] = correct_id
    manifest['character_name'] = correct['name']
    
    # Update metadata
    if 'metadata' not in manifest:
        manifest['metadata'] = {}
    
    manifest['metadata']['id'] = correct_id
    manifest['metadata']['name'] = correct['name']
    manifest['metadata']['age'] = correct.get('age', '')
    manifest['metadata']['sex'] = correct.get('sex', '')
    manifest['metadata']['ethnicity'] = correct.get('ethnicity', '')
    manifest['metadata']['face_prompt'] = correct.get('face_prompt', '')
    manifest['metadata']['img'] = correct.get('img', '')
    manifest['metadata']['image'] = correct.get('image', '')
    
    # Add outfit and description if available
    if 'outfit' in correct:
        manifest['metadata']['outfit'] = correct['outfit']
    if 'description' in correct:
        manifest['metadata']['description'] = correct['description']
    
    # Save updated manifest
    try:
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        logger.info(f"✓ Fixed: {manifest_path.name}")
        return True
    except Exception as e:
        logger.error(f"Failed to save manifest: {e}")
        return False


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Verify manifest data matches actorsData.json',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--fix',
        action='store_true',
        help='Automatically fix mismatches'
    )
    
    args = parser.parse_args()
    
    logger.info("="*80)
    logger.info("MANIFEST DATA VERIFICATION")
    logger.info("="*80)
    
    # Load actors data (source of truth)
    actors_data = load_actors_data()
    
    # Find all manifests
    manifests = find_all_manifests()
    
    # Verify each manifest
    valid_count = 0
    invalid_count = 0
    fixed_count = 0
    invalid_manifests = []
    
    for manifest_path in manifests:
        actor_id = extract_actor_id_from_manifest_path(manifest_path)
        
        is_valid, issues = verify_manifest(manifest_path, actors_data)
        
        if is_valid:
            valid_count += 1
            logger.debug(f"✓ {manifest_path.name} - OK")
        else:
            invalid_count += 1
            invalid_manifests.append((manifest_path, issues))
            
            logger.warning(f"✗ {manifest_path.name} - ISSUES FOUND:")
            for issue in issues:
                logger.warning(f"  - {issue}")
            
            # Fix if requested
            if args.fix:
                if fix_manifest(manifest_path, actors_data):
                    fixed_count += 1
                    logger.info(f"  → Fixed {manifest_path.name}")
    
    # Print summary
    logger.info("="*80)
    logger.info("VERIFICATION SUMMARY")
    logger.info("="*80)
    logger.info(f"Total manifests: {len(manifests)}")
    logger.info(f"Valid: {valid_count}")
    logger.info(f"Invalid: {invalid_count}")
    
    if args.fix:
        logger.info(f"Fixed: {fixed_count}")
    
    if invalid_manifests and not args.fix:
        logger.info("")
        logger.info("Run with --fix to automatically correct mismatches")
    
    logger.info("="*80)
    
    # Exit with error code if there are unfixed issues
    if invalid_count > 0 and not args.fix:
        sys.exit(1)
    elif invalid_count > 0 and fixed_count < invalid_count:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
