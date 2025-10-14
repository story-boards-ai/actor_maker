"""
ComfyUI workflow builder for LoRA training.
Based on lora-training-workflow-headless.ts from the backend.
"""
import json
from typing import Optional, Dict, Any, Literal
from pathlib import Path


class LoRATrainingWorkflow:
    """Builder for Flux LoRA training workflows."""
    
    def __init__(
        self,
        class_tokens: str,
        training_type: Literal["custom-styles", "custom-actors"] = "custom-styles",
        learning_rate: Optional[float] = None,
        max_train_steps: Optional[int] = None,
        loop_steps: Optional[int] = None,
        warmup_steps: Optional[int] = None,
        lr_scheduler: Literal["cosine_with_restarts", "cosine", "linear"] = "cosine_with_restarts"
    ):
        """
        Initialize workflow builder.
        
        Args:
            class_tokens: UUID of the custom style or actor
            training_type: Type of training (custom-styles or custom-actors)
            learning_rate: Learning rate (default: 0.001)
            max_train_steps: Maximum training steps (default: 1000)
            loop_steps: Loop steps (defaults to max_train_steps)
            warmup_steps: Warmup steps (default: 0)
            lr_scheduler: Learning rate scheduler type
        """
        self.class_tokens = class_tokens
        self.training_type = training_type
        self.learning_rate = learning_rate or 0.001
        self.max_train_steps = max_train_steps or 1000
        self.loop_steps = loop_steps or self.max_train_steps
        self.warmup_steps = warmup_steps or 0
        self.lr_scheduler = lr_scheduler
    
    def build(self) -> Dict[str, Any]:
        """
        Build the complete workflow dictionary.
        
        Returns:
            Workflow dictionary ready for RunPod submission
        """
        return {
            "2": {
                "inputs": {
                    "transformer": "flux1-dev-fp8.safetensors",
                    "vae": "ae.safetensors",
                    "clip_l": "clip_l.safetensors",
                    "t5": "t5xxl_fp8.safetensors"
                },
                "class_type": "FluxTrainModelSelect",
                "_meta": {"title": "FluxTrain ModelSelect"}
            },
            "4": {
                "inputs": {
                    "steps": self.loop_steps,
                    "network_trainer": ["107", 0]
                },
                "class_type": "FluxTrainLoop",
                "_meta": {"title": "Flux Train Loop"}
            },
            "14": {
                "inputs": {
                    "save_state": False,
                    "copy_to_comfy_lora_folder": False,
                    "network_trainer": ["4", 0]
                },
                "class_type": "FluxTrainSave",
                "_meta": {"title": "Flux Train Save LoRA"}
            },
            "37": {
                "inputs": {
                    "steps": 2,
                    "width": 1024,
                    "height": 1024,
                    "guidance_scale": 3,
                    "seed": 42,
                    "shift": True,
                    "base_shift": 0.5,
                    "max_shift": 1.15
                },
                "class_type": "FluxTrainValidationSettings",
                "_meta": {"title": "Flux Train Validation Settings"}
            },
            "88": {
                "inputs": {
                    "output": "",
                    "source": ["107", 1]
                },
                "class_type": "Display Any (rgthree)",
                "_meta": {"title": "Number of epochs"}
            },
            "95": {
                "inputs": {
                    "optimizer_type": "adamw8bit",
                    "max_grad_norm": 1,
                    "lr_scheduler": self.lr_scheduler,
                    "lr_warmup_steps": self.warmup_steps,
                    "lr_scheduler_num_cycles": 3,
                    "lr_scheduler_power": 1,
                    "min_snr_gamma": 5,
                    "extra_optimizer_args": ""
                },
                "class_type": "OptimizerConfig",
                "_meta": {"title": "Optimizer Config"}
            },
            "97": {
                "inputs": {
                    "plot_style": "seaborn-v0_8-dark-palette",
                    "window_size": 100,
                    "normalize_y": True,
                    "width": 768,
                    "height": 512,
                    "log_scale": False,
                    "network_trainer": ["4", 0]
                },
                "class_type": "VisualizeLoss",
                "_meta": {"title": "Visualize Loss"}
            },
            "98": {
                "inputs": {
                    "filename_prefix": "flux_lora_loss_plot",
                    "images": ["97", 0]
                },
                "class_type": "SaveImage",
                "_meta": {"title": "Save Image"}
            },
            "105": {
                "inputs": {
                    "output": "",
                    "source": ["107", 2]
                },
                "class_type": "Display Any (rgthree)",
                "_meta": {"title": "Display Any (rgthree)"}
            },
            "107": {
                "inputs": {
                    "output_name": "flux_lora_file_name",
                    "output_dir": "/model_output",
                    "network_dim": 16,
                    "network_alpha": 16,
                    "learning_rate": self.learning_rate,
                    "max_train_steps": self.max_train_steps,
                    "apply_t5_attn_mask": True,
                    "cache_latents": "memory",
                    "cache_text_encoder_outputs": "memory",
                    "blocks_to_swap": 0,
                    "weighting_scheme": "logit_normal",
                    "logit_mean": 0,
                    "logit_std": 1,
                    "mode_scale": 1.29,
                    "timestep_sampling": "shift",
                    "sigmoid_scale": 1,
                    "model_prediction_type": "raw",
                    "guidance_scale": 1,
                    "discrete_flow_shift": 3.1582,
                    "highvram": True,
                    "fp8_base": True,
                    "gradient_dtype": "bf16",
                    "save_dtype": "bf16",
                    "attention_mode": "sdpa",
                    "sample_prompts": ["146", 0],
                    "additional_args": "",
                    "train_text_encoder": "disabled",
                    "clip_l_lr": 0,
                    "T5_lr": 0,
                    "gradient_checkpointing": "enabled",
                    "flux_models": ["2", 0],
                    "dataset": ["109", 0],
                    "optimizer_settings": ["95", 0]
                },
                "class_type": "InitFluxLoRATraining",
                "_meta": {"title": "Init Flux LoRA Training"}
            },
            "108": {
                "inputs": {
                    "color_aug": False,
                    "flip_aug": False,
                    "shuffle_caption": False,
                    "caption_dropout_rate": 0,
                    "alpha_mask": False,
                    "reset_on_queue": False,
                    "caption_extension": ".txt"
                },
                "class_type": "TrainDatasetGeneralConfig",
                "_meta": {"title": "TrainDatasetGeneralConfig"}
            },
            "109": {
                "inputs": {
                    "width": 512,
                    "height": 512,
                    "batch_size": 2,
                    "dataset_path": "/training_data",
                    "class_tokens": self.class_tokens,
                    "enable_bucket": True,
                    "bucket_no_upscale": False,
                    "num_repeats": 10,
                    "min_bucket_reso": 256,
                    "max_bucket_reso": 1024,
                    "dataset_config": ["108", 0]
                },
                "class_type": "TrainDatasetAdd",
                "_meta": {"title": "Train 512x512 Dataset"}
            },
            "133": {
                "inputs": {
                    "save_state": False,
                    "network_trainer": ["14", 0]
                },
                "class_type": "FluxTrainEnd",
                "_meta": {"title": "Flux LoRA Train End"}
            },
            "146": {
                "inputs": {
                    "string": (
                        "portrait of a young woman|"
                        "a young woman with long red hair walking in New York at night|"
                        "a young woman with long red hair and bright blue eyes wearing a colorful bikini on a tropical beach|"
                        "photo portrait of a young woman with long red hair, wearing a leather jacket and bluejeans in New York at sunset"
                    ),
                    "strip_newlines": True
                },
                "class_type": "StringConstantMultiline",
                "_meta": {"title": "Prompts for Validation"}
            }
        }
    
    @classmethod
    def from_template(cls, template_path: str, **kwargs) -> 'LoRATrainingWorkflow':
        """
        Load workflow from JSON template and override parameters.
        
        Args:
            template_path: Path to workflow JSON template
            **kwargs: Parameters to override
        
        Returns:
            Workflow builder instance
        """
        with open(template_path, 'r') as f:
            template = json.load(f)
        
        # Extract parameters from template if available
        class_tokens = kwargs.get('class_tokens', template.get('109', {}).get('inputs', {}).get('class_tokens', 'STYLE_TOKEN'))
        
        return cls(class_tokens=class_tokens, **kwargs)


def load_workflow_template(name: str = "lora_training_workflow_headless") -> Dict[str, Any]:
    """
    Load a workflow template from the workflows directory.
    
    Args:
        name: Template name (without .json extension)
    
    Returns:
        Workflow dictionary
    """
    workflows_dir = Path(__file__).parent.parent.parent / "workflows"
    template_path = workflows_dir / f"{name}.json"
    
    with open(template_path, 'r') as f:
        return json.load(f)
