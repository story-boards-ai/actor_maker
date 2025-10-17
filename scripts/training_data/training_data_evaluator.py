"""
Training data evaluator - Creates composite images and evaluates with GPT-4.1 mini.
"""

import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from PIL import Image
import io
import base64

from training_data_manifest import TrainingDataManifest
from utils.openai_client import OpenAIClient

logger = logging.getLogger(__name__)


class TrainingDataEvaluator:
    """Evaluates actor training data using GPT Vision."""
    
    # Target distribution
    TARGET_TOTAL = 20
    TARGET_PHOTOREALISTIC_PCT = 0.65  # 65% = 13 images
    TARGET_BW_STYLIZED_PCT = 0.20     # 20% = 4 images
    TARGET_COLOR_STYLIZED_PCT = 0.15  # 15% = 3 images
    
    # Tolerance for "balanced" check
    TOLERANCE = 0.10  # 10% tolerance
    
    def __init__(self, output_dir: Optional[str] = None):
        """
        Initialize evaluator.
        
        Args:
            output_dir: Directory for saving debug files
        """
        self.openai_client = OpenAIClient()
        self.output_dir = Path(output_dir) if output_dir else Path("debug/training_data_evaluation")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"TrainingDataEvaluator initialized (output: {self.output_dir})")
    
    def evaluate_actor(self, actor_id: str) -> Optional[Dict[str, Any]]:
        """
        Evaluate training data for an actor.
        
        Args:
            actor_id: Actor ID to evaluate
            
        Returns:
            Dictionary with evaluation results or None if failed
        """
        logger.info(f"Evaluating actor: {actor_id}")
        
        # Load training data manifest
        try:
            manifest = TrainingDataManifest.load_actor_manifest(actor_id)
        except Exception as e:
            logger.error(f"Failed to load manifest for {actor_id}: {e}")
            return None
        
        # Get all training images
        images = manifest.get_all_images()
        if not images:
            logger.warning(f"No training images found for {actor_id}")
            return None
        
        images_list = list(images.values())
        
        # Skip evaluation if no training data
        if len(images_list) == 0:
            logger.warning(f"Actor {actor_id} has no training images, skipping evaluation")
            return None
        
        logger.info(f"Found {len(images_list)} training images")
        
        # Create composite image
        composite_path = self._create_composite_image(actor_id, images_list)
        if not composite_path:
            logger.error("Failed to create composite image")
            return None
        
        # Evaluate with GPT Vision
        evaluation = self._evaluate_with_gpt(actor_id, composite_path, len(images_list))
        if not evaluation:
            logger.error("Failed to evaluate with GPT")
            return None
        
        # Calculate what needs to be done
        action_plan = self._create_action_plan(evaluation)
        
        # Combine results
        result = {
            **evaluation,
            **action_plan,
            "actor_id": actor_id,
            "composite_image": str(composite_path)
        }
        
        # Save evaluation to file
        eval_file = self.output_dir / f"{actor_id}_evaluation.json"
        eval_file.write_text(json.dumps(result, indent=2))
        logger.info(f"Saved evaluation to: {eval_file}")
        
        return result
    
    def _create_composite_image(
        self,
        actor_id: str,
        images_data: List[Dict[str, Any]]
    ) -> Optional[Path]:
        """
        Create a composite grid image from training images.
        
        Args:
            actor_id: Actor ID
            images_data: List of image data dicts with 's3_url' and 'local_path'
            
        Returns:
            Path to composite image or None if failed
        """
        logger.info(f"Creating composite image for {actor_id}")
        
        try:
            import requests
            from io import BytesIO
            
            # Load all images (prefer local, fallback to S3)
            images = []
            for idx, img_data in enumerate(images_data):
                try:
                    # Try local file first
                    local_path = img_data.get("local_path")
                    if local_path and Path(local_path).exists():
                        img = Image.open(local_path)
                        images.append(img)
                        continue
                    
                    # Fallback to S3 URL
                    s3_url = img_data.get("s3_url", "")
                    if s3_url:
                        response = requests.get(s3_url, timeout=30)
                        response.raise_for_status()
                        img = Image.open(BytesIO(response.content))
                        images.append(img)
                    else:
                        logger.warning(f"Image {idx + 1} has no local path or S3 URL")
                        
                except Exception as e:
                    logger.warning(f"Failed to load image {idx + 1}: {e}")
            
            if not images:
                logger.error("No images could be loaded")
                return None
            
            logger.info(f"Loaded {len(images)} images")
            
            # Create grid layout
            # Aim for ~200px per thumbnail for good GPT Vision analysis
            thumb_size = 200
            cols = 5  # 5 columns
            rows = (len(images) + cols - 1) // cols
            
            grid_width = cols * thumb_size
            grid_height = rows * thumb_size
            
            # Create composite
            composite = Image.new('RGB', (grid_width, grid_height), color=(240, 240, 240))
            
            for idx, img in enumerate(images):
                # Resize to thumbnail
                img_thumb = img.copy()
                img_thumb.thumbnail((thumb_size, thumb_size), Image.Resampling.LANCZOS)
                
                # Calculate position
                col = idx % cols
                row = idx // cols
                x = col * thumb_size
                y = row * thumb_size
                
                # Center thumbnail in cell
                offset_x = (thumb_size - img_thumb.width) // 2
                offset_y = (thumb_size - img_thumb.height) // 2
                
                composite.paste(img_thumb, (x + offset_x, y + offset_y))
            
            # Save composite (always to same filename for easy monitoring)
            composite_path = self.output_dir / "current_composite.jpg"
            composite.save(composite_path, "JPEG", quality=85)
            logger.info(f"Created composite: {composite_path} ({grid_width}x{grid_height})")
            logger.info(f"Actor: {actor_id}")
            return composite_path
            
        except Exception as e:
            logger.error(f"Failed to create composite image: {e}")
            return None
    
    def _evaluate_with_gpt(
        self,
        actor_id: str,
        composite_path: Path,
        total_images: int
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluate training data mix using GPT-4.1 mini vision.
        
        Args:
            actor_id: Actor ID
            composite_path: Path to composite image
            total_images: Total number of images
            
        Returns:
            Evaluation results or None if failed
        """
        logger.info(f"Evaluating with GPT-4.1 mini vision")
        
        # Read composite image as base64
        with open(composite_path, 'rb') as f:
            image_bytes = f.read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Build evaluation prompt
        prompt = self._build_evaluation_prompt(total_images)
        
        try:
            # Call GPT Vision with JSON mode
            response = self.openai_client.vision_completion(
                prompt=prompt,
                image_base64=image_base64,
                model="gpt-4o-mini",  # GPT-4.1 mini
                json_mode=True,
                max_tokens=2000,
                temperature=0.3  # Lower temperature for more consistent analysis
            )
            
            logger.info(f"GPT evaluation complete")
            logger.debug(f"Response: {json.dumps(response, indent=2)}")
            
            return response
            
        except Exception as e:
            logger.error(f"GPT evaluation failed: {e}")
            return None
    
    def _build_evaluation_prompt(self, total_images: int) -> str:
        """Build the GPT evaluation prompt."""
        return f"""Analyze this grid of {total_images} training images for an actor LoRA model.

The images are arranged in a grid (left-to-right, top-to-bottom, numbered 1 to {total_images}).

**Target Distribution:**
- 65% Photorealistic (13 images): Cinematic film scenes, realistic lighting, natural environments
- 20% B&W Stylized (4 images): Black and white illustrations (pen & ink, charcoal, manga, etc.)
- 15% Color Stylized (3 images): Color illustrations (comic book, watercolor, digital painting, etc.)

**Quality Criteria - MARK FOR DELETION if image has ANY of these issues:**
1. **Looking at camera**: Character making direct eye contact with viewer
2. **Symmetrical composition**: Centered, straight-on, passport-style shots
3. **Warped/distorted**: Twisted limbs, malformed features, anatomical errors
4. **Poor quality**: Blurry, artifacts, unusable for training

Good training images should have:
- Character looking away or at an angle (NOT at camera)
- Dynamic angles and varied compositions (NOT symmetrical/centered)
- Clean anatomy and proper proportions
- Clear, sharp details

**Your Task:**
1. Categorize each image by number (1-{total_images}) into one of three types:
   - "photorealistic": Real-world cinematic scenes
   - "bw_stylized": Black and white artistic/illustrated
   - "color_stylized": Color artistic/illustrated

2. Assign quality score (1-10) considering:
   - Lower scores (1-4) for images with quality issues above
   - Higher scores (7-10) for good training images
   - Medium scores (5-6) for acceptable but not ideal

3. Count how many of each type we have

4. Determine what needs to be adjusted:
   - If we have TOO MANY of a type: list image numbers to DELETE (prioritize low quality scores and images with issues)
   - If we have TOO FEW of a type: specify how many to GENERATE

**Return JSON format:**
{{
  "image_classifications": [
    {{"image_number": 1, "type": "photorealistic", "quality_score": 8}},
    {{"image_number": 2, "type": "bw_stylized", "quality_score": 7}},
    ...
  ],
  "counts": {{
    "photorealistic": 10,
    "bw_stylized": 6,
    "color_stylized": 4
  }},
  "recommendations": {{
    "delete_photorealistic": [],
    "delete_bw_stylized": [2, 5],
    "delete_color_stylized": [8],
    "generate_photorealistic": 3,
    "generate_bw_stylized": 0,
    "generate_color_stylized": 0
  }},
  "analysis": "Brief explanation of the current mix and what needs adjustment"
}}

Be precise and objective. Quality score 1-10 (consider composition, clarity, variety)."""
    
    def _create_action_plan(self, evaluation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create action plan from GPT evaluation.
        
        Args:
            evaluation: GPT evaluation results
            
        Returns:
            Action plan with images to delete and generate
        """
        counts = evaluation.get("counts", {})
        recommendations = evaluation.get("recommendations", {})
        
        # Calculate current distribution
        total = sum(counts.values())
        photo_pct = counts.get("photorealistic", 0) / total if total > 0 else 0
        bw_pct = counts.get("bw_stylized", 0) / total if total > 0 else 0
        color_pct = counts.get("color_stylized", 0) / total if total > 0 else 0
        
        # Check if balanced
        is_balanced = (
            abs(photo_pct - self.TARGET_PHOTOREALISTIC_PCT) <= self.TOLERANCE and
            abs(bw_pct - self.TARGET_BW_STYLIZED_PCT) <= self.TOLERANCE and
            abs(color_pct - self.TARGET_COLOR_STYLIZED_PCT) <= self.TOLERANCE and
            total == self.TARGET_TOTAL
        )
        
        # Build action lists
        images_to_delete = []
        for img_type in ["photorealistic", "bw_stylized", "color_stylized"]:
            delete_key = f"delete_{img_type}"
            if delete_key in recommendations:
                for img_num in recommendations[delete_key]:
                    images_to_delete.append({
                        "image_number": img_num,
                        "type": img_type
                    })
        
        images_to_generate = []
        for img_type in ["photorealistic", "bw_stylized", "color_stylized"]:
            generate_key = f"generate_{img_type}"
            count = recommendations.get(generate_key, 0)
            if count > 0:
                images_to_generate.append({
                    "type": img_type,
                    "count": count
                })
        
        return {
            "total_images": total,
            "photorealistic_count": counts.get("photorealistic", 0),
            "bw_stylized_count": counts.get("bw_stylized", 0),
            "color_stylized_count": counts.get("color_stylized", 0),
            "photorealistic_percentage": photo_pct * 100,
            "bw_stylized_percentage": bw_pct * 100,
            "color_stylized_percentage": color_pct * 100,
            "is_balanced": is_balanced,
            "images_to_delete": images_to_delete,
            "images_to_generate": images_to_generate,
            "gpt_analysis": evaluation.get("analysis", "")
        }
