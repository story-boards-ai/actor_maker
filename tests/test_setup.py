"""
Test script to validate RunPod configuration and connectivity.
Run this to ensure your environment is set up correctly.
"""
import os
import sys
import logging

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.runpod import RunPodConfig, RunPodPodClient, RunPodServerlessClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def check_env_vars():
    """Check if required environment variables are set."""
    logger.info("=== Checking Environment Variables ===")
    
    issues = []
    
    # Required
    if not RunPodConfig.RUNPOD_API_KEY:
        issues.append("❌ RUNPOD_API_KEY is not set (REQUIRED)")
    else:
        logger.info("✅ RUNPOD_API_KEY is set")
    
    # Optional - Pod
    if RunPodConfig.SB_SPOT_API_KEY:
        logger.info("✅ SB_SPOT_API_KEY is set")
    else:
        logger.info("⚠️  SB_SPOT_API_KEY is not set (optional)")
    
    # Optional - Serverless endpoints
    endpoints_set = []
    if RunPodConfig.RUNPOD_SERVER_100_ID:
        endpoints_set.append("RUNPOD_SERVER_100_ID")
    if RunPodConfig.RUNPOD_SERVER_150_ID:
        endpoints_set.append("RUNPOD_SERVER_150_ID")
    if RunPodConfig.RUNPOD_SERVER_SCHNELL_ID:
        endpoints_set.append("RUNPOD_SERVER_SCHNELL_ID")
    if RunPodConfig.RUNPOD_SERVER_POSTER_ID:
        endpoints_set.append("RUNPOD_SERVER_POSTER_ID")
    
    if endpoints_set:
        logger.info(f"✅ Serverless endpoints set: {', '.join(endpoints_set)}")
    else:
        issues.append("⚠️  No serverless endpoint IDs set (optional but needed for serverless)")
    
    # Timeout configs
    logger.info(f"✅ POD_TIMEOUT: {RunPodConfig.POD_TIMEOUT}s")
    logger.info(f"✅ SYNC_TIMEOUT: {RunPodConfig.SYNC_TIMEOUT}s")
    logger.info(f"✅ POLLING_INTERVAL: {RunPodConfig.POLLING_INTERVAL}s")
    logger.info(f"✅ MAX_POLLING_DURATION: {RunPodConfig.MAX_POLLING_DURATION}s")
    logger.info(f"✅ MAX_POLLING_ATTEMPTS: {RunPodConfig.MAX_POLLING_ATTEMPTS}")
    
    return issues


def test_pod_connection(endpoint: str):
    """Test connection to a pod endpoint."""
    logger.info(f"\n=== Testing Pod Connection: {endpoint} ===")
    
    try:
        client = RunPodPodClient(endpoint=endpoint)
        is_ready = client.check_ready()
        
        if is_ready:
            logger.info(f"✅ Pod is ready and responding at {endpoint}")
            return True
        else:
            logger.warning(f"⚠️  Pod is not ready at {endpoint}")
            return False
    except Exception as e:
        logger.error(f"❌ Error connecting to pod: {str(e)}")
        return False


def test_serverless_setup():
    """Test serverless client setup."""
    logger.info("\n=== Testing Serverless Setup ===")
    
    try:
        client = RunPodServerlessClient()
        logger.info("✅ Serverless client initialized successfully")
        
        # Test endpoint resolution
        for mode in ["wizard", "new_pre", "posterFrameRegeneration"]:
            endpoint = RunPodConfig.get_serverless_endpoint(mode)
            if endpoint:
                logger.info(f"✅ Mode '{mode}' → endpoint: {endpoint}")
            else:
                logger.warning(f"⚠️  No endpoint configured for mode '{mode}'")
        
        return True
    except Exception as e:
        logger.error(f"❌ Error initializing serverless client: {str(e)}")
        return False


def main():
    """Run all tests."""
    logger.info("╔" + "═" * 58 + "╗")
    logger.info("║" + " " * 10 + "RunPod Configuration Test" + " " * 23 + "║")
    logger.info("╚" + "═" * 58 + "╝\n")
    
    # Check environment variables
    issues = check_env_vars()
    
    # Test serverless setup
    serverless_ok = test_serverless_setup()
    
    # Test pod connection if endpoint provided
    pod_endpoint = os.getenv("POD_ENDPOINT")
    pod_ok = None
    if pod_endpoint:
        pod_ok = test_pod_connection(pod_endpoint)
    else:
        logger.info("\n⚠️  POD_ENDPOINT not set, skipping pod connectivity test")
        logger.info("   To test pod connection, run:")
        logger.info("   POD_ENDPOINT=https://xxx-8000.proxy.runpod.net python test_setup.py")
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    
    if issues:
        logger.info("\n⚠️  Issues found:")
        for issue in issues:
            logger.info(f"  {issue}")
    else:
        logger.info("\n✅ All required configuration looks good!")
    
    logger.info("\n📋 Setup Status:")
    logger.info(f"  Serverless client: {'✅ Ready' if serverless_ok else '❌ Not ready'}")
    if pod_ok is not None:
        logger.info(f"  Pod connection: {'✅ Ready' if pod_ok else '❌ Not ready'}")
    else:
        logger.info(f"  Pod connection: ⏭️  Not tested")
    
    logger.info("\n💡 Next steps:")
    logger.info("  1. Review any issues or warnings above")
    logger.info("  2. Copy .env.example to .env and configure")
    logger.info("  3. Run: python example_usage.py")
    logger.info("  4. Check the README.md for detailed usage instructions")
    
    # Return exit code
    if not RunPodConfig.RUNPOD_API_KEY:
        logger.error("\n❌ CRITICAL: RUNPOD_API_KEY must be set")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
