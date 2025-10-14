#!/usr/bin/env python3
"""
Image generation script using RunPod serverless.
Receives payload via stdin and sends to RunPod serverless endpoint.
"""
import sys
import json
import logging
import time
import os
from pathlib import Path
from dotenv import load_dotenv

# Add src to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

# Load environment variables from .env file
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)
    logging.info(f"Loaded environment variables from {env_path}")
else:
    logging.warning(f".env file not found at {env_path}")

from runpod import generate_serverless_image

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main entry point for image generation."""
    try:
        # Read payload from stdin
        logger.info("Reading payload from stdin...")
        payload_json = sys.stdin.read()
        
        if not payload_json:
            raise ValueError("No payload received on stdin")
        
        payload = json.loads(payload_json)
        logger.info(f"Payload loaded successfully")
        logger.info(f"Workflow nodes: {len(payload.get('input', {}).get('workflow', {}))}")
        logger.info(f"Model URLs: {len(payload.get('input', {}).get('model_urls', []))}")
        
        # Send to RunPod serverless
        # Check if API key is available
        api_key = os.getenv("RUNPOD_API_KEY")
        if not api_key:
            raise ValueError("RUNPOD_API_KEY not found in environment variables")
        
        endpoint_id = os.getenv("RUNPOD_SERVER_150_ID")
        if not endpoint_id:
            raise ValueError("RUNPOD_SERVER_150_ID not found in environment variables")
        
        logger.info(f"✅ Environment loaded successfully")
        logger.info(f"   API Key: {api_key[:10]}...")
        logger.info(f"   Endpoint ID: {endpoint_id}")
        logger.info(f"   Mode: 150 (RUNPOD_SERVER_150_ID)")
        logger.info("Sending request to RunPod serverless...")
        
        result = generate_serverless_image(
            payload=payload,
            mode="150",  # Use RUNPOD_SERVER_150_ID endpoint
            request_id=f"img2img_{int(time.time() * 1000)}",
            api_key=api_key
        )
        
        if result is None:
            raise Exception("RunPod returned None result")
        
        logger.info(f"RunPod response status: {result.get('status')}")
        
        # Output result as JSON to stdout
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Image generation failed: {str(e)}", exc_info=True)
        error_result = {
            "status": "FAILED",
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    main()
