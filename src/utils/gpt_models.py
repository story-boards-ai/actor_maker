"""
GPT model configurations for caption generation.
Based on story-boards-backend model configs.
"""

# Vision models suitable for image captioning
VISION_MODELS = {
    # GPT-4o series - Best for vision tasks
    "gpt-4o": {
        "name": "GPT-4o",
        "description": "Most capable vision model, best quality",
        "cost": "High",
        "speed": "Medium",
        "supports_vision": True
    },
    "gpt-4o-mini": {
        "name": "GPT-4o Mini",
        "description": "Balanced cost and quality for vision",
        "cost": "Medium",
        "speed": "Fast",
        "supports_vision": True
    },
    
    # GPT-4.1 series - 1M context window
    "gpt-4.1": {
        "name": "GPT-4.1",
        "description": "Large context window, high quality",
        "cost": "High",
        "speed": "Medium",
        "supports_vision": True
    },
    "gpt-4.1-mini": {
        "name": "GPT-4.1 Mini",
        "description": "Large context, lower cost",
        "cost": "Medium",
        "speed": "Fast",
        "supports_vision": True
    },
    
    # GPT-5 series - Latest models (if available)
    "gpt-5": {
        "name": "GPT-5",
        "description": "Next-gen model (if available)",
        "cost": "Very High",
        "speed": "Slow",
        "supports_vision": True
    },
    "gpt-5-mini": {
        "name": "GPT-5 Mini",
        "description": "Next-gen balanced model",
        "cost": "High",
        "speed": "Medium",
        "supports_vision": True
    },
    "gpt-5-nano": {
        "name": "GPT-5 Nano",
        "description": "Fastest next-gen model",
        "cost": "Medium",
        "speed": "Very Fast",
        "supports_vision": True
    },
}

# Default model for caption generation
DEFAULT_VISION_MODEL = "gpt-4o"

# Model pricing (approximate, per 1K tokens)
MODEL_PRICING = {
    "gpt-4o": {"input": 0.0025, "output": 0.010},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4.1": {"input": 0.0025, "output": 0.010},
    "gpt-4.1-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-5": {"input": 0.0050, "output": 0.020},
    "gpt-5-mini": {"input": 0.0025, "output": 0.010},
    "gpt-5-nano": {"input": 0.00015, "output": 0.0006},
}


def get_vision_models():
    """Get list of available vision models."""
    return VISION_MODELS


def get_model_info(model_id: str):
    """Get information about a specific model."""
    return VISION_MODELS.get(model_id, VISION_MODELS[DEFAULT_VISION_MODEL])


def is_vision_model(model_id: str):
    """Check if a model supports vision."""
    model = VISION_MODELS.get(model_id)
    return model and model.get("supports_vision", False)
