"""
RunPod configuration and environment variables.
Matches the environment variable names used in the backend.
"""
import os
from typing import Optional


class RunPodConfig:
    """Configuration for RunPod API access."""
    
    # RunPod API Key (required)
    RUNPOD_API_KEY: str = os.getenv("RUNPOD_API_KEY", "")
    
    # Spot pod configuration
    SB_SPOT_API_KEY: Optional[str] = os.getenv("SB_SPOT_API_KEY")
    SB_SPOT_NAME: str = os.getenv("SB_SPOT_NAME", "sb_spot")
    
    # Serverless endpoint IDs
    RUNPOD_SERVER_100_ID: Optional[str] = os.getenv("RUNPOD_SERVER_100_ID")
    RUNPOD_SERVER_150_ID: Optional[str] = os.getenv("RUNPOD_SERVER_150_ID")
    RUNPOD_SERVER_POSTER_ID: Optional[str] = os.getenv("RUNPOD_SERVER_POSTER_ID")
    RUNPOD_SERVER_SCHNELL_ID: Optional[str] = os.getenv("RUNPOD_SERVER_SCHNELL_ID")
    
    # Timeout configurations (in seconds)
    POD_TIMEOUT: int = int(os.getenv("POD_TIMEOUT", "600"))  # 10 minutes
    SYNC_TIMEOUT: int = int(os.getenv("SYNC_TIMEOUT", "700"))  # ~12 minutes
    
    # Polling configurations for serverless
    POLLING_INTERVAL: float = float(os.getenv("POLLING_INTERVAL", "1.0"))  # 1 second
    MAX_POLLING_DURATION: int = int(os.getenv("MAX_POLLING_DURATION", "180"))  # 3 minutes
    MAX_POLLING_ATTEMPTS: int = int(os.getenv("MAX_POLLING_ATTEMPTS", "120"))
    
    @classmethod
    def validate(cls) -> None:
        """Validate that required configuration is present."""
        if not cls.RUNPOD_API_KEY:
            raise ValueError("RUNPOD_API_KEY environment variable is required")
    
    @classmethod
    def get_serverless_endpoint(cls, mode: str = "wizard") -> Optional[str]:
        """
        Get the appropriate serverless endpoint ID based on mode.
        
        Args:
            mode: Generation mode ('wizard', 'new_pre', 'posterFrameRegeneration')
        
        Returns:
            Endpoint ID or None if not configured
        """
        if mode == "new_pre" or mode == "NEW_PRE":
            return cls.RUNPOD_SERVER_SCHNELL_ID or cls.RUNPOD_SERVER_150_ID
        elif mode == "posterFrameRegeneration":
            return cls.RUNPOD_SERVER_POSTER_ID or cls.RUNPOD_SERVER_150_ID
        elif mode == "wizard":
            return cls.RUNPOD_SERVER_100_ID
        else:
            return cls.RUNPOD_SERVER_150_ID
