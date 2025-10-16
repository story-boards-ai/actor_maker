"""
Manages selection and rotation of tile descriptions to ensure variety across grids.
"""

import logging
import random
from typing import List, Set

from .tile_descriptions import TILE_DESCRIPTION_POOL, get_total_descriptions

logger = logging.getLogger(__name__)


class DescriptionSelector:
    """Manages selection and rotation of tile descriptions to ensure variety across grids."""
    
    def __init__(self):
        """Initialize the description selector."""
        self.used_description_indices: Set[int] = set()
    
    def reset_session(self) -> None:
        """Reset the used descriptions for a new training session."""
        self.used_description_indices.clear()
        logger.info(f"Reset description pool - {get_total_descriptions()} descriptions available")
    
    def select_unique_descriptions(self, count: int) -> List[str]:
        """
        Select unique descriptions from the pool, avoiding recently used ones.
        
        Args:
            count: Number of descriptions to select
            
        Returns:
            List of selected description strings
        """
        available_indices = []
        
        # First, try to use unused descriptions
        for i in range(len(TILE_DESCRIPTION_POOL)):
            if i not in self.used_description_indices:
                available_indices.append(i)
        
        # If we don't have enough unused descriptions, reset and use all
        if len(available_indices) < count:
            logger.info(f"Resetting description pool - used {len(self.used_description_indices)}/{len(TILE_DESCRIPTION_POOL)} descriptions")
            self.used_description_indices.clear()
            available_indices = list(range(len(TILE_DESCRIPTION_POOL)))
        
        # Randomly select the required number of descriptions
        selected_indices = []
        shuffled_indices = available_indices.copy()
        random.shuffle(shuffled_indices)
        
        for i in range(min(count, len(shuffled_indices))):
            selected_index = shuffled_indices[i]
            selected_indices.append(selected_index)
            self.used_description_indices.add(selected_index)
        
        # Return the selected descriptions
        return [TILE_DESCRIPTION_POOL[index] for index in selected_indices]
    
    def get_usage_stats(self) -> dict:
        """
        Get usage statistics for debugging.
        
        Returns:
            Dictionary with used, total, and available counts
        """
        return {
            "used": len(self.used_description_indices),
            "total": len(TILE_DESCRIPTION_POOL),
            "available": len(TILE_DESCRIPTION_POOL) - len(self.used_description_indices),
        }
