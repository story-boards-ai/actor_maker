"""
Tile descriptions pool for actor training data generation.
Organized by category to ensure diverse subject matter across grids.
"""

TILE_DESCRIPTION_POOL = [
    # People & Portraits (9 options)
    "a portrait of a person in this artistic style",
    "a group of people in this artistic style",
    "a child or young person in this artistic style",
    "an elderly person in this artistic style",
    "a person in traditional clothing in this artistic style",
    "a person at work or in profession in this artistic style",
    "a person in motion or dancing in this artistic style",
    "a close-up of hands or facial features in this artistic style",
    "a silhouette or shadow of a person in this artistic style",
    
    # Nature & Landscapes (9 options)
    "a landscape or outdoor scene in this artistic style",
    "a forest or woodland scene in this artistic style",
    "a mountain or hill landscape in this artistic style",
    "a beach or coastal scene in this artistic style",
    "a desert or arid landscape in this artistic style",
    "a garden or park scene in this artistic style",
    "a sunrise or sunset scene in this artistic style",
    "a weather phenomenon (rain, snow, storm) in this artistic style",
    "a seasonal scene (spring, summer, autumn, winter) in this artistic style",
    
    # Objects & Still Life (9 options)
    "a close-up of an object in this artistic style",
    "food or still life in this artistic style",
    "books or reading materials in this artistic style",
    "musical instruments in this artistic style",
    "tools or equipment in this artistic style",
    "jewelry or decorative items in this artistic style",
    "flowers or plants in this artistic style",
    "vintage or antique objects in this artistic style",
    "everyday household items in this artistic style",
    
    # Architecture & Structures (9 options)
    "an architectural structure in this artistic style",
    "a historic building or monument in this artistic style",
    "a modern building or skyscraper in this artistic style",
    "a bridge or infrastructure in this artistic style",
    "a church or religious building in this artistic style",
    "a house or residential building in this artistic style",
    "an interior or indoor scene in this artistic style",
    "a doorway or entrance in this artistic style",
    "architectural details (windows, stairs, columns) in this artistic style",
    
    # Animals & Creatures (9 options)
    "an animal or creature in this artistic style",
    "a domestic pet (cat, dog) in this artistic style",
    "a wild animal in natural habitat in this artistic style",
    "a bird in flight or perched in this artistic style",
    "a marine animal or sea creature in this artistic style",
    "an insect or small creature in this artistic style",
    "a farm animal in this artistic style",
    "an exotic or tropical animal in this artistic style",
    "animal tracks or signs in nature in this artistic style",
    
    # Transportation & Vehicles (9 options)
    "a vehicle or transportation in this artistic style",
    "a vintage or classic car in this artistic style",
    "a bicycle or motorcycle in this artistic style",
    "a boat or watercraft in this artistic style",
    "an airplane or aircraft in this artistic style",
    "a train or railway scene in this artistic style",
    "public transportation (bus, tram) in this artistic style",
    "a street or road scene with vehicles in this artistic style",
    "transportation infrastructure (station, airport) in this artistic style",
    
    # Abstract & Artistic (9 options)
    "an abstract or artistic composition in this style",
    "geometric patterns or shapes in this artistic style",
    "textures and materials close-up in this artistic style",
    "light and shadow play in this artistic style",
    "color gradients or blends in this artistic style",
    "reflections or mirror effects in this artistic style",
    "minimalist composition in this artistic style",
    "surreal or dreamlike imagery in this artistic style",
    "artistic interpretation of emotions or concepts in this style",
]


def get_total_descriptions() -> int:
    """Get the total number of available descriptions."""
    return len(TILE_DESCRIPTION_POOL)


def get_description_categories() -> dict:
    """Get descriptions organized by category for debugging/logging."""
    return {
        "People & Portraits": TILE_DESCRIPTION_POOL[0:9],
        "Nature & Landscapes": TILE_DESCRIPTION_POOL[9:18],
        "Objects & Still Life": TILE_DESCRIPTION_POOL[18:27],
        "Architecture & Structures": TILE_DESCRIPTION_POOL[27:36],
        "Animals & Creatures": TILE_DESCRIPTION_POOL[36:45],
        "Transportation & Vehicles": TILE_DESCRIPTION_POOL[45:54],
        "Abstract & Artistic": TILE_DESCRIPTION_POOL[54:63],
    }
