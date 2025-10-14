"""
Simple OpenAI GPT client for text and vision completions.
Based on backend gpt.ts patterns.
"""
import os
import logging
import time
from typing import Dict, Any, Optional, List, Union

try:
    from openai import OpenAI
except ImportError:
    raise ImportError(
        "openai is required for GPT functionality. "
        "Install it with: pip install openai"
    )

logger = logging.getLogger(__name__)


class OpenAIConfig:
    """OpenAI configuration from environment variables."""
    
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # Default models
    DEFAULT_TEXT_MODEL = "gpt-4o-mini"
    DEFAULT_VISION_MODEL = "gpt-4o"
    
    # Default parameters
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_MAX_TOKENS = 1000
    
    @classmethod
    def validate(cls) -> None:
        """Validate that required OpenAI credentials are set."""
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY environment variable is required")


class OpenAIClient:
    """
    Simple OpenAI client for text and vision completions.
    
    Focused on two main use cases:
    1. Text prompt -> text response
    2. Image + prompt -> text response (vision)
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize OpenAI client.
        
        Args:
            api_key: OpenAI API key (uses OPENAI_API_KEY env var if not provided)
        """
        self.api_key = api_key or OpenAIConfig.OPENAI_API_KEY
        if not self.api_key:
            raise ValueError(
                "OpenAI API key is required. Set OPENAI_API_KEY environment variable "
                "or pass api_key to the constructor."
            )
        
        self.client = OpenAI(api_key=self.api_key)
        logger.debug("OpenAI client initialized successfully")
    
    def text_completion(
        self,
        prompt: str,
        model: str = OpenAIConfig.DEFAULT_TEXT_MODEL,
        temperature: float = OpenAIConfig.DEFAULT_TEMPERATURE,
        max_tokens: int = OpenAIConfig.DEFAULT_MAX_TOKENS,
        system_message: Optional[str] = None,
        json_mode: bool = False,
        max_retries: int = 3
    ) -> Union[str, Dict[str, Any]]:
        """
        Simple text completion.
        
        Args:
            prompt: User prompt text
            model: Model to use (default: gpt-4o-mini)
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens in response
            system_message: Optional system message
            json_mode: If True, forces JSON output and parses response
            max_retries: Number of retry attempts on failure
        
        Returns:
            String response or dict if json_mode=True
        """
        logger.info(f"Text completion request: model={model}, json_mode={json_mode}")
        
        # Build messages
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        elif json_mode:
            # Default system message for JSON mode
            messages.append({
                "role": "system",
                "content": "You are a helpful assistant designed to output JSON."
            })
        
        messages.append({"role": "user", "content": prompt})
        
        # Build request params
        params = {
            "model": model,
            "messages": messages,
        }
        
        # GPT-5 models require different parameter names and restrictions
        is_gpt5 = model.lower().startswith("gpt-5")
        
        if is_gpt5:
            # GPT-5 uses max_completion_tokens instead of max_tokens
            params["max_completion_tokens"] = max_tokens
            # GPT-5 only supports default temperature (1.0), omit custom values
            if temperature != 1.0:
                logger.warning(f"GPT-5 only supports default temperature (1.0), ignoring temperature={temperature}")
        else:
            # GPT-4 and earlier use max_tokens
            params["max_tokens"] = max_tokens
            params["temperature"] = temperature
        
        if json_mode:
            params["response_format"] = {"type": "json_object"}
        
        # Retry logic
        for attempt in range(1, max_retries + 1):
            try:
                logger.debug(f"Attempt {attempt}/{max_retries}")
                
                response = self.client.chat.completions.create(**params)
                content = response.choices[0].message.content
                
                logger.info(f"✅ Text completion successful (tokens: {response.usage.total_tokens})")
                
                # Parse JSON if requested
                if json_mode:
                    import json
                    try:
                        return json.loads(content)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse JSON response: {content[:200]}")
                        raise ValueError(f"Invalid JSON in response: {str(e)}")
                
                return content
                
            except Exception as e:
                logger.error(f"Error on attempt {attempt}: {str(e)}")
                
                if attempt < max_retries:
                    wait_time = 2 ** (attempt - 1)  # Exponential backoff
                    logger.info(f"Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed after {max_retries} attempts")
                    raise
    
    def vision_completion(
        self,
        prompt: str,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        model: str = OpenAIConfig.DEFAULT_VISION_MODEL,
        temperature: float = OpenAIConfig.DEFAULT_TEMPERATURE,
        max_tokens: int = OpenAIConfig.DEFAULT_MAX_TOKENS,
        system_message: Optional[str] = None,
        json_mode: bool = False,
        max_retries: int = 3
    ) -> Union[str, Dict[str, Any]]:
        """
        Vision completion with image + text prompt.
        
        Args:
            prompt: Text prompt describing what to analyze
            image_url: URL of image to analyze (mutually exclusive with image_base64)
            image_base64: Base64 encoded image (mutually exclusive with image_url)
            model: Vision model to use (default: gpt-4o)
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            system_message: Optional system message
            json_mode: If True, forces JSON output
            max_retries: Number of retry attempts
        
        Returns:
            String response or dict if json_mode=True
            
        Raises:
            ValueError: If neither or both image_url and image_base64 provided
        """
        if not image_url and not image_base64:
            raise ValueError("Either image_url or image_base64 must be provided")
        if image_url and image_base64:
            raise ValueError("Provide only one of image_url or image_base64")
        
        logger.info(f"Vision completion request: model={model}, json_mode={json_mode}")
        
        # Warn about experimental models
        if model.lower().startswith("gpt-5"):
            logger.warning(f"⚠️  Using experimental model '{model}' - this model may not support vision or may return empty responses")
            logger.warning(f"   Consider using 'gpt-4o' or 'gpt-4o-mini' for reliable vision completions")
        
        # Build image content
        if image_url:
            image_content = {"type": "image_url", "image_url": {"url": image_url}}
        else:
            # Base64 image with data URI
            if not image_base64.startswith("data:"):
                image_base64 = f"data:image/jpeg;base64,{image_base64}"
            image_content = {"type": "image_url", "image_url": {"url": image_base64}}
        
        # Build messages
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        elif json_mode:
            messages.append({
                "role": "system",
                "content": "You are a helpful assistant designed to output JSON."
            })
        
        # User message with text and image
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                image_content
            ]
        })
        
        # Build request params
        params = {
            "model": model,
            "messages": messages,
        }
        
        # GPT-5 models require different parameter names and restrictions
        is_gpt5 = model.lower().startswith("gpt-5")
        
        if is_gpt5:
            # GPT-5 uses max_completion_tokens instead of max_tokens
            params["max_completion_tokens"] = max_tokens
            # GPT-5 only supports default temperature (1.0), omit custom values
            if temperature != 1.0:
                logger.warning(f"GPT-5 only supports default temperature (1.0), ignoring temperature={temperature}")
        else:
            # GPT-4 and earlier use max_tokens
            params["max_tokens"] = max_tokens
            params["temperature"] = temperature
        
        if json_mode:
            params["response_format"] = {"type": "json_object"}
        
        # Retry logic
        for attempt in range(1, max_retries + 1):
            try:
                logger.debug(f"Attempt {attempt}/{max_retries}")
                logger.info(f"🌐 [API-CALL] Calling OpenAI API with model={model}")
                logger.debug(f"   Parameters: {list(params.keys())}")
                
                response = self.client.chat.completions.create(**params)
                content = response.choices[0].message.content
                
                logger.info(f"✅ [API-SUCCESS] Vision completion successful")
                logger.info(f"   Tokens used: {response.usage.total_tokens} (prompt: {response.usage.prompt_tokens}, completion: {response.usage.completion_tokens})")
                
                # Show reasoning tokens for GPT-5 models
                if hasattr(response.usage, 'completion_tokens_details'):
                    details = response.usage.completion_tokens_details
                    if hasattr(details, 'reasoning_tokens') and details.reasoning_tokens > 0:
                        logger.info(f"   Reasoning tokens: {details.reasoning_tokens} (internal thinking)")
                        logger.info(f"   Output tokens: {response.usage.completion_tokens - details.reasoning_tokens} (actual response)")
                
                logger.info(f"   Response length: {len(content) if content else 0} chars")
                logger.info(f"   Content type: {type(content)}")
                logger.info(f"   Content value: {repr(content)}")
                
                # Check for empty or None content
                if content is None:
                    logger.error("⚠️  [WARNING] API returned None content!")
                    logger.error(f"   Full response: {response}")
                    return ""
                
                if not content.strip():
                    logger.warning("⚠️  [WARNING] API returned empty content!")
                    logger.warning(f"   Finish reason: {response.choices[0].finish_reason}")
                    logger.warning(f"   Full response: {response}")
                
                # Parse JSON if requested
                if json_mode:
                    import json
                    try:
                        return json.loads(content)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse JSON response: {content[:200]}")
                        raise ValueError(f"Invalid JSON in response: {str(e)}")
                
                return content
                
            except Exception as e:
                logger.error(f"Error on attempt {attempt}: {str(e)}")
                
                if attempt < max_retries:
                    wait_time = 2 ** (attempt - 1)
                    logger.info(f"Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed after {max_retries} attempts")
                    raise


# Convenience functions

def text_completion(
    prompt: str,
    model: str = OpenAIConfig.DEFAULT_TEXT_MODEL,
    json_mode: bool = False,
    **kwargs
) -> Union[str, Dict[str, Any]]:
    """
    Simple text completion using default client.
    
    Args:
        prompt: User prompt
        model: Model to use
        json_mode: Return JSON response
        **kwargs: Additional arguments for OpenAIClient.text_completion
    
    Returns:
        String or dict response
    """
    client = OpenAIClient()
    return client.text_completion(prompt, model=model, json_mode=json_mode, **kwargs)


def vision_completion(
    prompt: str,
    image_url: Optional[str] = None,
    image_base64: Optional[str] = None,
    model: str = OpenAIConfig.DEFAULT_VISION_MODEL,
    json_mode: bool = False,
    **kwargs
) -> Union[str, Dict[str, Any]]:
    """
    Simple vision completion using default client.
    
    Args:
        prompt: Text prompt
        image_url: Image URL
        image_base64: Base64 encoded image
        model: Vision model to use
        json_mode: Return JSON response
        **kwargs: Additional arguments for OpenAIClient.vision_completion
    
    Returns:
        String or dict response
    """
    client = OpenAIClient()
    return client.vision_completion(
        prompt,
        image_url=image_url,
        image_base64=image_base64,
        model=model,
        json_mode=json_mode,
        **kwargs
    )
