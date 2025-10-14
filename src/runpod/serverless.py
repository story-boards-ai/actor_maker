"""
RunPod serverless image generation with intelligent polling.
Based on runpodServerlessImageRequest.ts from the backend.
"""
import time
import logging
import requests
from typing import Dict, Any, Optional, List
from .config import RunPodConfig

logger = logging.getLogger(__name__)


class RunPodServerlessClient:
    """Client for RunPod serverless image generation."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the serverless client.
        
        Args:
            api_key: RunPod API key (uses RUNPOD_API_KEY env var if not provided)
        """
        self.api_key = api_key or RunPodConfig.RUNPOD_API_KEY
        if not self.api_key:
            raise ValueError("RunPod API key is required")
        
        self.base_url = "https://api.runpod.ai/v2"
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        })
    
    def generate_image(
        self,
        payload: Dict[str, Any],
        mode: str = "wizard",
        request_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Send an image generation request to RunPod serverless worker with polling.
        
        Args:
            payload: The generation payload with workflow and parameters
            mode: Generation mode ('wizard', 'new_pre', 'posterFrameRegeneration')
            request_id: Optional request ID for tracking
        
        Returns:
            Response dict with status and output, or None on failure
        """
        serverless_start = time.time()
        
        # Get appropriate endpoint
        endpoint_id = RunPodConfig.get_serverless_endpoint(mode)
        if not endpoint_id:
            logger.error(f"No serverless endpoint configured for mode: {mode}")
            return None
        
        log_prefix = f"[SERVERLESS] requestId={request_id or 'N/A'}"
        logger.info(
            f"{log_prefix} | Initiating request | mode={mode} | endpoint={endpoint_id}"
        )
        
        # Add timestamp to payload
        modified_payload = {
            **payload,
            "input": {
                **payload.get("input", {}),
                "timestamp": int(time.time() * 1000)
            }
        }
        
        try:
            # Initial request to /runsync
            url = f"{self.base_url}/{endpoint_id}/runsync"
            response = self.session.post(
                url,
                json=modified_payload,
                timeout=RunPodConfig.SYNC_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"{log_prefix} | Initial response status: {data.get('status')}")
            
            # Poll if job is in progress or queued
            if data.get("status") in ["IN_PROGRESS", "IN_QUEUE"]:
                data = self._poll_status(endpoint_id, data.get("id"), log_prefix)
            
            # Handle final status
            duration_ms = (time.time() - serverless_start) * 1000
            return self._handle_final_status(data, endpoint_id, request_id, duration_ms)
            
        except requests.exceptions.Timeout:
            logger.error(
                f"{log_prefix} | Timeout after {RunPodConfig.SYNC_TIMEOUT}s"
            )
            return None
        except Exception as e:
            logger.error(f"{log_prefix} | Request error: {str(e)}")
            return None
    
    def _poll_status(
        self,
        endpoint_id: str,
        job_id: str,
        log_prefix: str
    ) -> Dict[str, Any]:
        """
        Poll job status until completion or timeout.
        
        Args:
            endpoint_id: RunPod endpoint ID
            job_id: Job ID to poll
            log_prefix: Logging prefix
        
        Returns:
            Final job data
        """
        logger.info(f"{log_prefix} | Starting polling for job: {job_id}")
        start_time = time.time()
        attempts = 0
        
        while (
            time.time() - start_time < RunPodConfig.MAX_POLLING_DURATION
            and attempts < RunPodConfig.MAX_POLLING_ATTEMPTS
        ):
            time.sleep(RunPodConfig.POLLING_INTERVAL)
            attempts += 1
            
            try:
                url = f"{self.base_url}/{endpoint_id}/status/{job_id}"
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                status = data.get("status")
                logger.debug(
                    f"{log_prefix} | Poll #{attempts}/{RunPodConfig.MAX_POLLING_ATTEMPTS} | "
                    f"Status: {status}"
                )
                
                # Check for terminal status
                if status in ["COMPLETED", "FAILED", "CANCELLED"]:
                    logger.info(
                        f"{log_prefix} | Job reached terminal status: {status}"
                    )
                    return data
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    logger.error(f"{log_prefix} | Job not found (404): {job_id}")
                    return {
                        "id": job_id,
                        "status": "FAILED",
                        "output": {"status": "failed", "error": "Job not found"}
                    }
                logger.warning(f"{log_prefix} | Poll error: {str(e)}")
            except Exception as e:
                logger.warning(f"{log_prefix} | Poll error: {str(e)}")
                if attempts >= RunPodConfig.MAX_POLLING_ATTEMPTS:
                    return {
                        "id": job_id,
                        "status": "FAILED",
                        "output": {"status": "failed", "error": "Polling exhausted"}
                    }
        
        # Timeout - try to cancel the job
        logger.warning(
            f"{log_prefix} | Polling timeout after {attempts} attempts. "
            f"Attempting to cancel job."
        )
        self._cancel_job(endpoint_id, job_id, log_prefix)
        
        return {
            "id": job_id,
            "status": "FAILED",
            "output": {
                "status": "failed",
                "error": f"Polling timeout after {attempts} attempts"
            }
        }
    
    def _cancel_job(self, endpoint_id: str, job_id: str, log_prefix: str) -> None:
        """Attempt to cancel a stuck job."""
        try:
            url = f"{self.base_url}/{endpoint_id}/cancel/{job_id}"
            self.session.post(url, timeout=10)
            logger.info(f"{log_prefix} | Successfully cancelled job: {job_id}")
        except Exception as e:
            logger.warning(f"{log_prefix} | Failed to cancel job: {str(e)}")
    
    def _handle_final_status(
        self,
        data: Dict[str, Any],
        endpoint_id: str,
        request_id: Optional[str],
        duration_ms: float
    ) -> Dict[str, Any]:
        """Handle the final status and log appropriately."""
        status = data.get("status")
        log_prefix = f"[SERVERLESS] requestId={request_id or 'N/A'}"
        
        if status == "COMPLETED":
            # Check for images in both formats
            has_new_format = bool(
                data.get("output", {}).get("job_results", {}).get("images")
            )
            has_legacy_format = bool(
                data.get("output", {}).get("output", {}).get("images")
            )
            
            if has_new_format or has_legacy_format:
                logger.info(
                    f"{log_prefix} ✅ | Completed successfully | "
                    f"endpoint={endpoint_id} | duration={duration_ms:.0f}ms"
                )
            else:
                logger.warning(
                    f"{log_prefix} | Completed but no images found"
                )
        
        elif status == "FAILED":
            error = data.get("output", {}).get("error", "Unknown error")
            logger.error(
                f"{log_prefix} ❌ | Failed | endpoint={endpoint_id} | "
                f"duration={duration_ms:.0f}ms | error={error}"
            )
        
        elif status == "CANCELLED":
            logger.error(
                f"{log_prefix} ❌ | Cancelled | endpoint={endpoint_id} | "
                f"duration={duration_ms:.0f}ms"
            )
            # Treat cancelled as failed
            return {
                **data,
                "status": "FAILED",
                "output": {**data.get("output", {}), "status": "failed"}
            }
        
        else:
            logger.warning(
                f"{log_prefix} | Unknown status: {status} | duration={duration_ms:.0f}ms"
            )
        
        return data


# Convenience function
def generate_serverless_image(
    payload: Dict[str, Any],
    mode: str = "wizard",
    request_id: Optional[str] = None,
    api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate an image using RunPod serverless workers.
    
    Args:
        payload: Generation payload with workflow
        mode: Generation mode
        request_id: Optional request ID for tracking
        api_key: Optional API key override
    
    Returns:
        Response dict or None on failure
    """
    client = RunPodServerlessClient(api_key=api_key)
    return client.generate_image(payload, mode=mode, request_id=request_id)
