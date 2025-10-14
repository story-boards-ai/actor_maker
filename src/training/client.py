"""
LoRA training client for RunPod serverless.
Based on runpodServerlessTrainingRequest.ts from the backend.
"""
import os
import time
import logging
import requests
from typing import Dict, Any, Optional, List, Literal
from urllib.parse import urljoin

from .workflow import LoRATrainingWorkflow
from .hyperparams import compute_hyperparams

logger = logging.getLogger(__name__)


class TrainingClient:
    """Client for LoRA model training via RunPod serverless."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        endpoint_id: Optional[str] = None,
        webhook_url: Optional[str] = None
    ):
        """
        Initialize training client.
        
        Args:
            api_key: RunPod API key (uses MODEL_TRAINING_RUNPOD_API_KEY or RUNPOD_API_KEY env var)
            endpoint_id: RunPod serverless endpoint ID (uses MODEL_TRAINING_RUNPOD_ENDPOINT_ID env var)
            webhook_url: Webhook URL for completion callback
        """
        self.api_key = api_key or os.getenv("MODEL_TRAINING_RUNPOD_API_KEY") or os.getenv("RUNPOD_API_KEY")
        if not self.api_key:
            raise ValueError("RunPod API key is required")
        
        self.endpoint_id = endpoint_id or os.getenv("MODEL_TRAINING_RUNPOD_ENDPOINT_ID")
        if not self.endpoint_id:
            raise ValueError("MODEL_TRAINING_RUNPOD_ENDPOINT_ID environment variable is required")
        
        # Set webhook URL
        webhook_base = os.getenv("GATEWAY_BASE_URL") or os.getenv("BASE_URL") or "localhost:9001"
        if not webhook_base.startswith("http"):
            protocol = "https" if os.getenv("NODE_ENV") == "production" else "http"
            webhook_base = f"{protocol}://{webhook_base}"
        self.webhook_url = webhook_url or f"{webhook_base}/core/training-webhooks/runpod-serverless"
        
        self.base_url = "https://api.runpod.ai/v2"
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        })
    
    def train_style(
        self,
        style_id: str,
        image_urls: List[str],
        user_id: str,
        tenant_id: str,
        learning_rate: Optional[float] = None,
        max_train_steps: Optional[int] = None,
        webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Train a custom style LoRA model.
        
        Args:
            style_id: Unique identifier for the style
            image_urls: List of S3 URLs for training images
            user_id: User ID for tracking
            tenant_id: Tenant ID for multi-tenancy
            learning_rate: Optional override for learning rate
            max_train_steps: Optional override for training steps
            webhook_url: Optional override for webhook URL
        
        Returns:
            Response dict with job_id and status
        """
        return self._train(
            training_type="custom-styles",
            model_id=style_id,
            image_urls=image_urls,
            user_id=user_id,
            tenant_id=tenant_id,
            model_name=f"style_{style_id}",
            learning_rate=learning_rate,
            max_train_steps=max_train_steps,
            webhook_url=webhook_url
        )
    
    def train_actor(
        self,
        actor_id: str,
        image_urls: List[str],
        user_id: str,
        tenant_id: str,
        learning_rate: Optional[float] = None,
        max_train_steps: Optional[int] = None,
        webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Train a custom actor LoRA model.
        
        Args:
            actor_id: Unique identifier for the actor
            image_urls: List of S3 URLs for training images
            user_id: User ID for tracking
            tenant_id: Tenant ID for multi-tenancy
            learning_rate: Optional override for learning rate
            max_train_steps: Optional override for training steps
            webhook_url: Optional override for webhook URL
        
        Returns:
            Response dict with job_id and status
        """
        return self._train(
            training_type="custom-actors",
            model_id=actor_id,
            image_urls=image_urls,
            user_id=user_id,
            tenant_id=tenant_id,
            model_name=f"actor_{actor_id}",
            learning_rate=learning_rate,
            max_train_steps=max_train_steps,
            webhook_url=webhook_url
        )
    
    def _train(
        self,
        training_type: Literal["custom-styles", "custom-actors"],
        model_id: str,
        image_urls: List[str],
        user_id: str,
        tenant_id: str,
        model_name: str,
        learning_rate: Optional[float] = None,
        max_train_steps: Optional[int] = None,
        webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Internal method to train a LoRA model.
        
        Args:
            training_type: Type of training (custom-styles or custom-actors)
            model_id: Unique identifier for the model
            image_urls: List of S3 URLs for training images
            user_id: User ID for tracking
            tenant_id: Tenant ID for multi-tenancy
            model_name: Name for the output model
            learning_rate: Optional override for learning rate
            max_train_steps: Optional override for training steps
            webhook_url: Optional override for webhook URL
        
        Returns:
            Response dict with job_id and status
        """
        # Convert HTTPS S3 URLs to s3:// format
        s3_urls = self._convert_to_s3_urls(image_urls)
        image_count = len(s3_urls)
        
        # Compute dynamic hyperparameters
        overrides = {}
        if learning_rate is not None:
            overrides["learning_rate"] = learning_rate
        if max_train_steps is not None:
            overrides["max_train_steps"] = max_train_steps
        
        hp = compute_hyperparams(training_type, image_count, overrides)
        
        logger.info(
            f"[Hyperparams] type={training_type} images={image_count} "
            f"lr={hp.learning_rate} steps={hp.max_train_steps}"
        )
        
        # Build workflow
        workflow = LoRATrainingWorkflow(
            class_tokens=model_id,
            training_type=training_type,
            learning_rate=hp.learning_rate,
            max_train_steps=hp.max_train_steps,
            loop_steps=hp.loop_steps,
            warmup_steps=hp.warmup_steps,
            lr_scheduler=hp.lr_scheduler
        ).build()
        
        # Generate job ID
        job_id = f"{training_type}_{model_name}_{int(time.time())}"
        request_id = f"req_{model_id}_{int(time.time())}"
        
        # Prepare request payload
        payload = {
            "input": {
                "workflow": workflow,
                "training_data": {
                    "s3_urls": s3_urls
                },
                "training_config": {
                    "mode": training_type,
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "request_id": request_id,
                    "model_name": model_name,
                    "job_id": job_id,
                    "learning_rate": hp.learning_rate,
                    "max_train_steps": hp.max_train_steps
                }
            },
            "webhook": webhook_url or self.webhook_url
        }
        
        logger.info(f"[Training] Starting serverless training | job_id={job_id} | endpoint={self.endpoint_id}")
        logger.info(f"[Training] Webhook: {payload['webhook']}")
        
        try:
            # Send async request using /run endpoint for webhook-based training
            url = f"{self.base_url}/{self.endpoint_id}/run"
            response = self.session.post(url, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"[Training] Initial response status: {data.get('status')} (runpod_job_id: {data.get('id')})")
            
            # Return formatted response
            return {
                "status": "started",
                "job_id": job_id,
                "runpod_job_id": data.get("id"),
                "user_id": user_id,
                "tenant_id": tenant_id,
                "training_type": training_type,
                "model_name": model_name,
                "message": "Training started, completion will be notified via webhook",
                "webhook_url": payload["webhook"]
            }
            
        except requests.exceptions.Timeout:
            logger.error(f"[Training] Request timeout after 30s")
            return {
                "status": "failed",
                "job_id": job_id,
                "error": "Training request timeout"
            }
        except Exception as e:
            logger.error(f"[Training] Request error: {str(e)}")
            return {
                "status": "failed",
                "job_id": job_id,
                "error": str(e)
            }
    
    def _convert_to_s3_urls(self, image_urls: List[str]) -> List[str]:
        """
        Convert HTTPS S3 URLs to s3:// format.
        
        Args:
            image_urls: List of HTTPS S3 URLs
        
        Returns:
            List of s3:// formatted URLs
        """
        s3_urls = []
        for url in image_urls:
            if url.startswith("https://") and ".s3." in url and "amazonaws.com" in url:
                # Extract bucket and key from S3 URL
                # Format: https://bucket-name.s3.region.amazonaws.com/key/path
                import re
                match = re.match(r'https://([^.]+)\.s3\.[^.]+\.amazonaws\.com/(.+)', url)
                if match:
                    bucket = match.group(1)
                    key = match.group(2)
                    s3_url = f"s3://{bucket}/{key}"
                    s3_urls.append(s3_url)
                else:
                    s3_urls.append(url)
            else:
                s3_urls.append(url)
        
        logger.debug(f"[Training] Converted {len(image_urls)} URLs to S3 format")
        return s3_urls


# Convenience functions
def train_style(
    style_id: str,
    image_urls: List[str],
    user_id: str,
    tenant_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Train a custom style LoRA model.
    
    Args:
        style_id: Unique identifier for the style
        image_urls: List of S3 URLs for training images
        user_id: User ID for tracking
        tenant_id: Tenant ID for multi-tenancy
        **kwargs: Additional arguments passed to TrainingClient
    
    Returns:
        Response dict with job_id and status
    """
    client = TrainingClient()
    return client.train_style(style_id, image_urls, user_id, tenant_id, **kwargs)


def train_actor(
    actor_id: str,
    image_urls: List[str],
    user_id: str,
    tenant_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Train a custom actor LoRA model.
    
    Args:
        actor_id: Unique identifier for the actor
        image_urls: List of S3 URLs for training images
        user_id: User ID for tracking
        tenant_id: Tenant ID for multi-tenancy
        **kwargs: Additional arguments passed to TrainingClient
    
    Returns:
        Response dict with job_id and status
    """
    client = TrainingClient()
    return client.train_actor(actor_id, image_urls, user_id, tenant_id, **kwargs)
