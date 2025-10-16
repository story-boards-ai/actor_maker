"""
Training data generator for actors using Replicate flux-kontext-pro and GPT Vision.
Generates diverse training images from a single source image.
"""

import os
import logging
import json
import base64
from typing import List, Dict, Any, Optional
from pathlib import Path
from io import BytesIO
from PIL import Image
import openai

from .replicate_service import ReplicateService
from .training_data_utils import (
    DescriptionSelector,
    build_tile_generation_prompt,
    build_uniqueness_analysis_prompt
)
from .utils.s3 import upload_image_to_s3

logger = logging.getLogger(__name__)


class TrainingDataGenerator:
    """Generates training data for actor LoRA models from a single source image."""
    
    def __init__(
        self,
        replicate_token: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        debug_dir: Optional[str] = None
    ):
        """
        Initialize the training data generator.
        
        Args:
            replicate_token: Replicate API token (defaults to env var)
            openai_api_key: OpenAI API key for GPT Vision (defaults to env var)
            debug_dir: Directory for saving debug files (optional)
        """
        self.replicate = ReplicateService(api_token=replicate_token)
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
        self.description_selector = DescriptionSelector()
        
        # Configuration
        self.target_training_images = 20
        self.grid_size = 3  # 3x3 grid
        self.max_generation_attempts = 10
        self.batch_size = 3  # Process upscaling in batches
        
        # Debug directory
        self.debug_dir = Path(debug_dir) if debug_dir else Path("debug/training_data")
        self.debug_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("TrainingDataGenerator initialized")
    
    def generate_training_data(
        self,
        source_image_url: str,
        user_id: str,
        actor_id: str
    ) -> Dict[str, Any]:
        """
        Generate training data from a single source image.
        
        Args:
            source_image_url: URL of the source image
            user_id: User ID for S3 uploads
            actor_id: Actor ID for organizing files
            
        Returns:
            Dictionary with training_image_urls, total_grids_generated, and total_training_images
        """
        logger.info(f"Starting training data generation for actor {actor_id}")
        
        # Reset description selector for this session
        self.description_selector.reset_session()
        
        unique_images = []
        total_grids_generated = 0
        attempts = 0
        training_image_counter = 1
        
        # Download and prepare source image
        logger.info(f"Downloading source image from: {source_image_url}")
        source_image_base64 = self.replicate.download_image_as_base64(source_image_url)
        
        while len(unique_images) < self.target_training_images and attempts < self.max_generation_attempts:
            attempts += 1
            logger.info(f"Generation attempt {attempts}: Need {self.target_training_images - len(unique_images)} more images")
            
            try:
                # Generate 3x3 tile grid
                grid_image_url = self._generate_tile_grid(source_image_base64)
                total_grids_generated += 1
                logger.info(f"Generated grid {total_grids_generated} (attempt {attempts})")
                
                # Save grid image to debug folder
                self._save_debug_grid_image(grid_image_url, attempts)
                
                # Analyze grid with GPT Vision to get unique tile indices
                unique_tile_indices = self._analyze_grid_uniqueness(grid_image_url)
                logger.info(f"GPT Vision identified {len(unique_tile_indices)} unique tiles: {unique_tile_indices}")
                
                # Split grid into individual tiles
                tile_images = self._split_grid_into_tiles(grid_image_url)
                
                # Keep only unique tiles as identified by GPT Vision
                unique_tiles = [tile_images[index - 1] for index in unique_tile_indices if 0 < index <= len(tile_images)]
                
                # Upscale and save unique tiles in batches
                tiles_to_process = unique_tiles[:self.target_training_images - len(unique_images)]
                upscaled_urls = self._batch_upscale_images(tiles_to_process, user_id, actor_id)
                
                # Add upscaled images to collection
                for upscaled_url in upscaled_urls:
                    unique_images.append(upscaled_url)
                    
                    # Save training image to debug folder
                    self._save_debug_training_image(upscaled_url, training_image_counter)
                    training_image_counter += 1
                    
                    logger.info(f"Added training image {len(unique_images)}/{self.target_training_images} (from grid {total_grids_generated})")
                    
                    if len(unique_images) >= self.target_training_images:
                        logger.info(f"Reached target of {self.target_training_images} training images")
                        break
                        
            except Exception as e:
                logger.error(f"Error in generation attempt {attempts}: {e}")
                # Continue to next attempt
        
        if len(unique_images) < self.target_training_images:
            logger.warning(f"Only generated {len(unique_images)}/{self.target_training_images} images after {attempts} attempts")
        
        logger.info(f"Training data generation complete: {len(unique_images)} training images from {total_grids_generated} grids")
        
        return {
            "training_image_urls": unique_images,
            "total_grids_generated": total_grids_generated,
            "total_training_images": len(unique_images),
        }
    
    def _generate_tile_grid(self, source_image_base64: str) -> str:
        """Generate a 3x3 tile grid using Replicate flux-kontext-pro."""
        # Select 9 unique descriptions from the pool
        selected_descriptions = self.description_selector.select_unique_descriptions(9)
        logger.info(f"Selected tile descriptions for this grid")
        
        # Build prompt
        prompt = build_tile_generation_prompt(selected_descriptions)
        
        # Generate grid
        grid_url = self.replicate.generate_grid_with_flux_kontext(
            prompt=prompt,
            input_image_base64=source_image_base64,
            aspect_ratio="1:1",
            output_format="jpg"
        )
        
        return grid_url
    
    def _analyze_grid_uniqueness(self, grid_image_url: str) -> List[int]:
        """Analyze grid with GPT Vision to identify unique tiles."""
        logger.info("Analyzing grid uniqueness with GPT Vision")
        
        prompt = build_uniqueness_analysis_prompt()
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": grid_image_url}},
                        ],
                    }
                ],
                temperature=0.1,
                max_tokens=100,
            )
            
            # Parse response
            content = response.choices[0].message.content
            result = json.loads(content)
            unique_tiles = result.get("unique_tiles", [])
            
            # Validate tile indices are in valid range (1-9)
            valid_tiles = [tile for tile in unique_tiles if 1 <= tile <= 9]
            
            if not valid_tiles:
                logger.warning("GPT Vision returned no valid unique tiles, using fallback selection")
                return [1, 3, 5, 7, 9]  # Fallback to corner and center tiles
            
            return valid_tiles
            
        except Exception as e:
            logger.error(f"Error analyzing grid with GPT Vision: {e}")
            # Fallback to selecting corner and center tiles
            return [1, 3, 5, 7, 9]
    
    def _split_grid_into_tiles(self, grid_image_url: str) -> List[str]:
        """Split 3x3 grid into individual tile images (as base64)."""
        logger.info("Splitting grid into individual tiles")
        
        # Download grid image
        grid_bytes = self.replicate.download_image_as_bytes(grid_image_url)
        grid_image = Image.open(BytesIO(grid_bytes))
        
        width, height = grid_image.size
        tile_width = width // self.grid_size
        tile_height = height // self.grid_size
        
        tiles = []
        
        # Extract each tile from the grid
        for row in range(self.grid_size):
            for col in range(self.grid_size):
                left = col * tile_width
                top = row * tile_height
                right = left + tile_width
                bottom = top + tile_height
                
                tile = grid_image.crop((left, top, right, bottom))
                
                # Convert tile to base64
                buffer = BytesIO()
                tile.save(buffer, format="JPEG")
                tile_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                tiles.append(tile_base64)
        
        logger.info(f"Successfully split grid into {len(tiles)} tiles")
        return tiles
    
    def _batch_upscale_images(
        self,
        tile_images: List[str],
        user_id: str,
        actor_id: str
    ) -> List[str]:
        """Upscale multiple images in batches."""
        results = []
        
        logger.info(f"Starting batch upscaling of {len(tile_images)} images in batches of {self.batch_size}")
        
        # Process images in batches
        for i in range(0, len(tile_images), self.batch_size):
            batch = tile_images[i:i + self.batch_size]
            batch_number = (i // self.batch_size) + 1
            total_batches = (len(tile_images) + self.batch_size - 1) // self.batch_size
            
            logger.info(f"Processing batch {batch_number}/{total_batches} ({len(batch)} images)")
            
            # Process batch sequentially (Replicate API limits)
            for idx, tile_base64 in enumerate(batch):
                try:
                    upscaled_url = self._upscale_and_save_image(tile_base64, user_id, actor_id)
                    results.append(upscaled_url)
                    logger.info(f"Batch {batch_number} - Image {idx + 1}/{len(batch)} upscaled successfully")
                except Exception as e:
                    logger.error(f"Batch {batch_number} - Image {idx + 1}/{len(batch)} failed: {e}")
        
        logger.info(f"Batch upscaling completed: {len(results)}/{len(tile_images)} images successful")
        return results
    
    def _upscale_and_save_image(
        self,
        image_base64: str,
        user_id: str,
        actor_id: str
    ) -> str:
        """Upscale image and save to S3."""
        # Upscale image 2x using Topaz Labs
        upscaled_url = self.replicate.upscale_with_topaz(
            image_base64=image_base64,
            enhance_model="Standard V2",
            upscale_factor="2x",
            output_format="jpg"
        )
        
        # Download upscaled image
        upscaled_base64 = self.replicate.download_image_as_base64(upscaled_url)
        
        # Upload to S3
        s3_url = upload_image_to_s3(
            image_base64=upscaled_base64,
            user_id=user_id,
            folder=f"custom_actors/{actor_id}/training_data"
        )
        
        return s3_url
    
    def _save_debug_grid_image(self, grid_image_url: str, grid_number: int) -> None:
        """Save grid image to debug folder."""
        try:
            grid_bytes = self.replicate.download_image_as_bytes(grid_image_url)
            filename = self.debug_dir / f"grid{grid_number}.jpg"
            filename.write_bytes(grid_bytes)
            logger.info(f"Saved debug grid image: {filename.name}")
        except Exception as e:
            logger.error(f"Failed to save debug grid image: {e}")
    
    def _save_debug_training_image(self, image_url: str, image_number: int) -> None:
        """Save training image to debug folder."""
        try:
            image_bytes = self.replicate.download_image_as_bytes(image_url)
            filename = self.debug_dir / f"training-image{image_number}.jpg"
            filename.write_bytes(image_bytes)
            logger.info(f"Saved debug training image: {filename.name}")
        except Exception as e:
            logger.error(f"Failed to save debug training image: {e}")
