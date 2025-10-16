"""
actor_maker - RunPod image generation and LoRA training tools
"""

__version__ = "0.1.0"

# Export main modules (support both relative and absolute imports)
try:
    from .poster_frame_generator import PosterFrameGenerator, generate_poster_frame
    from .workflows_lib import (
        WorkflowBuilder,
        get_poster_frame_workflow,
        POSTER_FRAME_PROMPT_TEMPLATE
    )
except ImportError:
    from poster_frame_generator import PosterFrameGenerator, generate_poster_frame
    from workflows_lib import (
        WorkflowBuilder,
        get_poster_frame_workflow,
        POSTER_FRAME_PROMPT_TEMPLATE
    )

__all__ = [
    'PosterFrameGenerator',
    'generate_poster_frame',
    'WorkflowBuilder',
    'get_poster_frame_workflow',
    'POSTER_FRAME_PROMPT_TEMPLATE',
]
