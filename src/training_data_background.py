"""
Background wrapper for training data generation.
Allows both actor and style training data generation to run in the background.
"""

import sys
import logging
from pathlib import Path
from typing import Optional

from .background_runner import BackgroundRunner
from .actor_training_data_generator import ActorTrainingDataGenerator
from .training_data_generator import TrainingDataGenerator

logger = logging.getLogger(__name__)


class BackgroundTrainingDataGenerator:
    """Wrapper to run training data generators in the background."""
    
    @staticmethod
    def generate_actor_training_data(
        portrait_url: str,
        user_id: str,
        actor_id: str,
        actor_type: str = "human",
        actor_sex: Optional[str] = None,
        portrait_buffer: Optional[bytes] = None,
        run_in_background: bool = True
    ) -> dict:
        """
        Generate actor training data with optional background execution.
        
        Args:
            portrait_url: URL of the portrait image
            user_id: User ID for S3 uploads
            actor_id: Actor ID for organizing files
            actor_type: Type of actor
            actor_sex: Sex of actor
            portrait_buffer: Optional pre-loaded portrait buffer
            run_in_background: If True, runs in background with status tracking
            
        Returns:
            Result dictionary with training_image_urls
        """
        if not run_in_background:
            # Run synchronously
            generator = ActorTrainingDataGenerator(
                debug_dir=f"debug/actor_training_data/{actor_id}"
            )
            return generator.generate_training_data(
                portrait_url=portrait_url,
                user_id=user_id,
                actor_id=actor_id,
                actor_type=actor_type,
                actor_sex=actor_sex,
                portrait_buffer=portrait_buffer
            )
        
        # Run in background
        task_name = f"actor_training_{actor_id}"
        runner = BackgroundRunner(task_name)
        
        logger.info(f"Starting background actor training data generation: {actor_id}")
        
        def task():
            generator = ActorTrainingDataGenerator(
                debug_dir=f"debug/actor_training_data/{actor_id}"
            )
            
            runner.update_progress(10, "Initialized generator")
            
            result = generator.generate_training_data(
                portrait_url=portrait_url,
                user_id=user_id,
                actor_id=actor_id,
                actor_type=actor_type,
                actor_sex=actor_sex,
                portrait_buffer=portrait_buffer
            )
            
            runner.update_progress(100, "Training data generation complete")
            return result
        
        return runner.run(task)
    
    @staticmethod
    def generate_style_training_data(
        source_image_url: str,
        user_id: str,
        style_id: str,
        run_in_background: bool = True
    ) -> dict:
        """
        Generate style training data with optional background execution.
        
        Args:
            source_image_url: URL of the source image
            user_id: User ID for S3 uploads
            style_id: Style ID for organizing files
            run_in_background: If True, runs in background with status tracking
            
        Returns:
            Result dictionary with training_image_urls
        """
        if not run_in_background:
            # Run synchronously
            generator = TrainingDataGenerator(
                debug_dir=f"debug/style_training_data/{style_id}"
            )
            return generator.generate_training_data(
                source_image_url=source_image_url,
                user_id=user_id,
                actor_id=style_id  # Using actor_id parameter for style_id
            )
        
        # Run in background
        task_name = f"style_training_{style_id}"
        runner = BackgroundRunner(task_name)
        
        logger.info(f"Starting background style training data generation: {style_id}")
        
        def task():
            generator = TrainingDataGenerator(
                debug_dir=f"debug/style_training_data/{style_id}"
            )
            
            runner.update_progress(10, "Initialized generator")
            
            result = generator.generate_training_data(
                source_image_url=source_image_url,
                user_id=user_id,
                actor_id=style_id
            )
            
            runner.update_progress(100, "Training data generation complete")
            return result
        
        return runner.run(task)
    
    @staticmethod
    def get_status(task_id: str, task_type: str = "actor") -> Optional[dict]:
        """
        Get status of a background training data generation task.
        
        Args:
            task_id: Actor ID or Style ID
            task_type: "actor" or "style"
            
        Returns:
            Status dictionary or None
        """
        task_name = f"{task_type}_training_{task_id}"
        return BackgroundRunner.get_status(task_name)
    
    @staticmethod
    def is_running(task_id: str, task_type: str = "actor") -> bool:
        """
        Check if a training data generation task is running.
        
        Args:
            task_id: Actor ID or Style ID
            task_type: "actor" or "style"
            
        Returns:
            True if running, False otherwise
        """
        task_name = f"{task_type}_training_{task_id}"
        return BackgroundRunner.is_running(task_name)
