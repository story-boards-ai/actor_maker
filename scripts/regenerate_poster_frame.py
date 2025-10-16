"""
Regenerate poster frame for an actor using their trained LoRA model.
Generates image via RunPod, converts to multiple WebP sizes, and uploads to S3.
"""
import sys
import os
import json
import logging
from pathlib import Path
from PIL import Image
import io

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from poster_frame_generator import PosterFrameGenerator
from utils.s3 import S3Client, S3Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def generate_webp_versions(image_bytes: bytes) -> dict:
    """
    Generate multiple WebP versions of the image.
    
    Args:
        image_bytes: Original image bytes
    
    Returns:
        Dict with sm, md, lg versions as bytes
    """
    from PIL import Image
    import io
    
    # Open image
    img = Image.open(io.BytesIO(image_bytes))
    
    # Define sizes
    sizes = {
        'sm': (256, 256),
        'md': (512, 512),
        'lg': (1024, 1024)
    }
    
    versions = {}
    
    for size_name, (width, height) in sizes.items():
        # Resize image
        resized = img.copy()
        resized.thumbnail((width, height), Image.Resampling.LANCZOS)
        
        # Convert to WebP
        output = io.BytesIO()
        resized.save(output, format='WEBP', quality=85, method=6)
        versions[size_name] = output.getvalue()
    
    return versions


def upload_poster_frames_to_s3(
    actor_id: str,
    actor_name: str,
    webp_versions: dict,
    s3_client: S3Client
) -> dict:
    """
    Upload poster frame versions to S3.
    
    Args:
        actor_id: Actor ID (e.g., "0001")
        actor_name: Actor name
        webp_versions: Dict with sm, md, lg WebP bytes
        s3_client: S3Client instance
    
    Returns:
        Dict with accelerated and standard URLs for each size
    """
    bucket = S3Config.AWS_USER_IMAGES_BUCKET
    if not bucket:
        raise ValueError("AWS_USER_IMAGES_BUCKET environment variable is required")
    
    # Build S3 keys
    base_key = f"actors/{actor_name}/poster_frame"
    
    urls = {
        'accelerated': {},
        'standard': {}
    }
    
    for size_name, image_bytes in webp_versions.items():
        key = f"{base_key}/{actor_name}_poster_{size_name}.webp"
        
        # Upload to S3
        result = s3_client.upload_file(
            file_data=image_bytes,
            bucket=bucket,
            key=key,
            content_type="image/webp"
        )
        
        # Build URLs
        region = S3Config.AWS_REGION
        standard_url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
        accelerated_url = f"https://{bucket}.s3-accelerate.amazonaws.com/{key}"
        
        urls['standard'][f'webp_{size_name}'] = standard_url
        urls['accelerated'][f'webp_{size_name}'] = accelerated_url
        
        logger.info(f"Uploaded {size_name}: {standard_url}")
    
    return urls


def update_actors_data(actor_id: str, poster_frame_urls: dict, project_root: Path):
    """
    Update actorsData.json with new poster frame URLs.
    
    Args:
        actor_id: Actor ID
        poster_frame_urls: Dict with accelerated and standard URLs
        project_root: Project root path
    """
    actors_data_path = project_root / "data" / "actorsData.json"
    
    if not actors_data_path.exists():
        logger.error(f"actorsData.json not found at {actors_data_path}")
        return
    
    # Load actors data
    with open(actors_data_path, 'r') as f:
        actors_data = json.load(f)
    
    # Find and update actor
    for actor in actors_data:
        if str(actor.get('id')) == str(actor_id) or actor.get('id') == int(actor_id):
            actor['poster_frames'] = poster_frame_urls
            logger.info(f"Updated actor {actor_id} with new poster frame URLs")
            break
    else:
        logger.error(f"Actor {actor_id} not found in actorsData.json")
        return
    
    # Save updated data
    with open(actors_data_path, 'w') as f:
        json.dump(actors_data, f, indent=2)
    
    logger.info(f"Saved updated actorsData.json")


def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Usage: python regenerate_poster_frame.py <actor_id> <actor_name> [lora_model_url] [actor_description]"
        }))
        sys.exit(1)
    
    actor_id = sys.argv[1]
    actor_name = sys.argv[2]
    lora_model_url = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
    actor_description = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None
    
    logger.info(f"=" * 80)
    logger.info(f"REGENERATING POSTER FRAME FOR ACTOR: {actor_name} (ID: {actor_id})")
    logger.info(f"=" * 80)
    
    try:
        # Get project root
        project_root = Path(__file__).parent.parent
        
        # Load actor data if description not provided
        if not actor_description:
            actors_data_path = project_root / "data" / "actorsData.json"
            if actors_data_path.exists():
                with open(actors_data_path, 'r') as f:
                    actors_data = json.load(f)
                    for actor in actors_data:
                        if str(actor.get('id')) == str(actor_id):
                            actor_description = actor.get('face_prompt', '')
                            break
        
        if not actor_description:
            actor_description = f"a person"
        
        logger.info(f"Actor description: {actor_description}")
        
        # Initialize services
        generator = PosterFrameGenerator()
        s3_client = S3Client()
        
        # Step 1: Generate poster frame via RunPod
        logger.info("Step 1: Generating poster frame via RunPod...")
        logger.info(f"Character LoRA URL: {lora_model_url or 'Not provided'}")
        
        result = generator.generate_poster_frame(
            actor_id=actor_id,
            character_lora_name=actor_name,
            custom_actor_description=actor_description,
            character_lora_url=lora_model_url,
            user_id=None  # Use generic path
        )
        
        temp_s3_url = result['thumbnail_image_url']
        logger.info(f"✅ Poster frame generated: {temp_s3_url}")
        
        # Step 2: Download the generated image
        logger.info("Step 2: Downloading generated image...")
        import requests
        response = requests.get(temp_s3_url, timeout=60)
        response.raise_for_status()
        image_bytes = response.content
        logger.info(f"✅ Downloaded image ({len(image_bytes)} bytes)")
        
        # Step 3: Generate WebP versions
        logger.info("Step 3: Generating WebP versions (sm, md, lg)...")
        webp_versions = generate_webp_versions(image_bytes)
        logger.info(f"✅ Generated {len(webp_versions)} WebP versions")
        
        # Step 4: Upload to S3
        logger.info("Step 4: Uploading to S3...")
        poster_frame_urls = upload_poster_frames_to_s3(
            actor_id=actor_id,
            actor_name=actor_name,
            webp_versions=webp_versions,
            s3_client=s3_client
        )
        logger.info(f"✅ Uploaded all versions to S3")
        
        # Step 5: Update actorsData.json
        logger.info("Step 5: Updating actorsData.json...")
        update_actors_data(actor_id, poster_frame_urls, project_root)
        logger.info(f"✅ Updated actorsData.json")
        
        # Return success response
        result = {
            "success": True,
            "actor_id": actor_id,
            "actor_name": actor_name,
            "poster_frames": poster_frame_urls,
            "message": "Poster frame regenerated successfully"
        }
        
        print(json.dumps(result))
        logger.info("=" * 80)
        logger.info("✅ POSTER FRAME REGENERATION COMPLETE")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.error(f"❌ Error regenerating poster frame: {str(e)}", exc_info=True)
        print(json.dumps({
            "error": str(e),
            "actor_id": actor_id,
            "actor_name": actor_name
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
