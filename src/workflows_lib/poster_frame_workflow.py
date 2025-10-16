"""
Poster frame workflow builder for custom actors.
Based on poster-frame.workflow.ts from the backend.
"""
import random
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Poster frame prompt template
POSTER_FRAME_PROMPT_TEMPLATE = (
    "vibrant artistic illustration of ({character_id}, {customActorDescription}) in a full body image, stylized storyboard art, direct eye contact with viewer, "
    "bright colorful palette, bold primary colors, strong highlights, artistic line work, graphic novel style, "
    "exaggerated expressions, character animation reference sheet, clean outlines, studio ghibli inspired, "
    "digital cel-shading, vivid background colors, illustration art, looking directly at camera, "
    "illustrative character design, flat color blocks with minimal gradients, high contrast, pop-art influence, "
    "animation key frame quality, bright lighting, storyboard artist masterpiece, simplified yet expressive features, "
    "square composition, centered framing, comic book cover, halftone dot texture, bold ink outlines, poster frame, "
    "(realistic body proportions++)"
)


def ensure_safetensors_name(name: Optional[str]) -> str:
    """Ensure a LoRA filename has exactly one .safetensors extension."""
    if not name:
        return "None"
    name_str = str(name)
    if not name_str or name_str == "None":
        return "None"
    return name_str if name_str.endswith(".safetensors") else f"{name_str}.safetensors"


def get_poster_frame_workflow(
    positive_prompt: str,
    width: int = 1024,
    height: int = 1024,
    steps: int = 22,
    seed: Optional[int] = None,
    sampler_name: str = "euler",
    scheduler_name: str = "simple",
    flux_guidance: float = 6.5,
    model: str = "flux1-dev-fp8",
    style_lora_name: str = "SBai_style_101",
    style_lora_strength: float = 1.0,
    character_loras: Optional[List[str]] = None,
    character_lora_strength: float = 0.7
) -> Dict[str, Any]:
    """
    Build poster frame workflow for custom actor.
    
    Args:
        positive_prompt: Text prompt for generation
        width: Image width (default: 1024)
        height: Image height (default: 1024)
        steps: Number of sampling steps (default: 22)
        seed: Random seed (None for random)
        sampler_name: Sampler name (default: euler)
        scheduler_name: Scheduler name (default: simple)
        flux_guidance: FLUX guidance value (default: 6.5)
        model: Model name (default: flux1-dev-fp8)
        style_lora_name: Style LoRA name (default: SBai_style_101)
        style_lora_strength: Style LoRA strength (default: 1.0)
        character_loras: List of character LoRA names
        character_lora_strength: Character LoRA strength (default: 0.7)
    
    Returns:
        Complete workflow dict ready for ComfyUI
    """
    # Generate random seed if not provided
    final_seed = seed if seed is not None else random.randint(0, 2**32 - 1)
    
    # Ensure character_loras is a list
    final_character_loras = character_loras if isinstance(character_loras, list) else []
    
    # Build workflow
    workflow = {
        "6": {
            "inputs": {
                "text": positive_prompt,
                "clip": ["40", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": {
                "title": "CLIP Text Encode (Positive Prompt)"
            }
        },
        "8": {
            "inputs": {
                "samples": ["13", 0],
                "vae": ["10", 0]
            },
            "class_type": "VAEDecode",
            "_meta": {
                "title": "VAE Decode"
            }
        },
        "10": {
            "inputs": {
                "vae_name": "flux-dev-vae.safetensors"
            },
            "class_type": "VAELoader",
            "_meta": {
                "title": "Load VAE"
            }
        },
        "11": {
            "inputs": {
                "clip_name1": "clip_l.safetensors",
                "clip_name2": "t5xxl_fp8.safetensors",
                "type": "flux",
                "device": "default"
            },
            "class_type": "DualCLIPLoader",
            "_meta": {
                "title": "DualCLIPLoader"
            }
        },
        "12": {
            "inputs": {
                "unet_name": f"{model}.safetensors",
                "weight_dtype": "fp8_e4m3fn"
            },
            "class_type": "UNETLoader",
            "_meta": {
                "title": "Load Diffusion Model"
            }
        },
        "13": {
            "inputs": {
                "noise": ["25", 0],
                "guider": ["22", 0],
                "sampler": ["16", 0],
                "sigmas": ["17", 0],
                "latent_image": ["27", 0]
            },
            "class_type": "SamplerCustomAdvanced",
            "_meta": {
                "title": "SamplerCustomAdvanced"
            }
        },
        "16": {
            "inputs": {
                "sampler_name": sampler_name
            },
            "class_type": "KSamplerSelect",
            "_meta": {
                "title": "KSamplerSelect"
            }
        },
        "17": {
            "inputs": {
                "scheduler": scheduler_name,
                "steps": steps,
                "denoise": 1,
                "model": ["30", 0]
            },
            "class_type": "BasicScheduler",
            "_meta": {
                "title": "BasicScheduler"
            }
        },
        "22": {
            "inputs": {
                "model": ["30", 0],
                "conditioning": ["26", 0]
            },
            "class_type": "BasicGuider",
            "_meta": {
                "title": "BasicGuider"
            }
        },
        "25": {
            "inputs": {
                "noise_seed": final_seed
            },
            "class_type": "RandomNoise",
            "_meta": {
                "title": "RandomNoise"
            }
        },
        "26": {
            "inputs": {
                "guidance": flux_guidance,
                "conditioning": ["6", 0]
            },
            "class_type": "FluxGuidance",
            "_meta": {
                "title": "FluxGuidance"
            }
        },
        "27": {
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1
            },
            "class_type": "EmptySD3LatentImage",
            "_meta": {
                "title": "EmptySD3LatentImage"
            }
        },
        "30": {
            "inputs": {
                "max_shift": 1.15,
                "base_shift": 0.5,
                "width": width,
                "height": height,
                "model": ["41", 0]
            },
            "class_type": "ModelSamplingFlux",
            "_meta": {
                "title": "ModelSamplingFlux"
            }
        },
        "38": {
            "inputs": {
                "filename_prefix": "poster_frame_output",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": {
                "title": "Save Image"
            }
        },
        "40": {
            "inputs": {
                "lora_stack": ["43", 0],
                "model": ["12", 0],
                "optional_clip": ["11", 0]
            },
            "class_type": "easy loraStackApply",
            "_meta": {
                "title": "Easy Apply LoraStack"
            }
        },
        "41": {
            "inputs": {
                "model_type": "flux",
                "rel_l1_thresh": 0.4,
                "max_skip_steps": 3,
                "model": ["40", 0]
            },
            "class_type": "TeaCache",
            "_meta": {
                "title": "TeaCache"
            }
        },
        "43": {
            "inputs": {
                "toggle": True,
                "mode": "simple",
                "num_loras": 2,  # Fixed to 2 LoRAs: style + one character
                "lora_1_name": ensure_safetensors_name(style_lora_name or "SBai_style_101"),
                "lora_1_strength": style_lora_strength,
                "lora_1_model_strength": style_lora_strength,
                "lora_1_clip_strength": style_lora_strength,
                "lora_2_name": ensure_safetensors_name(final_character_loras[0] if final_character_loras else None),
                "lora_2_strength": 1,
                "lora_2_model_strength": 1,
                "lora_2_clip_strength": 1,
                "lora_3_name": "None",
                "lora_3_strength": 1,
                "lora_3_model_strength": 1,
                "lora_3_clip_strength": 1,
                "lora_4_name": "None",
                "lora_4_strength": 1,
                "lora_4_model_strength": 1,
                "lora_4_clip_strength": 1,
                "lora_5_name": "None",
                "lora_5_strength": 1,
                "lora_5_model_strength": 1,
                "lora_5_clip_strength": 1,
                "lora_6_name": "None",
                "lora_6_strength": 1,
                "lora_6_model_strength": 1,
                "lora_6_clip_strength": 1,
                "lora_7_name": "None",
                "lora_7_strength": 1,
                "lora_7_model_strength": 1,
                "lora_7_clip_strength": 1,
                "lora_8_name": "None",
                "lora_8_strength": 1,
                "lora_8_model_strength": 1,
                "lora_8_clip_strength": 1,
                "lora_9_name": "None",
                "lora_9_strength": 1,
                "lora_9_model_strength": 1,
                "lora_9_clip_strength": 1,
                "lora_10_name": "None",
                "lora_10_strength": 1,
                "lora_10_model_strength": 1,
                "lora_10_clip_strength": 1
            },
            "class_type": "easy loraStack",
            "_meta": {
                "title": "EasyLoraStack"
            }
        }
    }
    
    logger.debug(
        f"Built poster frame workflow | size={width}x{height} | steps={steps} | "
        f"seed={final_seed} | character_loras={len(final_character_loras)}"
    )
    
    return workflow
