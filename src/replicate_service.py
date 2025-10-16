"""
Replicate API service for image generation and upscaling.
Provides flux-kontext-pro integration for grid generation and Topaz Labs upscaling.
"""

import os
import logging
import base64
import requests
from typing import Dict, Any, Optional, List
import replicate

logger = logging.getLogger(__name__)


class ReplicateService:
    """Service for interacting with Replicate API for image generation and upscaling."""
    
    def __init__(self, api_token: Optional[str] = None):
        """
        Initialize Replicate service.
        
        Args:
            api_token: Replicate API token (defaults to REPLICATE_API_TOKEN env var)
        """
        self.api_token = api_token or os.getenv("REPLICATE_API_TOKEN")
        if not self.api_token:
            raise ValueError("REPLICATE_API_TOKEN environment variable is required")
        
        self.client = replicate.Client(api_token=self.api_token)
        logger.info("ReplicateService initialized")
    
    def generate_grid_with_flux_kontext(
        self,
        prompt: str,
        input_image_base64: str,
        aspect_ratio: str = "1:1",
        output_format: str = "jpg"
    ) -> str:
        """
        Generate a 3x3 tile grid using flux-kontext-pro.
        
        Args:
            prompt: Text prompt describing the desired grid
            input_image_base64: Base64-encoded source image
            aspect_ratio: Output aspect ratio (default: "1:1" for square)
            output_format: Output format ("jpg" or "png")
            
        Returns:
            URL of the generated grid image
        """
        logger.info("Generating 3x3 tile grid with flux-kontext-pro")
        
        input_data = {
            "prompt": prompt,
            "input_image": f"data:image/jpeg;base64,{input_image_base64}",
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
        }
        
        logger.debug(f"Flux-kontext input: prompt_length={len(prompt)}, "
                    f"image_length={len(input_image_base64)}, "
                    f"aspect_ratio={aspect_ratio}")
        
        try:
            output = self.client.run(
                "black-forest-labs/flux-kontext-pro",
                input=input_data
            )
            
            # Extract URL from output
            result_url = output[0] if isinstance(output, list) else output
            
            if not result_url:
                raise ValueError("Replicate did not return an image URL")
            
            logger.info(f"Grid generated successfully: {result_url}")
            return result_url
            
        except Exception as e:
            logger.error(f"Flux-kontext generation failed: {e}")
            raise
    
    def upscale_with_topaz(
        self,
        image_base64: str,
        enhance_model: str = "Standard V2",
        upscale_factor: str = "2x",
        output_format: str = "jpg"
    ) -> str:
        """
        Upscale image using Topaz Labs Image Upscaler.
        
        Args:
            image_base64: Base64-encoded image to upscale
            enhance_model: Enhancement model ("Standard V2", "Graphics V1", etc.)
            upscale_factor: Upscaling factor ("2x", "4x", "6x")
            output_format: Output format ("jpg" or "png")
            
        Returns:
            URL of the upscaled image
        """
        logger.info(f"Upscaling image with Topaz Labs ({upscale_factor})")
        
        input_data = {
            "image": f"data:image/jpeg;base64,{image_base64}",
            "enhance_model": enhance_model,
            "output_format": output_format,
            "upscale_factor": upscale_factor,
            "face_enhancement": False,
            "subject_detection": "None",
            "face_enhancement_strength": 0,
            "face_enhancement_creativity": 0,
        }
        
        try:
            output = self.client.run(
                "topazlabs/image-upscale",
                input=input_data
            )
            
            # Extract URL from output
            result_url = output[0] if isinstance(output, list) else output
            
            if not result_url:
                raise ValueError("Topaz Labs did not return an image URL")
            
            logger.info(f"Image upscaled successfully: {result_url}")
            return result_url
            
        except Exception as e:
            logger.error(f"Topaz Labs upscaling failed: {e}")
            raise
    
    def download_image_as_base64(self, image_url: str) -> str:
        """
        Download image from URL and convert to base64.
        
        Args:
            image_url: URL of the image to download
            
        Returns:
            Base64-encoded image data
        """
        logger.debug(f"Downloading image from: {image_url}")
        
        try:
            response = requests.get(image_url, timeout=60)
            response.raise_for_status()
            
            image_base64 = base64.b64encode(response.content).decode('utf-8')
            logger.debug(f"Image downloaded successfully ({len(image_base64)} bytes)")
            
            return image_base64
            
        except Exception as e:
            logger.error(f"Failed to download image: {e}")
            raise
    
    def download_image_as_bytes(self, image_url: str) -> bytes:
        """
        Download image from URL as raw bytes.
        
        Args:
            image_url: URL of the image to download
            
        Returns:
            Raw image bytes
        """
        logger.debug(f"Downloading image bytes from: {image_url}")
        
        try:
            response = requests.get(image_url, timeout=60)
            response.raise_for_status()
            
            logger.debug(f"Image bytes downloaded successfully ({len(response.content)} bytes)")
            return response.content
            
        except Exception as e:
            logger.error(f"Failed to download image bytes: {e}")
            raise
