#!/usr/bin/env python3
"""
Export Validated Settings to Backend Format

Reads validator settings sets marked as 'excellent' or 'good',
and outputs backend-compatible JSON for updating styles.repository.ts
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime


def map_sampler_name(sampler: str) -> str:
    """Map validator sampler names to backend ComfyUI sampler names."""
    mapping = {
        'euler': 'euler',
        'euler_a': 'euler_ancestral',
        'heun': 'heun',
        'dpm_2': 'dpm_2',
        'dpm_2_a': 'dpm_2_ancestral',
        'dpmpp_2s_a': 'dpmpp_2s_ancestral',
        'dpmpp_sde': 'dpmpp_sde',
        'dpmpp_2m': 'dpmpp_2m',
        'uni_pc': 'uni_pc',
    }
    return mapping.get(sampler.lower(), sampler)


def filter_validated_settings(settings_sets: List[dict], min_rating: str = 'good') -> Optional[dict]:
    """
    Filter settings sets to find the best validated one.
    
    Args:
        settings_sets: List of settings sets for a style
        min_rating: Minimum rating to consider ('excellent' or 'good')
    
    Returns:
        Best settings set or None
    """
    rating_priority = {'excellent': 3, 'good': 2, 'acceptable': 1, 'poor': 0, 'failed': 0, None: 0}
    
    valid_ratings = ['excellent', 'good'] if min_rating == 'good' else ['excellent']
    
    # Filter to only validated settings
    validated = [s for s in settings_sets if s.get('rating') in valid_ratings]
    
    if not validated:
        return None
    
    # Sort by rating priority (excellent first), then by timestamp (newest first)
    validated.sort(
        key=lambda s: (rating_priority.get(s.get('rating'), 0), s.get('timestamp', '')),
        reverse=True
    )
    
    return validated[0]


def export_validated_settings(settings_dir: str, min_rating: str = 'good') -> dict:
    """
    Export validated settings from validator settings sets.
    
    Args:
        settings_dir: Path to validator_settings_sets directory
        min_rating: Minimum rating to export ('excellent' or 'good')
    
    Returns:
        Dict with export results and data
    """
    settings_path = Path(settings_dir)
    
    if not settings_path.exists():
        return {
            'success': False,
            'error': f'Settings directory not found: {settings_dir}',
            'validatedStyles': [],
            'totalStyles': 0,
            'exportedCount': 0
        }
    
    validated_styles = []
    total_files = 0
    
    # Read all style_*.json files
    for file in sorted(settings_path.glob('style_*.json')):
        total_files += 1
        try:
            with open(file, 'r') as f:
                settings_sets = json.load(f)
            
            if not settings_sets:
                continue
            
            # Find best validated settings
            best = filter_validated_settings(settings_sets, min_rating=min_rating)
            
            if best:
                # Extract style ID from filename
                style_id = file.stem.replace('style_', '')
                
                # Map to backend format
                backend_settings = {
                    'styleId': style_id,
                    'styleName': best.get('styleName', f'Style {style_id}'),
                    'modelName': best.get('modelName', 'Unknown'),
                    'rating': best.get('rating'),
                    'comment': best.get('comment', ''),
                    'timestamp': best.get('timestamp', ''),
                    'settingsSetName': best.get('name', ''),
                    # Backend field mappings
                    'lora_weight': round(best.get('loraWeight', 1.0), 2),
                    'character_lora_weight': round(best.get('characterLoraWeight', 0.9), 2),
                    'cine_lora_weight': round(best.get('cineLoraWeight', 0.8), 2),
                    'frontpad': best.get('frontpad', ''),
                    'backpad': best.get('backpad', ''),
                    'steps': best.get('steps', 20),
                    'fluxGuidance': round(best.get('guidance', 3.5), 1),
                    'samplerNameComfyUI': map_sampler_name(best.get('samplerName', 'euler')),
                    'schedulerName': best.get('schedulerName', 'simple'),
                    'embeddingStrength': round(best.get('loraWeight', 1.0), 2),
                }
                
                validated_styles.append(backend_settings)
                print(f"✅ Style {style_id}: {best.get('rating')} rated (model: {best.get('modelName')})", file=sys.stderr)
        except Exception as e:
            print(f'❌ Failed to process {file.name}: {e}', file=sys.stderr)
    
    return {
        'success': True,
        'validatedStyles': validated_styles,
        'totalStyles': total_files,
        'exportedCount': len(validated_styles),
        'minRating': min_rating,
        'exportedAt': datetime.utcnow().isoformat() + 'Z'
    }


def main():
    """Main entry point - supports both stdin (API mode) and CLI mode."""
    
    # API mode: read JSON from stdin
    if not sys.stdin.isatty():
        try:
            input_data = json.load(sys.stdin)
            
            # Get project root (script is in scripts/ directory)
            project_root = Path(__file__).parent.parent
            settings_dir = project_root / input_data.get('settingsDir', 'data/validator_settings_sets')
            min_rating = input_data.get('minRating', 'good')
            
            print("📦 Exporting validated settings...", file=sys.stderr)
            result = export_validated_settings(str(settings_dir), min_rating=min_rating)
            
            # Output result as JSON to stdout
            print(json.dumps(result))
            sys.exit(0 if result['success'] and result['exportedCount'] > 0 else 1)
            
        except Exception as e:
            error_result = {
                'success': False,
                'error': str(e),
                'validatedStyles': [],
                'totalStyles': 0,
                'exportedCount': 0
            }
            print(json.dumps(error_result))
            sys.exit(1)
    
    # CLI mode: parse arguments
    else:
        import argparse
        
        parser = argparse.ArgumentParser(description='Export validated style settings')
        parser.add_argument(
            '--rating',
            choices=['excellent', 'good'],
            default='good',
            help='Minimum rating to export (default: good)'
        )
        parser.add_argument(
            '--output',
            help='Output JSON file (default: stdout)'
        )
        
        args = parser.parse_args()
        
        # Get project root
        project_root = Path(__file__).parent.parent
        settings_dir = project_root / 'data' / 'validator_settings_sets'
        
        print(f"📦 Exporting validated settings from: {settings_dir}", file=sys.stderr)
        result = export_validated_settings(str(settings_dir), min_rating=args.rating)
        
        # Output as JSON
        output_json = json.dumps(result, indent=2)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output_json)
            print(f'✅ Exported to {args.output}', file=sys.stderr)
        else:
            print(output_json)
        
        print(f"\n📊 Summary: {result['exportedCount']}/{result['totalStyles']} styles exported", file=sys.stderr)
        
        # Exit with error code if no validated settings found
        sys.exit(0 if result['success'] and result['exportedCount'] > 0 else 1)


if __name__ == '__main__':
    main()
