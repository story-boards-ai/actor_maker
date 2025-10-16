"""
ComfyUI workflow management and utilities.

This module contains:
- Workflow loading and validation
- Workflow templating
- Node manipulation
- Workflow composition
"""
from .workflow_builder import WorkflowBuilder
from .poster_frame_workflow import (
    get_poster_frame_workflow,
    POSTER_FRAME_PROMPT_TEMPLATE
)

__all__ = [
    'WorkflowBuilder',
    'get_poster_frame_workflow',
    'POSTER_FRAME_PROMPT_TEMPLATE'
]
