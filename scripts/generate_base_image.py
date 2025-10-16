#!/usr/bin/env python3
"""
Generate base image for a new actor using FLUX and the normal_image_v4_workflow.
This creates a full-body portrait suitable for LoRA training.
"""
import sys
import json
import logging
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.runpod.serverless import RunPodServerlessClient
from src.workflows_lib.workflow_builder import WorkflowBuilder

logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def generate_base_image(
    description: str,
    actor_name: str,
    width: int = 1024,
    height: int = 1536,
    steps: int = 25,
    seed: int = -1,
    flux_guidance: float = 3.5
) -> dict:
    """
    Generate a base image for an actor.
    
    Args:
        description: Character description (e.g., "european 25 year old male with short brown hair")
        actor_name: Actor folder name (e.g., "0000_european_16_male")
        width: Image width (default: 1024 for portrait)
        height: Image height (default: 1536 for full body portrait)
        steps: Sampling steps (default: 25 for high quality)
        seed: Random seed (-1 for random)
        flux_guidance: FLUX guidance value (default: 3.5)
    
    Returns:
        Result dictionary with status and image data
    """
    logger.info("="*80)
    logger.info("BASE IMAGE GENERATION")
    logger.info(f"Actor: {actor_name}")
    logger.info(f"Description: {description}")
    logger.info(f"Dimensions: {width}x{height}")
    logger.info("="*80)
    
    # Build the prompt for a professional base image
    # This follows the pattern observed in the existing base images:
    # - Full body portrait
    # - Neutral studio background
    # - Professional lighting
    # - Centered composition
    # - Natural pose
    prompt = f"""Professional full-body studio portrait photograph of a {description}.
Standing pose, facing camera, centered in frame.
Neutral gray or beige studio background with professional lighting.
Natural relaxed pose with arms at sides or casually positioned.
Sharp focus, high quality, photorealistic.
Full body visible from head to toe.
Casual to semi-formal attire appropriate for the character.
Direct eye contact with camera or slight angle.
Clean composition, no distracting elements."""
    
    logger.info(f"Generated prompt: {prompt[:200]}...")
    
    # Initialize clients
    try:
        serverless_client = RunPodServerlessClient()
        workflow_builder = WorkflowBuilder()
        logger.info("✓ Clients initialized")
    except Exception as e:
        logger.error(f"Failed to initialize clients: {e}")
        return {
            "status": "FAILED",
            "error": str(e)
        }
    
    # Build workflow with parameters optimized for base images
    workflow_params = {
        "positive_prompt": prompt,
        "width": width,
        "height": height,
        "steps": steps,
        "seed": seed,
        "model": "flux1-dev-fp8",
        "sampler_name": "euler",
        "scheduler_name": "simple",
        "flux_guidance": flux_guidance,
        "batch_size": 1,
        # No LoRAs for base image generation
        "lora_name": None,
        "character_loras": None,
        "cine_lora_strength": 0.0
    }
    
    try:
        workflow = workflow_builder.build_workflow(**workflow_params)
        logger.info("✓ Workflow built successfully")
    except Exception as e:
        logger.error(f"Failed to build workflow: {e}")
        return {
            "status": "FAILED",
            "error": f"Workflow build error: {str(e)}"
        }
    
    # Build RunPod payload
    payload = {
        "input": {
            "workflow": workflow,
            "model_urls": [],  # No custom models needed
            "force_download": False
        }
    }
    
    # Generate image using wizard endpoint (RUNPOD_SERVER_100_ID)
    logger.info("Sending request to RunPod serverless...")
    try:
        result = serverless_client.generate_image(
            payload=payload,
            mode="wizard",
            request_id=f"base_{actor_name}"
        )
    except Exception as e:
        logger.error(f"RunPod request failed: {e}")
        return {
            "status": "FAILED",
            "error": f"RunPod error: {str(e)}"
        }
    
    if not result:
        logger.error("No result from RunPod")
        return {
            "status": "FAILED",
            "error": "No response from RunPod"
        }
    
    # Check status
    status = result.get("status")
    if status != "COMPLETED":
        error = result.get("output", {}).get("error", "Unknown error")
        logger.error(f"Generation failed: {error}")
        return {
            "status": "FAILED",
            "error": error,
            "runpod_response": result
        }
    
    logger.info("✓ Image generated successfully")
    logger.info("="*80)
    
    return {
        "status": "COMPLETED",
        "output": result.get("output"),
        "seed": workflow_params["seed"],
        "metadata": {
            "actor_name": actor_name,
            "description": description,
            "width": width,
            "height": height,
            "steps": steps,
            "prompt": prompt
        }
    }


def main():
    """Main entry point for CLI usage."""
    if len(sys.argv) < 3:
        print("Usage: python generate_base_image.py <actor_name> <description> [width] [height] [steps] [seed]")
        print("Example: python generate_base_image.py '0100_european_25_male' 'european 25 year old male with short brown hair' 1024 1536 25 -1")
        sys.exit(1)
    
    actor_name = sys.argv[1]
    description = sys.argv[2]
    width = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
    height = int(sys.argv[4]) if len(sys.argv) > 4 else 1536
    steps = int(sys.argv[5]) if len(sys.argv) > 5 else 25
    seed = int(sys.argv[6]) if len(sys.argv) > 6 else -1
    
    result = generate_base_image(
        description=description,
        actor_name=actor_name,
        width=width,
        height=height,
        steps=steps,
        seed=seed
    )
    
    # Output JSON result
    print(json.dumps(result, indent=2))
    
    # Exit with appropriate code
    sys.exit(0 if result.get("status") == "COMPLETED" else 1)


if __name__ == "__main__":
    main()
