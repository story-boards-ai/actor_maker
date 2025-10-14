"""
Example usage of OpenAI GPT integration.
Demonstrates simple text and vision completions.
"""
import os
import sys
import logging

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.utils import (
    OpenAIClient,
    text_completion,
    vision_completion,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def example_simple_text():
    """Example: Simple text prompt to response."""
    print("\n=== Example 1: Simple Text Completion ===")
    
    prompt = "What are the three primary colors? Give a brief answer."
    
    try:
        response = text_completion(prompt)
        print(f"Prompt: {prompt}")
        print(f"Response: {response}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_json_text():
    """Example: Text completion with JSON response."""
    print("\n=== Example 2: JSON Text Completion ===")
    
    prompt = """
    Analyze the style characteristics of film noir and return a JSON object with:
    - name: the style name
    - characteristics: array of 3 key visual characteristics
    - era: time period
    """
    
    try:
        response = text_completion(prompt, json_mode=True)
        print(f"Response type: {type(response)}")
        print(f"Response: {response}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_vision_url():
    """Example: Vision completion with image URL."""
    print("\n=== Example 3: Vision with Image URL ===")
    
    # Example image URL (replace with actual image)
    image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/320px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
    prompt = "Describe this image in one sentence."
    
    try:
        response = vision_completion(
            prompt=prompt,
            image_url=image_url
        )
        print(f"Prompt: {prompt}")
        print(f"Response: {response}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_vision_json():
    """Example: Vision completion with JSON response."""
    print("\n=== Example 4: Vision with JSON Response ===")
    
    image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/320px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
    prompt = """
    Analyze this image and return JSON with:
    - dominant_colors: array of 3 main colors
    - scene_type: type of scene (landscape, portrait, etc)
    - mood: overall mood/feeling
    """
    
    try:
        response = vision_completion(
            prompt=prompt,
            image_url=image_url,
            json_mode=True
        )
        print(f"Response: {response}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_vision_base64():
    """Example: Vision with base64 encoded image."""
    print("\n=== Example 5: Vision with Base64 Image ===")
    
    # For this example, we'd need an actual base64 image
    # This is just showing the pattern
    
    print("Skipped - requires base64 image data")
    print("Pattern:")
    print("""
    from src.utils import image_to_base64
    
    # Load and encode image
    with open('path/to/image.jpg', 'rb') as f:
        image_base64 = image_to_base64(f.read())
    
    # Use in vision completion
    response = vision_completion(
        prompt="Describe this image",
        image_base64=image_base64
    )
    """)


def example_client_instance():
    """Example: Using OpenAIClient instance for multiple calls."""
    print("\n=== Example 6: Using Client Instance ===")
    
    try:
        client = OpenAIClient()
        
        # First call
        response1 = client.text_completion(
            "What is the capital of France?",
            max_tokens=50
        )
        print(f"Response 1: {response1}")
        
        # Second call with different parameters
        response2 = client.text_completion(
            "List 3 famous French landmarks in JSON format with name and description.",
            json_mode=True,
            temperature=0.5
        )
        print(f"Response 2: {response2}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_custom_model():
    """Example: Using different models."""
    print("\n=== Example 7: Custom Model Selection ===")
    
    prompt = "Explain quantum computing in one sentence."
    
    try:
        # Use gpt-4o-mini (faster, cheaper)
        response = text_completion(
            prompt,
            model="gpt-4o-mini",
            temperature=0.3
        )
        print(f"Model: gpt-4o-mini")
        print(f"Response: {response}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_style_analysis():
    """Example: Analyze artistic style (common use case)."""
    print("\n=== Example 8: Style Analysis ===")
    
    prompt = """
    Describe the visual characteristics of the "film noir" style and return JSON with:
    - style_name: the name
    - lighting: lighting characteristics
    - color_palette: typical colors used
    - composition: composition techniques
    - mood: overall mood
    """
    
    try:
        response = text_completion(prompt, json_mode=True, temperature=0.2)
        print("Style Analysis Result:")
        import json
        print(json.dumps(response, indent=2))
    except Exception as e:
        print(f"❌ Error: {str(e)}")


if __name__ == "__main__":
    # Check API key
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set")
        print("   Set OPENAI_API_KEY in .env to run examples")
        sys.exit(1)
    
    print("✅ OPENAI_API_KEY found\n")
    
    # Run examples
    example_simple_text()
    example_json_text()
    example_vision_url()
    example_vision_json()
    example_vision_base64()
    example_client_instance()
    example_custom_model()
    example_style_analysis()
    
    print("\n✅ Examples completed")
