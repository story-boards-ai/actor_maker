"""
Example usage of RunPod image generation modules.
"""
import os
import sys
import json
import logging

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.runpod import generate_image, generate_serverless_image, generate_pod_image

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def example_router_usage():
    """Example: Using the router (recommended approach)."""
    print("\n=== Example 1: Router with automatic fallback ===")
    
    # Load a workflow
    with open("workflows/style_transfer_3_API.json", "r") as f:
        workflow = json.load(f)
    
    # Prepare payload
    payload = {
        "input": {
            "workflow": workflow,
            "model_urls": [
                {
                    "id": "my_model.safetensors",
                    "url": "https://example.com/model.safetensors"
                }
            ]
        }
    }
    
    # Generate with automatic routing
    result = generate_image(
        payload=payload,
        mode="wizard",
        request_id="example-123",
        pod_endpoint=os.getenv("POD_ENDPOINT"),  # Optional
    )
    
    if result and result["status"] == "COMPLETED":
        images = result["output"]["job_results"]["images"]
        print(f"✅ Generated {len(images)} images successfully")
        return images
    else:
        print("❌ Generation failed")
        return None


def example_serverless_only():
    """Example: Using serverless directly."""
    print("\n=== Example 2: Serverless only ===")
    
    payload = {
        "input": {
            "workflow": {},  # Your workflow here
        }
    }
    
    result = generate_serverless_image(
        payload=payload,
        mode="wizard",
        request_id="serverless-123"
    )
    
    if result:
        print(f"Status: {result['status']}")
        return result
    else:
        print("❌ Serverless request failed")
        return None


def example_pod_only():
    """Example: Using pod directly."""
    print("\n=== Example 3: Pod only ===")
    
    pod_endpoint = os.getenv("POD_ENDPOINT")
    if not pod_endpoint:
        print("⚠️  POD_ENDPOINT not set, skipping pod example")
        return None
    
    payload = {
        "input": {
            "workflow": {},  # Your workflow here
        }
    }
    
    result = generate_pod_image(
        endpoint=pod_endpoint,
        payload=payload,
        request_id="pod-123"
    )
    
    if result:
        print(f"Status: {result['status']}")
        return result
    else:
        print("❌ Pod request failed")
        return None


def example_with_base64_images():
    """Example: Using workflow with base64 images."""
    print("\n=== Example 4: With base64 encoded images ===")
    
    with open("workflows/style_transfer_3_API.json", "r") as f:
        workflow = json.load(f)
    
    # Example: Set base64 images in workflow nodes
    # Node 458 is source_input, node 459 is style_input
    workflow["458"]["inputs"]["base64Images"] = json.dumps([
        "iVBORw0KGgo..."  # Your base64 encoded image
    ])
    workflow["459"]["inputs"]["base64Images"] = json.dumps([
        "iVBORw0KGgo..."  # Your base64 encoded style image
    ])
    
    payload = {"input": {"workflow": workflow}}
    
    result = generate_image(
        payload=payload,
        mode="wizard",
        request_id="base64-123"
    )
    
    return result


def example_error_handling():
    """Example: Proper error handling."""
    print("\n=== Example 5: Error handling ===")
    
    try:
        payload = {"input": {"workflow": {}}}
        
        result = generate_image(
            payload=payload,
            mode="wizard",
            request_id="error-test-123"
        )
        
        if not result:
            print("❌ Request returned None (connection/timeout error)")
            return
        
        status = result.get("status")
        
        if status == "COMPLETED":
            images = result.get("output", {}).get("job_results", {}).get("images", [])
            if images:
                print(f"✅ Success: {len(images)} images")
            else:
                print("⚠️  Completed but no images found")
        
        elif status == "FAILED":
            error = result.get("output", {}).get("error", "Unknown error")
            print(f"❌ Failed: {error}")
        
        else:
            print(f"⚠️  Unknown status: {status}")
    
    except Exception as e:
        print(f"❌ Exception: {str(e)}")


if __name__ == "__main__":
    # Check environment variables
    if not os.getenv("RUNPOD_API_KEY"):
        print("⚠️  Warning: RUNPOD_API_KEY not set")
    
    # Run examples
    example_router_usage()
    example_serverless_only()
    example_pod_only()
    example_with_base64_images()
    example_error_handling()
    
    print("\n✅ Examples completed")
