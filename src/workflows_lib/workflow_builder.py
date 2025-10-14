"""
Workflow builder for ComfyUI workflows.
Loads and parameterizes workflow JSON files.
"""
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class WorkflowBuilder:
    """Builds ComfyUI workflows from JSON templates."""
    
    def __init__(self, workflow_path: Optional[str] = None):
        """
        Initialize the workflow builder.
        
        Args:
            workflow_path: Path to workflow JSON file
        """
        if workflow_path is None:
            # Default to project root/workflows/normal_image_v4_workflow.json
            project_root = Path(__file__).parent.parent.parent
            workflow_path = project_root / "workflows" / "normal_image_v4_workflow.json"
        
        self.workflow_path = Path(workflow_path)
        self.template = self._load_workflow()
    
    def _load_workflow(self) -> Dict[str, Any]:
        """Load workflow template from JSON file."""
        if not self.workflow_path.exists():
            raise FileNotFoundError(f"Workflow file not found: {self.workflow_path}")
        
        try:
            with open(self.workflow_path, 'r') as f:
                data = json.load(f)
            logger.info(f"Loaded workflow template: {self.workflow_path.name}")
            return data
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse workflow JSON: {e}")
    
    def build_lora_stack(
        self,
        lora_name: Optional[str] = None,
        lora_strength: float = 1.0,
        character_loras: Optional[List[str]] = None,
        character_lora_strength: float = 0.85,
        cine_lora_strength: float = 0.0
    ) -> Dict[str, Any]:
        """
        Build LoRA stack configuration.
        
        Args:
            lora_name: Style LoRA name
            lora_strength: Style LoRA strength
            character_loras: List of character LoRA names
            character_lora_strength: Character LoRA strength
            cine_lora_strength: Cinematic LoRA strength
        
        Returns:
            LoRA stack configuration dict
        """
        FILM_LORA_NAME = "FILM-V3-FLUX"
        MAX_LORA_SLOTS = 10
        
        lora_entries = []
        
        # Add style LoRA first (if exists)
        if lora_name:
            lora_filename = lora_name if lora_name.endswith('.safetensors') else f"{lora_name}.safetensors"
            lora_entries.append({
                "name": lora_filename,
                "strength": lora_strength,
                "model_strength": lora_strength,
                "clip_strength": lora_strength
            })
        
        # Add character LoRAs
        if character_loras:
            num_chars = len(character_loras)
            # Apply multipliers based on number of characters
            if num_chars == 1:
                multiplier = 0.85
            elif num_chars == 2:
                multiplier = 0.75
            else:
                multiplier = 0.65
            
            for char_lora in character_loras:
                if char_lora and char_lora != "None":
                    char_filename = char_lora if char_lora.endswith('.safetensors') else f"{char_lora}.safetensors"
                    strength = character_lora_strength * multiplier
                    lora_entries.append({
                        "name": char_filename,
                        "strength": strength,
                        "model_strength": strength,
                        "clip_strength": strength
                    })
        
        # Add Film LoRA if requested
        if cine_lora_strength > 0:
            num_chars = len(character_loras) if character_loras else 0
            # Apply multipliers
            if num_chars == 0:
                cine_multiplier = 1.0
            elif num_chars == 1:
                cine_multiplier = 0.95
            elif num_chars == 2:
                cine_multiplier = 0.85
            else:
                cine_multiplier = 0.75
            
            film_strength = cine_lora_strength * cine_multiplier
            lora_entries.append({
                "name": f"{FILM_LORA_NAME}.safetensors",
                "strength": film_strength,
                "model_strength": film_strength,
                "clip_strength": film_strength
            })
        
        # Build stack config
        num_loras = max(1, len(lora_entries))
        stack_config = {
            "toggle": True,
            "mode": "simple",
            "num_loras": min(MAX_LORA_SLOTS, num_loras)
        }
        
        # Add slots
        for i in range(MAX_LORA_SLOTS):
            slot_index = i + 1
            if i < len(lora_entries):
                entry = lora_entries[i]
            else:
                entry = {
                    "name": "None",
                    "strength": 1,
                    "model_strength": 1,
                    "clip_strength": 1
                }
            
            stack_config[f"lora_{slot_index}_name"] = entry["name"]
            stack_config[f"lora_{slot_index}_strength"] = entry["strength"]
            stack_config[f"lora_{slot_index}_model_strength"] = entry["model_strength"]
            stack_config[f"lora_{slot_index}_clip_strength"] = entry["clip_strength"]
        
        return stack_config
    
    def build_workflow(
        self,
        positive_prompt: str,
        width: int = 1360,
        height: int = 768,
        steps: int = 20,
        seed: int = -1,
        model: str = "flux1-dev-fp8",
        sampler_name: str = "euler",
        scheduler_name: str = "simple",
        flux_guidance: float = 3.5,
        batch_size: int = 1,
        lora_name: Optional[str] = None,
        lora_strength: float = 1.0,
        character_loras: Optional[List[str]] = None,
        character_lora_strength: float = 0.85,
        cine_lora_strength: float = 0.0
    ) -> Dict[str, Any]:
        """
        Build a complete workflow with parameters.
        
        Args:
            positive_prompt: Text prompt for generation
            width: Image width (default: 1360)
            height: Image height (default: 768)
            steps: Number of sampling steps (default: 20)
            seed: Random seed (-1 for random)
            model: Model name (default: flux1-dev-fp8)
            sampler_name: Sampler name (default: euler)
            scheduler_name: Scheduler name (default: simple)
            flux_guidance: FLUX guidance value (default: 3.5)
            batch_size: Number of images to generate (default: 1)
            lora_name: Style LoRA name
            lora_strength: Style LoRA strength
            character_loras: List of character LoRA names
            character_lora_strength: Character LoRA strength
            cine_lora_strength: Cinematic LoRA strength
        
        Returns:
            Complete workflow dict ready for ComfyUI
        """
        import random
        
        # Generate seed if needed
        if seed == -1:
            seed = random.randint(0, 999999999)
        
        # Get base workflow
        workflow = self.template.get("workflow", {}).copy()
        
        # Build LoRA stack
        lora_stack = self.build_lora_stack(
            lora_name=lora_name,
            lora_strength=lora_strength,
            character_loras=character_loras,
            character_lora_strength=character_lora_strength,
            cine_lora_strength=cine_lora_strength
        )
        
        # Update workflow parameters
        model_filename = model if model.endswith('.safetensors') else f"{model}.safetensors"
        
        workflow["1"]["inputs"]["unet_name"] = model_filename
        workflow["6"]["inputs"]["text"] = positive_prompt
        workflow["16"]["inputs"]["sampler_name"] = sampler_name
        workflow["17"]["inputs"]["scheduler"] = scheduler_name
        workflow["17"]["inputs"]["steps"] = steps
        workflow["25"]["inputs"]["noise_seed"] = seed
        workflow["26"]["inputs"]["guidance"] = flux_guidance
        workflow["27"]["inputs"]["width"] = width
        workflow["27"]["inputs"]["height"] = height
        workflow["27"]["inputs"]["batch_size"] = batch_size
        workflow["30"]["inputs"]["width"] = width
        workflow["30"]["inputs"]["height"] = height
        
        # Update LoRA stack
        workflow["43"]["inputs"] = lora_stack
        
        logger.debug(
            f"Built workflow | prompt_len={len(positive_prompt)} | "
            f"size={width}x{height} | steps={steps} | seed={seed} | "
            f"loras={lora_stack['num_loras']}"
        )
        
        return workflow
