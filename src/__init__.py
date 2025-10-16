"""
actor_maker - RunPod image generation and LoRA training tools
"""

__version__ = "0.1.0"

# Export main modules (support both relative and absolute imports)
# Use lazy imports to avoid breaking scripts that only need utils
try:
    from .poster_frame_generator import PosterFrameGenerator, generate_poster_frame
    from .workflows_lib import (
        WorkflowBuilder,
        get_poster_frame_workflow,
        POSTER_FRAME_PROMPT_TEMPLATE
    )
except ImportError:
    # If imports fail, set to None - they can be imported directly when needed
    PosterFrameGenerator = None
    generate_poster_frame = None
    WorkflowBuilder = None
    get_poster_frame_workflow = None
    POSTER_FRAME_PROMPT_TEMPLATE = None

__all__ = [
    'PosterFrameGenerator',
    'generate_poster_frame',
    'WorkflowBuilder',
    'get_poster_frame_workflow',
    'POSTER_FRAME_PROMPT_TEMPLATE',
]
