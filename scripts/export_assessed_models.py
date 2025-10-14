#!/usr/bin/env python3
"""
Export Settings from Assessed Models

Reads model assessments (ratings) and exports settings from models
rated as 'excellent' or 'good' for backend styles.repository.ts
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


def get_best_assessed_model(style_dir: Path, min_rating: str = 'good') -> Optional[dict]:
    """
    Find the best-rated model for a style.
    
    Args:
        style_dir: Path to style directory in resources/style_images
        min_rating: Minimum rating to consider
    
    Returns:
        Assessment dict with modelId or None
    """
    assessments_dir = style_dir / 'assessments'
    
    if not assessments_dir.exists():
        return None
    
    rating_priority = {'excellent': 3, 'good': 2, 'acceptable': 1, 'poor': 0, 'failed': 0}
    valid_ratings = ['excellent', 'good'] if min_rating == 'good' else ['excellent']
    
    best_assessment = None
    best_score = 0
    
    # Read all assessment files
    for assessment_file in assessments_dir.glob('*.json'):
        try:
            with open(assessment_file, 'r') as f:
                assessment = json.load(f)
            
            rating = assessment.get('rating')
            if rating in valid_ratings:
                score = rating_priority.get(rating, 0)
                if score > best_score:
                    best_score = score
                    best_assessment = assessment
        except Exception as e:
            print(f"Error reading {assessment_file}: {e}", file=sys.stderr)
    
    return best_assessment


def get_model_settings(training_versions_file: Path, model_id: str) -> Optional[dict]:
    """
    Get settings for a specific model from training versions file.
    
    Args:
        training_versions_file: Path to style_{id}.json in data/training_versions
        model_id: Model ID to find
    
    Returns:
        Model settings dict or None
    """
    if not training_versions_file.exists():
        return None
    
    try:
        with open(training_versions_file, 'r') as f:
            versions = json.load(f)
        
        # Find the model by ID
        for version in versions:
            if version.get('id') == model_id or version.get('modelId') == model_id:
                return version
        
        return None
    except Exception as e:
        print(f"Error reading training versions: {e}", file=sys.stderr)
        return None


def export_assessed_models(project_root: str, min_rating: str = 'good') -> dict:
    """
    Export settings from assessed models.
    
    Args:
        project_root: Path to project root
        min_rating: Minimum rating to export
    
    Returns:
        Dict with export results
    """
    root_path = Path(project_root)
    styles_dir = root_path / 'resources' / 'style_images'
    training_versions_dir = root_path / 'data' / 'training_versions'
    
    if not styles_dir.exists():
        return {
            'success': False,
            'error': f'Styles directory not found: {styles_dir}',
            'validatedStyles': [],
            'totalStyles': 0,
            'exportedCount': 0
        }
    
    validated_styles = []
    total_styles = 0
    
    # Iterate through all style directories
    for style_dir in sorted(styles_dir.iterdir()):
        if not style_dir.is_dir():
            continue
        
        style_id = style_dir.name
        total_styles += 1
        
        # Get best assessed model for this style
        assessment = get_best_assessed_model(style_dir, min_rating)
        
        if not assessment:
            continue
        
        model_id = assessment.get('modelId')
        if not model_id:
            continue
        
        # Get model settings from training versions
        training_versions_file = training_versions_dir / f'style_{style_id}.json'
        model_settings = get_model_settings(training_versions_file, model_id)
        
        if not model_settings:
            print(f"⚠️  Style {style_id}: Model {model_id} not found in training versions", file=sys.stderr)
            continue
        
        # Extract settings with defaults
        config = model_settings.get('config', {})
        
        backend_settings = {
            'styleId': style_id,
            'styleName': model_settings.get('styleName', f'Style {style_id}'),
            'modelName': model_settings.get('name', model_id),
            'modelId': model_id,
            'rating': assessment.get('rating'),
            'comment': assessment.get('comment', ''),
            'assessmentDate': assessment.get('updatedAt', ''),
            # Backend field mappings from model config
            'lora_weight': round(config.get('loraWeight', 1.0), 2),
            'character_lora_weight': round(config.get('characterLoraWeight', 0.9), 2),
            'cine_lora_weight': round(config.get('cineLoraWeight', 0.8), 2),
            'frontpad': config.get('frontpad', ''),
            'backpad': config.get('backpad', ''),
            'steps': config.get('steps', 20),
            'fluxGuidance': round(config.get('guidance', 3.5), 1),
            'samplerNameComfyUI': map_sampler_name(config.get('samplerName', 'euler')),
            'schedulerName': config.get('schedulerName', 'simple'),
            'embeddingStrength': round(config.get('loraWeight', 1.0), 2),
        }
        
        validated_styles.append(backend_settings)
        print(f"✅ Style {style_id}: {assessment.get('rating')} rated model {model_id}", file=sys.stderr)
    
    return {
        'success': True,
        'validatedStyles': validated_styles,
        'totalStyles': total_styles,
        'exportedCount': len(validated_styles),
        'minRating': min_rating,
        'exportedAt': datetime.utcnow().isoformat() + 'Z'
    }


def main():
    """Main entry point."""
    
    # API mode: read JSON from stdin
    if not sys.stdin.isatty():
        try:
            input_data = json.load(sys.stdin)
            
            # Get project root
            project_root = Path(__file__).parent.parent
            min_rating = input_data.get('minRating', 'good')
            
            print("📦 Exporting assessed models...", file=sys.stderr)
            result = export_assessed_models(str(project_root), min_rating=min_rating)
            
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
    
    # CLI mode
    else:
        import argparse
        
        parser = argparse.ArgumentParser(description='Export settings from assessed models')
        parser.add_argument(
            '--rating',
            choices=['excellent', 'good'],
            default='good',
            help='Minimum rating to export (default: good)'
        )
        
        args = parser.parse_args()
        
        project_root = Path(__file__).parent.parent
        
        print(f"📦 Exporting assessed models...", file=sys.stderr)
        result = export_assessed_models(str(project_root), min_rating=args.rating)
        
        print(json.dumps(result, indent=2))
        print(f"\n📊 Summary: {result['exportedCount']}/{result['totalStyles']} styles exported", file=sys.stderr)
        
        sys.exit(0 if result['success'] and result['exportedCount'] > 0 else 1)


if __name__ == '__main__':
    main()
