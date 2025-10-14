"""
RunPod pod-based image generation for direct API calls to running pods.
Based on runpodPodImageRequest.ts from the backend.
"""
import time
import logging
import requests
from typing import Dict, Any, Optional
from .config import RunPodConfig

logger = logging.getLogger(__name__)


class RunPodPodClient:
    """Client for direct pod-based image generation."""
    
    def __init__(
        self,
        endpoint: str,
        api_key: Optional[str] = None
    ):
        """
        Initialize the pod client.
        
        Args:
            endpoint: Pod endpoint URL (e.g., https://xxx-8000.proxy.runpod.net)
            api_key: Optional API key for pod authentication (uses SB_SPOT_API_KEY env var)
        """
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key or RunPodConfig.SB_SPOT_API_KEY
        
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        if self.api_key:
            self.session.headers["X-API-Key"] = self.api_key
    
    def generate_image(
        self,
        payload: Dict[str, Any],
        request_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Send an image generation request to the pod.
        
        Args:
            payload: The generation payload with workflow and model_urls
            request_id: Optional request ID for tracking
        
        Returns:
            Response dict with normalized format, or None on failure
        """
        pod_start = time.time()
        log_prefix = f"[POD] requestId={request_id or 'N/A'}"
        
        logger.info(f"{log_prefix} | Sending request to pod: {self.endpoint}")
        
        try:
            # Extract input from payload (matches backend format)
            body = payload.get("input", payload)
            
            # Send POST to /generate endpoint
            url = f"{self.endpoint}/generate"
            response = self.session.post(
                url,
                json=body,
                timeout=RunPodConfig.POD_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            duration_ms = (time.time() - pod_start) * 1000
            status = data.get("status", "success")
            
            logger.info(
                f"{log_prefix} ✅ | Pod request successful | "
                f"endpoint={self.endpoint} | status={status} | "
                f"duration={duration_ms:.0f}ms"
            )
            
            # Normalize response format to match serverless
            return self._normalize_response(data)
            
        except requests.exceptions.Timeout:
            duration_ms = (time.time() - pod_start) * 1000
            logger.error(
                f"{log_prefix} ❌ | Pod request timeout | "
                f"endpoint={self.endpoint} | duration={duration_ms:.0f}ms"
            )
            return None
            
        except requests.exceptions.HTTPError as e:
            duration_ms = (time.time() - pod_start) * 1000
            status_code = e.response.status_code
            error_data = e.response.text[:300] if e.response else "No response"
            
            logger.error(
                f"{log_prefix} ❌ | Pod request failed | "
                f"endpoint={self.endpoint} | status={status_code} | "
                f"duration={duration_ms:.0f}ms | error={error_data}"
            )
            return None
            
        except Exception as e:
            duration_ms = (time.time() - pod_start) * 1000
            logger.error(
                f"{log_prefix} ❌ | Pod request error | "
                f"endpoint={self.endpoint} | duration={duration_ms:.0f}ms | "
                f"error={str(e)}"
            )
            return None
    
    def _normalize_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize pod response to match serverless format.
        
        Args:
            response: Raw pod response
        
        Returns:
            Normalized response dict
        """
        # Extract images from various possible locations
        images = (
            response.get("output", {}).get("output", {}).get("images") or
            response.get("output", {}).get("images") or
            response.get("images") or
            []
        )
        
        # Extract status
        status_field = (
            response.get("status") or
            response.get("output", {}).get("status") or
            "success"
        )
        
        # Map to standardized status
        if status_field == "success":
            normalized_status = "COMPLETED"
        elif status_field == "failed":
            normalized_status = "FAILED"
        else:
            normalized_status = "COMPLETED"
        
        return {
            "id": response.get("id", "pod"),
            "status": normalized_status,
            "output": {
                "job_results": {
                    "images": images
                },
                "status": status_field
            }
        }
    
    def check_ready(self) -> bool:
        """
        Check if the pod is ready to accept requests.
        
        Returns:
            True if pod responds with 200 to /ready endpoint
        """
        try:
            url = f"{self.endpoint}/ready"
            response = self.session.get(url, timeout=3)
            is_ready = response.status_code == 200
            logger.debug(f"[POD] Ready check: {is_ready} | endpoint={self.endpoint}")
            return is_ready
        except Exception as e:
            logger.debug(f"[POD] Ready check failed: {str(e)}")
            return False


# Convenience function
def generate_pod_image(
    endpoint: str,
    payload: Dict[str, Any],
    request_id: Optional[str] = None,
    api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate an image using a direct pod endpoint.
    
    Args:
        endpoint: Pod endpoint URL
        payload: Generation payload with workflow
        request_id: Optional request ID for tracking
        api_key: Optional API key override
    
    Returns:
        Response dict or None on failure
    """
    client = RunPodPodClient(endpoint=endpoint, api_key=api_key)
    return client.generate_image(payload, request_id=request_id)
