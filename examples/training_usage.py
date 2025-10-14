"""
Example usage of LoRA training functionality.

This example demonstrates how to train custom style and actor LoRA models
using the actor_maker training module.
"""
import logging
from src.training import (
    TrainingClient,
    train_style,
    train_actor,
    LoRATrainingWorkflow,
    compute_hyperparams
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def example_train_style():
    """Example: Train a custom style LoRA."""
    logger.info("=" * 60)
    logger.info("Example: Train Custom Style LoRA")
    logger.info("=" * 60)
    
    # Training parameters
    style_id = "my-custom-style-123"
    user_id = "user-456"
    tenant_id = "tenant-789"
    
    # Training images (S3 URLs)
    image_urls = [
        "https://my-bucket.s3.us-west-1.amazonaws.com/user-456/custom-style/training_data/image1.jpg",
        "https://my-bucket.s3.us-west-1.amazonaws.com/user-456/custom-style/training_data/image2.jpg",
        "https://my-bucket.s3.us-west-1.amazonaws.com/user-456/custom-style/training_data/image3.jpg",
        # ... more images
    ]
    
    logger.info(f"Style ID: {style_id}")
    logger.info(f"Training images: {len(image_urls)}")
    
    # Method 1: Using convenience function
    result = train_style(
        style_id=style_id,
        image_urls=image_urls,
        user_id=user_id,
        tenant_id=tenant_id
    )
    
    logger.info(f"Training started: {result['status']}")
    logger.info(f"Job ID: {result['job_id']}")
    logger.info(f"RunPod Job ID: {result.get('runpod_job_id')}")
    logger.info(f"Webhook: {result.get('webhook_url')}")
    
    return result


def example_train_actor():
    """Example: Train a custom actor LoRA."""
    logger.info("=" * 60)
    logger.info("Example: Train Custom Actor LoRA")
    logger.info("=" * 60)
    
    # Training parameters
    actor_id = "my-custom-actor-abc"
    user_id = "user-456"
    tenant_id = "tenant-789"
    
    # Training images (S3 URLs)
    image_urls = [
        "https://my-bucket.s3.us-west-1.amazonaws.com/user-456/custom_actor/actor-abc/training_data/image1.jpg",
        "https://my-bucket.s3.us-west-1.amazonaws.com/user-456/custom_actor/actor-abc/training_data/image2.jpg",
        # ... more images
    ]
    
    logger.info(f"Actor ID: {actor_id}")
    logger.info(f"Training images: {len(image_urls)}")
    
    # Method 2: Using TrainingClient directly
    client = TrainingClient()
    result = client.train_actor(
        actor_id=actor_id,
        image_urls=image_urls,
        user_id=user_id,
        tenant_id=tenant_id
    )
    
    logger.info(f"Training started: {result['status']}")
    logger.info(f"Job ID: {result['job_id']}")
    
    return result


def example_custom_hyperparameters():
    """Example: Train with custom hyperparameters."""
    logger.info("=" * 60)
    logger.info("Example: Train with Custom Hyperparameters")
    logger.info("=" * 60)
    
    style_id = "custom-hp-style"
    user_id = "user-456"
    tenant_id = "tenant-789"
    image_urls = ["s3://bucket/image1.jpg", "s3://bucket/image2.jpg"]
    
    # Override learning rate and training steps
    result = train_style(
        style_id=style_id,
        image_urls=image_urls,
        user_id=user_id,
        tenant_id=tenant_id,
        learning_rate=0.0005,  # Custom learning rate
        max_train_steps=1500   # Custom training steps
    )
    
    logger.info(f"Training with custom hyperparameters started")
    logger.info(f"Job ID: {result['job_id']}")
    
    return result


def example_compute_hyperparameters():
    """Example: Compute hyperparameters without training."""
    logger.info("=" * 60)
    logger.info("Example: Compute Hyperparameters")
    logger.info("=" * 60)
    
    # Compute for style training with 15 images
    hp_style = compute_hyperparams("custom-styles", 15)
    logger.info(f"Style hyperparams (15 images):")
    logger.info(f"  Learning rate: {hp_style.learning_rate}")
    logger.info(f"  Max train steps: {hp_style.max_train_steps}")
    logger.info(f"  Loop steps: {hp_style.loop_steps}")
    logger.info(f"  LR scheduler: {hp_style.lr_scheduler}")
    
    # Compute for actor training with 8 images
    hp_actor = compute_hyperparams("custom-actors", 8)
    logger.info(f"Actor hyperparams (8 images):")
    logger.info(f"  Learning rate: {hp_actor.learning_rate}")
    logger.info(f"  Max train steps: {hp_actor.max_train_steps}")
    
    # With manual overrides
    hp_override = compute_hyperparams(
        "custom-styles",
        20,
        overrides={"learning_rate": 0.0003}
    )
    logger.info(f"Style with override (20 images):")
    logger.info(f"  Learning rate: {hp_override.learning_rate}")
    logger.info(f"  Max train steps: {hp_override.max_train_steps}")


def example_build_workflow():
    """Example: Build workflow without training."""
    logger.info("=" * 60)
    logger.info("Example: Build Training Workflow")
    logger.info("=" * 60)
    
    # Build a custom workflow
    workflow_builder = LoRATrainingWorkflow(
        class_tokens="my-style-token",
        training_type="custom-styles",
        learning_rate=0.0004,
        max_train_steps=1000,
        loop_steps=1000
    )
    
    workflow = workflow_builder.build()
    
    logger.info("Workflow built successfully")
    logger.info(f"Workflow nodes: {len(workflow)}")
    logger.info(f"Learning rate: {workflow['107']['inputs']['learning_rate']}")
    logger.info(f"Max train steps: {workflow['107']['inputs']['max_train_steps']}")
    logger.info(f"Class tokens: {workflow['109']['inputs']['class_tokens']}")
    
    return workflow


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("LoRA Training Examples")
    print("=" * 60 + "\n")
    
    try:
        # 1. Compute hyperparameters
        example_compute_hyperparameters()
        print()
        
        # 2. Build workflow
        example_build_workflow()
        print()
        
        # Note: The following examples require valid RunPod configuration
        # Uncomment to test actual training
        
        # 3. Train style
        # example_train_style()
        # print()
        
        # 4. Train actor
        # example_train_actor()
        # print()
        
        # 5. Train with custom hyperparameters
        # example_custom_hyperparameters()
        # print()
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise
    
    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60 + "\n")
