"""
Dynamic hyperparameter computation for LoRA training.
Based on hyperparamPolicy.ts from the backend.
"""
import os
from typing import Dict, Literal, Any
from dataclasses import dataclass


@dataclass
class HyperParams:
    """Hyperparameters for LoRA training."""
    learning_rate: float
    max_train_steps: int
    loop_steps: int
    warmup_steps: int
    lr_scheduler: str


class HyperParamPolicy:
    """Compute dynamic hyperparameters based on training type and image count."""
    
    # Environment variable defaults for styles
    STYLE_LR = float(os.getenv("SB_HP_STYLE_LR", "0.0004"))
    STYLE_SPI = int(os.getenv("SB_HP_STYLE_SPI", "50"))  # Steps per image
    STYLE_MIN = int(os.getenv("SB_HP_STYLE_MIN", "500"))
    STYLE_MAX = int(os.getenv("SB_HP_STYLE_MAX", "2000"))
    
    # Environment variable defaults for actors (tiered)
    ACTOR_LR_T1 = float(os.getenv("SB_HP_ACTOR_LR_T1", "0.0004"))  # 1-10 images
    ACTOR_LR_T2 = float(os.getenv("SB_HP_ACTOR_LR_T2", "0.0003"))  # 11-20 images
    ACTOR_LR_T3 = float(os.getenv("SB_HP_ACTOR_LR_T3", "0.00025"))  # 21+ images
    ACTOR_T1_MAX = int(os.getenv("SB_HP_ACTOR_T1_MAX", "10"))
    ACTOR_T2_MAX = int(os.getenv("SB_HP_ACTOR_T2_MAX", "20"))
    ACTOR_SPI = int(os.getenv("SB_HP_ACTOR_SPI", "100"))  # Steps per image
    ACTOR_MIN = int(os.getenv("SB_HP_ACTOR_MIN", "800"))
    ACTOR_MAX = int(os.getenv("SB_HP_ACTOR_MAX", "3000"))
    
    @classmethod
    def compute_hyperparams(
        cls,
        training_type: Literal["custom-styles", "custom-actors"],
        image_count: int
    ) -> HyperParams:
        """
        Compute hyperparameters based on training type and image count.
        
        Args:
            training_type: Type of training (custom-styles or custom-actors)
            image_count: Number of training images
        
        Returns:
            HyperParams with computed values
        """
        if training_type == "custom-styles":
            return cls._compute_style_hyperparams(image_count)
        else:
            return cls._compute_actor_hyperparams(image_count)
    
    @classmethod
    def _compute_style_hyperparams(cls, image_count: int) -> HyperParams:
        """Compute hyperparameters for style training."""
        learning_rate = cls.STYLE_LR
        
        # Steps = images × steps_per_image, clamped to min/max
        raw_steps = image_count * cls.STYLE_SPI
        max_train_steps = max(cls.STYLE_MIN, min(raw_steps, cls.STYLE_MAX))
        loop_steps = max_train_steps
        
        return HyperParams(
            learning_rate=learning_rate,
            max_train_steps=max_train_steps,
            loop_steps=loop_steps,
            warmup_steps=0,
            lr_scheduler="cosine_with_restarts"
        )
    
    @classmethod
    def _compute_actor_hyperparams(cls, image_count: int) -> HyperParams:
        """Compute hyperparameters for actor training with tiered learning rates."""
        # Tiered learning rate based on image count
        if image_count <= cls.ACTOR_T1_MAX:
            learning_rate = cls.ACTOR_LR_T1
        elif image_count <= cls.ACTOR_T2_MAX:
            learning_rate = cls.ACTOR_LR_T2
        else:
            learning_rate = cls.ACTOR_LR_T3
        
        # Steps = images × steps_per_image, clamped to min/max
        raw_steps = image_count * cls.ACTOR_SPI
        max_train_steps = max(cls.ACTOR_MIN, min(raw_steps, cls.ACTOR_MAX))
        loop_steps = max_train_steps
        
        return HyperParams(
            learning_rate=learning_rate,
            max_train_steps=max_train_steps,
            loop_steps=loop_steps,
            warmup_steps=0,
            lr_scheduler="cosine_with_restarts"
        )


def compute_hyperparams(
    training_type: Literal["custom-styles", "custom-actors"],
    image_count: int,
    overrides: Dict[str, Any] = None
) -> HyperParams:
    """
    Compute hyperparameters with optional manual overrides.
    
    Args:
        training_type: Type of training
        image_count: Number of training images
        overrides: Optional dict with manual hyperparameter overrides
    
    Returns:
        HyperParams with computed or overridden values
    """
    hp = HyperParamPolicy.compute_hyperparams(training_type, image_count)
    
    # Apply manual overrides if provided
    if overrides:
        if "learning_rate" in overrides:
            hp.learning_rate = overrides["learning_rate"]
        if "max_train_steps" in overrides:
            hp.max_train_steps = overrides["max_train_steps"]
            hp.loop_steps = overrides["max_train_steps"]
        if "lr_scheduler" in overrides:
            hp.lr_scheduler = overrides["lr_scheduler"]
        if "warmup_steps" in overrides:
            hp.warmup_steps = overrides["warmup_steps"]
    
    return hp
