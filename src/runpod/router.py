"""
RunPod image generation router with automatic fallback.
Routes requests to pod endpoints first, falls back to serverless on failure.
Based on runpodImageRequest.ts from the backend.
"""
import logging
from typing import Dict, Any, Optional
from .pod import generate_pod_image
from .serverless import generate_serverless_image

logger = logging.getLogger(__name__)


class RunPodRouter:
    """
    Router that tries pod-based generation first, falls back to serverless.
    """
    
    def __init__(
        self,
        pod_endpoint: Optional[str] = None,
        pod_api_key: Optional[str] = None,
        serverless_api_key: Optional[str] = None
    ):
        """
        Initialize the router.
        
        Args:
            pod_endpoint: Optional pod endpoint URL
            pod_api_key: Optional pod API key
            serverless_api_key: Optional serverless API key
        """
        self.pod_endpoint = pod_endpoint
        self.pod_api_key = pod_api_key
        self.serverless_api_key = serverless_api_key
    
    def generate_image(
        self,
        payload: Dict[str, Any],
        mode: str = "wizard",
        request_id: Optional[str] = None,
        force_serverless: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Generate an image with automatic fallback.
        
        Tries pod generation first if endpoint is available, falls back to
        serverless on any failure.
        
        Args:
            payload: Generation payload with workflow
            mode: Generation mode for serverless routing
            request_id: Optional request ID for tracking
            force_serverless: Skip pod and go directly to serverless
        
        Returns:
            Response dict or None on complete failure
        """
        log_prefix = f"[ROUTER] requestId={request_id or 'N/A'}"
        
        # Try pod first if endpoint available and not forced to serverless
        if self.pod_endpoint and not force_serverless:
            logger.info(f"{log_prefix} | Attempting pod generation")
            
            try:
                result = generate_pod_image(
                    endpoint=self.pod_endpoint,
                    payload=payload,
                    request_id=request_id,
                    api_key=self.pod_api_key
                )
                
                # Check if pod request succeeded
                if result and result.get("status") != "FAILED":
                    logger.info(f"{log_prefix} | Pod generation successful")
                    return result
                
                logger.warning(
                    f"{log_prefix} | Pod request failed or returned undefined. "
                    f"Falling back to serverless."
                )
                
            except Exception as e:
                logger.warning(
                    f"{log_prefix} | Pod generation error: {str(e)}. "
                    f"Falling back to serverless."
                )
        
        # Fall back to serverless
        logger.info(f"{log_prefix} | Using serverless generation")
        
        try:
            result = generate_serverless_image(
                payload=payload,
                mode=mode,
                request_id=request_id,
                api_key=self.serverless_api_key
            )
            
            if result:
                logger.info(f"{log_prefix} | Serverless generation successful")
            else:
                logger.error(f"{log_prefix} | Serverless generation failed")
            
            return result
            
        except Exception as e:
            logger.error(
                f"{log_prefix} | Serverless generation error: {str(e)}"
            )
            return None


# Convenience function
def generate_image(
    payload: Dict[str, Any],
    mode: str = "wizard",
    request_id: Optional[str] = None,
    pod_endpoint: Optional[str] = None,
    pod_api_key: Optional[str] = None,
    serverless_api_key: Optional[str] = None,
    force_serverless: bool = False
) -> Optional[Dict[str, Any]]:
    """
    Generate an image with automatic pod/serverless routing.
    
    This is the main entry point for image generation.
    
    Args:
        payload: Generation payload with workflow
        mode: Generation mode ('wizard', 'new_pre', etc.)
        request_id: Optional request ID for tracking
        pod_endpoint: Optional pod endpoint URL
        pod_api_key: Optional pod API key
        serverless_api_key: Optional serverless API key
        force_serverless: Skip pod and go directly to serverless
    
    Returns:
        Response dict with status and output, or None on failure
    
    Example:
        >>> payload = {
        ...     "input": {
        ...         "workflow": {...},
        ...         "model_urls": [...]
        ...     }
        ... }
        >>> result = generate_image(payload, mode="wizard")
        >>> if result and result["status"] == "COMPLETED":
        ...     images = result["output"]["job_results"]["images"]
    """
    router = RunPodRouter(
        pod_endpoint=pod_endpoint,
        pod_api_key=pod_api_key,
        serverless_api_key=serverless_api_key
    )
    
    return router.generate_image(
        payload=payload,
        mode=mode,
        request_id=request_id,
        force_serverless=force_serverless
    )
