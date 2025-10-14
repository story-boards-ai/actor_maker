"""
Sync styles from backend to local registry.

This script reads the backend's styles_SDXL.json and styles.repository.ts
and creates/updates the local styles registry.
"""
import json
import sys
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.styles import StylesRegistry


def sync_from_backend_json(backend_json_path: str, registry: StylesRegistry):
    """
    Sync from backend's styles_SDXL.json (legacy format).
    
    Args:
        backend_json_path: Path to backend styles JSON
        registry: StylesRegistry instance
    """
    print(f"Reading backend styles from: {backend_json_path}")
    
    with open(backend_json_path, 'r') as f:
        backend_styles = json.load(f)
    
    print(f"Found {len(backend_styles)} styles in backend")
    
    for bs in backend_styles:
        style_id = str(bs.get("id"))
        
        # Check if style already exists
        existing = registry.get_style_by_id(style_id)
        if existing:
            print(f"  ⏭️  Style {style_id} already exists, skipping")
            continue
        
        # Map backend fields to registry format
        style = {
            "id": style_id,
            "client_index": bs.get("id"),
            "title": f"Legacy Style {style_id}",  # Backend doesn't have titles in JSON
            "lora_name": bs.get("lora", ""),
            "lora_file": bs.get("lora", "") + ".safetensors" if bs.get("lora") else "",
            "lora_version": "1.0",
            "lora_weight": 1.0,  # Default
            "character_lora_weight": bs.get("embedding_strength", 1.0),
            "cine_lora_weight": 0.8,  # Default
            "trigger_words": "",
            "monochrome": bs.get("monochrome", False),
            "model": bs.get("model", "sd_xl_base_1.0"),
            "image_url": f"https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style{style_id.zfill(2)}.webp",
            "training_data": {
                "source_images_count": 0,
                "training_images_count": 0,
                "s3_bucket": "storyboard-user-files",
                "s3_prefix": f"styles/style_{style_id}/",
                "last_trained": None
            },
            "metadata": {
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z",
                "status": "active",
                "notes": f"Imported from backend styles_SDXL.json"
            }
        }
        
        registry.add_style(style)
        print(f"  ✅ Added style {style_id}: {style.get('lora_name')}")
    
    print(f"\n✅ Sync complete")


def create_sample_registry():
    """Create a registry with ALL production styles from backend."""
    registry = StylesRegistry()
    
    # Add ALL production styles based on backend styles.repository.ts
    production_styles = [
        {
            "id": "1",
            "client_index": 1,
            "title": "Ink Intensity",
            "lora_name": "SBai_style_1",
            "lora_file": "SBai_style_1.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.1,
            "character_lora_weight": 1.0,
            "cine_lora_weight": 0.8,
            "trigger_words": "style SBai_style_1",
            "monochrome": True,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style01.webp",
            "frontpad": "bold black and white line art, silhouette-heavy, (pen and ink drawing++), deep contrast, cinematic shadows, chiaroscuro composition, stylized lighting",
            "backpad": "(frank miller style++), dramatic negative space, strong directional light, black fills, graphic novel storyboard style",
        },
        {
            "id": "16",
            "client_index": 2,
            "title": "Dynamic Simplicity",
            "lora_name": "SBai_style_16",
            "lora_file": "SBai_style_16.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.1,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 0.8,
            "trigger_words": "style SBai_style_16",
            "monochrome": True,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style02.webp",
            "frontpad": "storyboard frame, high contrast, dramatic angle, expressive line art",
            "backpad": "(bold inking++), (cinematic composition+), no color, storyboard sketch, deep blacks and washed out shading",
        },
        {
            "id": "5",
            "client_index": 3,
            "title": "Sweeping Elegance",
            "lora_name": "SBai_style_5",
            "lora_file": "SBai_style_5.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.11,
            "character_lora_weight": 0.8,
            "cine_lora_weight": 0.8,
            "trigger_words": "style SBai_style_5",
            "monochrome": False,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style05.webp",
            "frontpad": "painted storyboard with vector art inspiration, cinematic illustration, light brush texture, graceful camera framing",
            "backpad": "(oil painting+), (dramatic lighting+), brushwork texture, (soft focus+), subtle color grading, painterly shadows, ambient haze",
        },
        {
            "id": "59",
            "client_index": 4,
            "title": "Ethereal Washes",
            "lora_name": "SBai_style_59",
            "lora_file": "SBai_style_59.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.2,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 0.8,
            "trigger_words": "style SBai_style_59",
            "monochrome": False,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style59.webp",
            "frontpad": "",
            "backpad": "(watercolor++), (ink and wash++), soft brush textures, bleeding pigments, light sketch lines, hand-painted look, soft focus edges, pastel color palette, vignette light bleed, visible paper grain, concept art style, (storybook illustration++), loose linework, impressionistic backgrounds, (storyboard composition++)",
        },
        {
            "id": "91",
            "client_index": 5,
            "title": "Vibrant Vectorcraft",
            "lora_name": "style_91_4000",
            "lora_file": "style_91_4000.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.0,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 0.9,
            "trigger_words": "style SBai_style_91",
            "monochrome": False,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style91.webp",
            "frontpad": "clean vector illustration, flat color style, single character scene, strong silhouette",
            "backpad": "(vector art++), (sharp linework+), no duplicates, (cel shading+), mid-century animation style",
        },
        {
            "id": "2",
            "client_index": 6,
            "title": "Vivid Portraiture",
            "lora_name": "SBai_style_2",
            "lora_file": "SBai_style_2.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.0,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 0.85,
            "trigger_words": "style SBai_style_2",
            "monochrome": True,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style02.webp",
            "frontpad": "hand-drawn storyboard, heavy black pencil sketch, dynamic perspective, expressive shadows, intense contrast, rough lines",
            "backpad": "(deep blacks+), (dynamic shadows+), (strong hatching++), (graphite texture), (realistic perspective), (cinematic framing++)",
        },
        {
            "id": "68",
            "client_index": 7,
            "title": "Everyday Vibes",
            "lora_name": "SBai_style_68",
            "lora_file": "SBai_style_68.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.1,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 0.8,
            "trigger_words": "style SBai_style_68",
            "monochrome": False,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style68.webp",
            "frontpad": "an expressive digital painting, soft lighting, painterly brush strokes, slice-of-life moment",
            "backpad": "(pascal campion style++), cozy atmosphere, realistic proportions, dynamic composition, mood lighting, subtle expression",
        },
        {
            "id": "82",
            "client_index": 8,
            "title": "Stellar Sketch",
            "lora_name": "SBai_style_82",
            "lora_file": "SBai_style_82.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.2,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 0.9,
            "trigger_words": "style SBai_style_82",
            "monochrome": False,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style82.webp",
            "frontpad": "hand-drawn storyboard, simple sketch with flat cel shading, colored pencil strokes, ink outline, cartoon realism",
            "backpad": "(cel shading++), (hand coloring+), line art edges, minimal highlights, soft texture fill, color wash",
        },
        {
            "id": "48",
            "client_index": 9,
            "title": "Dynamic Scenes",
            "lora_name": "SBai_style_48",
            "lora_file": "SBai_style_48.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.2,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 1.0,
            "trigger_words": "style SBai_style_48",
            "monochrome": True,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style48.webp",
            "frontpad": "a dynamic storyboard sketch, high-energy composition, expressive lines, black and white, monochrome, no shading",
            "backpad": "(inking style++), storyboard layout, (dramatic linework+), dynamic movement, frame blocking",
        },
        {
            "id": "53",
            "client_index": 10,
            "title": "City Chronicles",
            "lora_name": "SBai_style_53",
            "lora_file": "SBai_style_53.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.15,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 0.8,
            "trigger_words": "style SBai_style_53",
            "monochrome": True,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style53.webp",
            "frontpad": "black and white, monochrome, urban graphic novel style, cinematic shadows, clean outlines, storyboard frame",
            "backpad": " (vector art+), (digital ink+), (noir mood+), (harsh contrast++), sketch--",
        },
        {
            "id": "99",
            "client_index": 11,
            "title": "Illustrated Detail",
            "lora_name": "SBai_style_99",
            "lora_file": "SBai_style_99.safetensors",
            "lora_version": "1.0",
            "lora_weight": 0.9,
            "character_lora_weight": 0.8,
            "cine_lora_weight": 0.85,
            "trigger_words": "style SBai_style_99",
            "monochrome": True,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style99.webp",
            "frontpad": "a rough storyboard sketch by Jay Oliva and Doug Lefler, felt-tip pen lines, hand-drawn composition, bold silhouettes, stylized poses, (high contrast+), (off-center framing+), dynamic action staging",
            "backpad": "(black and white++), (felt pen sketch++), (hand-inked frame+), (rough animation storyboard++), (expression lines+), (strong perspective+), (bold outlines+), (quick gesture sketch style+), (hard edge shadows), (film blocking)",
        },
        {
            "id": "100",
            "client_index": 12,
            "title": "Dark Narrative",
            "lora_name": "SBai_style_100",
            "lora_file": "SBai_style_100.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.11,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 0.8,
            "trigger_words": "style SBai_style_100",
            "monochrome": True,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style100.webp",
            "frontpad": "",
            "backpad": "(black and white++), high contrast, (pen art++), heavy shadows, hard lighting, film noir aesthetic, coarse texture, dramatic shading, deep blacks, sketchy outlines, chiaroscuro, grainy paper texture, harsh edge lighting, minimal background detail",
        },
        {
            "id": "101",
            "client_index": 13,
            "title": "Linear Perspective",
            "lora_name": "SBai_style_101",
            "lora_file": "SBai_style_101.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.0,
            "character_lora_weight": 0.9,
            "cine_lora_weight": 0.8,
            "trigger_words": "style SBai_style_101",
            "monochrome": False,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style101.webp",
            "frontpad": "coloured storyboard frame from a graphic novel, cel-shaded, clean linework, stylized ink outlines, natural perspective with artistic exaggeration, varied cinematic angles, dynamic poses, expressive character design",
            "backpad": "(bold ink lines+), (flat cel shading++), (animated film aesthetic+), (hand-drawn comic panel++), (light halftone texture), (dramatic framing+), (soft edge shading-), (photorealism--)",
        },
        {
            "id": "102",
            "client_index": 14,
            "title": "Animated Realism",
            "lora_name": "Comic_FLUX_V1",
            "lora_file": "Comic_FLUX_V1.safetensors",
            "lora_version": "1.0",
            "lora_weight": 1.12,
            "character_lora_weight": 0.85,
            "cine_lora_weight": 0.55,
            "trigger_words": "comic artstyle",
            "monochrome": False,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style102.webp",
            "frontpad": "a storyboard image, (illustration style++), (hand-drawn aesthetic++), cel shading, painterly textures, expressive line art, inspired by Disney Renaissance and Don Bluth animation, Studio Ghibli-style backgrounds, subtle gradients, (2D animated film look++), ink and paint style",
            "backpad": "",
        },
        {
            "id": "103",
            "client_index": 15,
            "title": "Cinematic Stills",
            "lora_name": "",
            "lora_file": "",
            "lora_version": "1.0",
            "lora_weight": 0.9,
            "character_lora_weight": 1.0,
            "cine_lora_weight": 0.8,
            "trigger_words": "",
            "monochrome": False,
            "model": "flux1-dev-fp8",
            "image_url": "https://story-boards-static-dev.s3.us-west-1.amazonaws.com/styles/style103.webp",
            "frontpad": "a still frame from a Hollywood feature film, shot on location with practical lighting, shallow depth of field, natural blocking, captured during action or dialogue, cinematic lens choice (35mm, 50mm), inspired by the work of Roger Deakins and Emmanuel Lubezki, dramatic composition, expressive camera placement",
            "backpad": "rich contrast, atmospheric light, lens flares, deep shadows, color grading, non-symmetrical composition, wide-angle and over-the-shoulder shots, rule of thirds, natural posture, mid-action moment, golden hour or practical light sources",
        },
    ]
    
    for style_data in production_styles:
        # Check if style exists
        existing = registry.get_style_by_id(style_data['id'])
        
        if existing:
            # Update existing style with frontpad and backpad
            registry.update_style(style_data['id'], {
                "frontpad": style_data.get("frontpad", ""),
                "backpad": style_data.get("backpad", ""),
                "lora_weight": style_data.get("lora_weight"),
                "character_lora_weight": style_data.get("character_lora_weight"),
                "cine_lora_weight": style_data.get("cine_lora_weight"),
            })
            print(f"✅ Updated style {style_data['id']}: {style_data['title']} (added frontpad/backpad)")
        else:
            # Add training data and metadata for new styles
            style_data["training_data"] = {
                "source_images_count": 0,
                "training_images_count": 0,
                "s3_bucket": "storyboard-user-files",
                "s3_prefix": f"styles/style_{style_data['id']}/",
                "last_trained": None
            }
            style_data["metadata"] = {
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z",
                "status": "active",
                "notes": "Production style from backend"
            }
            
            registry.add_style(style_data)
            print(f"✅ Added style {style_data['id']}: {style_data['title']}")
    
    # Add corresponding LoRA entries for all styles
    loras = [
        {"lora_name": "SBai_style_1", "trigger_words": "style SBai_style_1"},
        {"lora_name": "SBai_style_16", "trigger_words": "style SBai_style_16"},
        {"lora_name": "SBai_style_5", "trigger_words": "style SBai_style_5"},
        {"lora_name": "SBai_style_59", "trigger_words": "style SBai_style_59"},
        {"lora_name": "style_91_4000", "trigger_words": "style SBai_style_91"},
        {"lora_name": "SBai_style_2", "trigger_words": "style SBai_style_2"},
        {"lora_name": "SBai_style_68", "trigger_words": "style SBai_style_68"},
        {"lora_name": "SBai_style_82", "trigger_words": "style SBai_style_82"},
        {"lora_name": "SBai_style_48", "trigger_words": "style SBai_style_48"},
        {"lora_name": "SBai_style_53", "trigger_words": "style SBai_style_53"},
        {"lora_name": "SBai_style_99", "trigger_words": "style SBai_style_99"},
        {"lora_name": "SBai_style_100", "trigger_words": "style SBai_style_100"},
        {"lora_name": "SBai_style_101", "trigger_words": "style SBai_style_101"},
        {"lora_name": "Comic_FLUX_V1", "trigger_words": "comic artstyle"},
    ]
    
    for lora in loras:
        registry.update_lora_file(
            lora_name=lora["lora_name"],
            lora_file=f"{lora['lora_name']}.safetensors",
            version="1.0"
        )
        print(f"✅ Added LoRA: {lora['lora_name']}")
    
    registry.save()
    print(f"\n✅ Sample registry created with {len(production_styles)} styles")
    return registry


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync styles from backend")
    parser.add_argument(
        "--backend-json",
        help="Path to backend styles_SDXL.json",
        default="/home/markus/story-boards-backend/apps/core/src/configs/styles_SDXL.json"
    )
    parser.add_argument(
        "--create-sample",
        action="store_true",
        help="Create sample registry with production styles"
    )
    
    args = parser.parse_args()
    
    if args.create_sample:
        print("Creating sample registry with production styles...")
        create_sample_registry()
    elif Path(args.backend_json).exists():
        registry = StylesRegistry()
        sync_from_backend_json(args.backend_json, registry)
        registry.save()
        print(f"\n✅ Registry saved with {len(registry.get_all_styles())} styles")
    else:
        print(f"❌ Backend JSON not found: {args.backend_json}")
        print("\nUsage:")
        print("  python sync_styles_from_backend.py --create-sample")
        print("  python sync_styles_from_backend.py --backend-json /path/to/styles.json")
        sys.exit(1)
