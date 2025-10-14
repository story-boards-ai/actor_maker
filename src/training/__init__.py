"""
Training module for LoRA model training.

This module contains:
- Training workflow generation
- Training configuration and hyperparameters
- Training execution via RunPod serverless
- Dynamic hyperparameter computation
"""

from .client import TrainingClient, train_style, train_actor
from .workflow import LoRATrainingWorkflow, load_workflow_template
from .hyperparams import (
    HyperParamPolicy,
    HyperParams,
    compute_hyperparams
)

__all__ = [
    # Client
    'TrainingClient',
    'train_style',
    'train_actor',
    
    # Workflow
    'LoRATrainingWorkflow',
    'load_workflow_template',
    
    # Hyperparameters
    'HyperParamPolicy',
    'HyperParams',
    'compute_hyperparams',
]
