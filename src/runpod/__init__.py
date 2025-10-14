"""
RunPod integration module for image generation and training.

This module provides:
- Serverless worker image generation
- Direct pod-based image generation  
- Automatic routing with fallback
- Configuration management
"""

from .router import generate_image, RunPodRouter
from .serverless import generate_serverless_image, RunPodServerlessClient
from .pod import generate_pod_image, RunPodPodClient
from .config import RunPodConfig

__all__ = [
    # Main generation function (recommended)
    "generate_image",
    
    # Specific methods
    "generate_serverless_image",
    "generate_pod_image",
    
    # Classes
    "RunPodRouter",
    "RunPodServerlessClient",
    "RunPodPodClient",
    "RunPodConfig",
]
