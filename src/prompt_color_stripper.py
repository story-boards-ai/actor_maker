"""
Helper module to strip color-related terms from prompts.
Used for black and white image generation to ensure no color terms remain.
"""

import re
from typing import List, Set

# Comprehensive list of color terms to remove
COLOR_TERMS: Set[str] = {
    # Basic colors
    "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown",
    "black", "white", "gray", "grey", "violet", "indigo", "cyan", "magenta",
    "turquoise", "teal", "navy", "maroon", "crimson", "scarlet", "burgundy",
    
    # Color variations
    "golden", "silver", "bronze", "copper", "brass", "gold", "rose",
    "amber", "jade", "emerald", "ruby", "sapphire", "pearl", "ivory",
    "cream", "beige", "tan", "khaki", "olive", "lime", "mint",
    
    # Color descriptors
    "bright", "dark", "light", "pale", "deep", "vivid", "rich", "muted",
    "saturated", "vibrant", "dull", "faded", "warm", "cool", "hot", "cold",
    
    # Color-related adjectives
    "colorful", "colourful", "multicolored", "multicoloured", "rainbow",
    "monochrome", "sepia", "colored", "coloured", "tinted", "hued",
    
    # Specific shades
    "azure", "cobalt", "cerulean", "ultramarine", "prussian blue",
    "crimson", "vermillion", "carmine", "cherry", "blood red",
    "forest green", "sea green", "lime green", "olive green",
    "lemon", "canary", "mustard", "ochre", "rust", "terracotta",
    "lavender", "lilac", "mauve", "plum", "orchid", "fuchsia",
    "coral", "salmon", "peach", "apricot", "tangerine",
    "charcoal", "slate", "ash", "smoke", "steel",
    "snow", "alabaster", "chalk", "milk", "vanilla",
    
    # Color + noun combinations (will be caught by word boundaries)
    "orange-purple", "blue-green", "red-orange", "yellow-green",
    
    # Color intensity
    "neon", "pastel", "fluorescent", "iridescent", "metallic",
    "glossy", "matte", "shiny", "lustrous", "gleaming",
}

# Additional color patterns (e.g., "reddish", "bluish", "greenish")
COLOR_SUFFIXES = ["ish", "y", "ed"]

# Color-related phrases to remove (more specific patterns)
COLOR_PHRASES = [
    r"color palette",
    r"colour palette",
    r"vibrant.*?color",
    r"vibrant.*?colour",
    r"street art color",
    r"street art colour",
    r"warm.*?light",
    r"cool.*?light",
    r"golden.*?light",
    r"orange.*?light",
    r"blue.*?light",
    r"red.*?light",
    r"green.*?light",
    r"purple.*?light",
    r"warm.*?tone",
    r"cool.*?tone",
    r"warm.*?glow",
    r"orange.*?glow",
    r"red.*?glow",
    r"blue.*?glow",
    r"forge glow",  # Keep this - it's about light intensity, not color
]


def generate_color_pattern() -> re.Pattern:
    """
    Generate a comprehensive regex pattern to match all color terms.
    Uses word boundaries to avoid matching parts of non-color words.
    """
    # Build list of all color terms including variations
    all_terms = set(COLOR_TERMS)
    
    # Add variations with suffixes
    for color in list(COLOR_TERMS):
        for suffix in COLOR_SUFFIXES:
            all_terms.add(f"{color}{suffix}")
    
    # Sort by length (longest first) to match longer phrases first
    sorted_terms = sorted(all_terms, key=len, reverse=True)
    
    # Escape special regex characters and join with OR
    escaped_terms = [re.escape(term) for term in sorted_terms]
    pattern = r'\b(' + '|'.join(escaped_terms) + r')\b'
    
    return re.compile(pattern, re.IGNORECASE)


# Pre-compile the pattern for performance
_COLOR_PATTERN = generate_color_pattern()


def strip_color_terms(prompt: str, preserve_bw_terms: bool = True) -> str:
    """
    Remove all color-related terms from a prompt.
    
    Args:
        prompt: The original prompt text
        preserve_bw_terms: If True, preserve "black", "white", "gray/grey" in B&W contexts
        
    Returns:
        Prompt with all color terms removed and cleaned up
        
    Examples:
        >>> strip_color_terms("A red car on a blue street")
        "A car on a street"
        
        >>> strip_color_terms("vibrant orange sunset with golden light")
        "sunset with light"
    """
    result = prompt
    
    # Protect B&W terminology if requested
    bw_placeholders = {}
    if preserve_bw_terms:
        # Protect common B&W phrases
        bw_phrases = [
            r"black-and-white",
            r"black and white",
            r"rich blacks",
            r"deep blacks",
            r"pure blacks",
            r"white cuts",
            r"white negative space",
            r"white background",
            r"grey tones",
            r"gray tones",
            r"greyscale",
            r"grayscale",
        ]
        for i, phrase in enumerate(bw_phrases):
            placeholder = f"__BW_TERM_{i}__"
            # Find and replace with placeholder
            matches = re.finditer(phrase, result, re.IGNORECASE)
            for match in matches:
                bw_placeholders[placeholder] = match.group(0)
                result = result.replace(match.group(0), placeholder, 1)
    
    # First, remove color phrases (more specific patterns)
    for phrase_pattern in COLOR_PHRASES:
        # Skip "forge glow" - it's about intensity, not color
        if "forge glow" in phrase_pattern:
            continue
        result = re.sub(phrase_pattern, "", result, flags=re.IGNORECASE)
    
    # Then remove individual color terms
    result = _COLOR_PATTERN.sub("", result)
    
    # Restore B&W terminology
    for placeholder, original in bw_placeholders.items():
        result = result.replace(placeholder, original)
    
    # Clean up multiple spaces
    result = re.sub(r'\s+', ' ', result)
    
    # Clean up spaces before punctuation
    result = re.sub(r'\s+([.,;:!?])', r'\1', result)
    
    # Clean up multiple commas or spaces after removing words
    result = re.sub(r',\s*,', ',', result)
    result = re.sub(r'\s*,\s*', ', ', result)
    
    # Remove leading/trailing commas and spaces
    result = re.sub(r'^[,\s]+|[,\s]+$', '', result)
    
    # Fix cases where we have "a  " or "the  " with double spaces
    result = re.sub(r'\b(a|an|the)\s+,', '', result)
    
    return result.strip()


def is_bw_prompt(prompt: str) -> bool:
    """
    Check if a prompt is for black and white / monochrome image generation.
    
    Args:
        prompt: The prompt text to check
        
    Returns:
        True if the prompt appears to be for B&W generation
    """
    bw_indicators = [
        "black-and-white",
        "black and white",
        "monochrome",
        "grayscale",
        "greyscale",
        "pen and ink",
        "graphite",
        "charcoal",
        "woodcut",
        "linocut",
        "etching",
        "conte crayon",
        "ink wash",
        "scratchboard",
    ]
    
    prompt_lower = prompt.lower()
    return any(indicator in prompt_lower for indicator in bw_indicators)


def process_prompt_for_bw(prompt: str) -> str:
    """
    Process a prompt for black and white generation.
    Only strips colors if the prompt is actually for B&W.
    
    Args:
        prompt: The original prompt
        
    Returns:
        Processed prompt (stripped if B&W, unchanged otherwise)
    """
    if is_bw_prompt(prompt):
        return strip_color_terms(prompt)
    return prompt


if __name__ == "__main__":
    # Test cases
    test_prompts = [
        "A red car on a blue street with golden light",
        "Cinematic scene with warm orange sunset and purple sky",
        "Black-and-white pen and ink drawing with vibrant colors",
        "Charcoal drawing with rich blacks and bright highlights",
        "A woman in a crimson dress under azure sky",
        "Graphite sketch with soft grey tones and deep shadows",
    ]
    
    print("Testing color term stripper:")
    print("="*60)
    for prompt in test_prompts:
        is_bw = is_bw_prompt(prompt)
        stripped = strip_color_terms(prompt)
        print(f"\nOriginal: {prompt}")
        print(f"Is B&W: {is_bw}")
        print(f"Stripped: {stripped}")
