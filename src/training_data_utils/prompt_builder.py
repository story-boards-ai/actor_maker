"""
Utility for building tile generation prompts for actor training data generation.
"""

from typing import List


def build_tile_generation_prompt(descriptions: List[str]) -> str:
    """
    Build a 3x3 grid generation prompt with the provided tile descriptions.
    
    Args:
        descriptions: List of 9 descriptions for the 3x3 grid
        
    Returns:
        Formatted prompt string for grid generation
        
    Raises:
        ValueError: If descriptions list doesn't contain exactly 9 items
    """
    if len(descriptions) != 9:
        raise ValueError(f"Expected 9 descriptions for 3x3 grid, got {len(descriptions)}")
    
    prompt = f"""Create a 3x3 grid of individual single images in the exact artistic style of the provided source image. Each tile should depict completely different subjects arranged in a 3x3 grid format:

Top row (left to right): {descriptions[0]}, {descriptions[1]}, {descriptions[2]}
Middle row (left to right): {descriptions[3]}, {descriptions[4]}, {descriptions[5]}  
Bottom row (left to right): {descriptions[6]}, {descriptions[7]}, {descriptions[8]}

Each image should maintain the artistic style, color palette, visual characteristics, and aesthetic of the source image while showing completely unique subject matter. Make sure each tile is clearly distinct and separated in the 3x3 grid layout."""
    
    return prompt


def build_uniqueness_analysis_prompt() -> str:
    """
    Build GPT Vision analysis prompt for identifying unique tiles.
    
    Returns:
        Formatted prompt string for GPT Vision analysis
    """
    prompt = """Analyze this 3x3 grid image. The tiles are numbered 1-9 where:
1=top-left, 2=top-center, 3=top-right
4=middle-left, 5=middle-center, 6=middle-right  
7=bottom-left, 8=bottom-center, 9=bottom-right

Return the tile numbers that are absolutely unique with no repetitions, same subjects, or elements that would be bad for LoRA training (like duplicate people, identical objects, or very similar compositions). Only return tiles that show completely different subject matter.

Return as JSON: {"unique_tiles": [1,3,5,7,9]}"""
    
    return prompt
