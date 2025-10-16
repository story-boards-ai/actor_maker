"""
Actor-specific training prompts for generating diverse training data.
These prompts are designed for character/actor LoRA training with cinematic scenes.
"""

from typing import List


def get_actor_training_prompts(descriptor: str) -> List[str]:
    """
    Get all training prompts for an actor.
    
    Args:
        descriptor: Character descriptor (e.g., "man", "woman", "creature", "robotic character")
        
    Returns:
        List of 16 training prompts (6 photorealistic + 6 B/W stylized + 4 color stylized)
    """
    
    # Base photorealistic prompts - cinematic action scenes
    base_images_prompts = [
        # Nighttime urban, character visible
        f"The {descriptor} runs across a rain-slick street at night, mid-stride, lit by car headlights from the side. Three-quarter back angle. Reflections on the asphalt, no other figures in frame.",
        
        # Close-up, warm lighting
        f"Close-up of the {descriptor} looking out a rain-streaked window, warm interior light from the side. Three-quarter profile, shallow depth of field, no other figures visible.",
        
        # Subway platform wait
        f"The {descriptor} stands alone on a dimly lit subway platform at night, hands in pockets, looking down the tunnel. Side angle, fluorescent overhead lights casting harsh shadows. Urban grit, tiled walls, no eye contact with camera.",
        
        # Parking garage walk
        f"The {descriptor} walks through a concrete parking garage, footsteps echoing, lit by overhead strip lights. Back three-quarter view, medium shot. Cold blue-green lighting, pillars casting long shadows. Character moving away from camera.",
        
        # Wide shot - rooftop
        f"Wide cinematic shot of the {descriptor} standing small on a rooftop edge at dusk, city skyline sprawling behind them. Silhouette against orange-purple sky. Character facing away, looking at the cityscape. Dramatic scale, tiny figure in vast urban landscape.",
        
        # Alley phone call
        f"The {descriptor} leans against a brick wall in a narrow alley, holding a phone to their ear, head tilted down. Side profile, single streetlight creating dramatic rim lighting. Wet pavement reflecting light, steam rising from a grate. No direct eye contact.",
        
        # Rear-view, foggy warehouse, top-lit
        f"A wide handheld shot from behind shows the {descriptor} walking into a smoky, abandoned warehouse at dawn. A harsh light overhead silhouettes the figure but keeps the outline sharp — the only rear-facing image.",
        
        # Indoor, artificial lighting, side view
        f"Inside a motel room in chicago, the {descriptor} kneels at a bed, stuffing gear into a half-zipped duffel bag. Medium shot from a side angle, warm lamp light to the left, alone.",
        
        # Close-up, soft warm light, looking left
        f"A close-up of the {descriptor}'s face bathed in soft orange window light, jaw clenched, looking intently off-frame to the left. The camera is slightly below eye level. Preserve all defining details such as hairstyle, makeup, scars, or headgear if present. Background softly blurred.",
        
        # Evening, outdoor, neon glow, right profile
        f"The {descriptor} lights a cigarette in an alley at dusk, neon sign flickering above. Medium profile shot from the right, face softly illuminated, shallow depth of field.",
        
        # Harsh top-down light, urban concrete, action
        f"The {descriptor} charges up concrete stairs at midday, face angled left, caught mid-step. Low angle shot with shadows cast sharply downward. Stairway empty.",
        
        # Train interior, mixed light
        f"Inside a moving train, the {descriptor} stumbles slightly while walking down the aisle, grabbing a handrail. Shot from just ahead, lit by overhead fluorescents and streaking sunlight through windows.",
        
        # Strong side lighting, industrial action
        f"The {descriptor} kicks open a rusted metal door, caught at the moment of motion. Shot from a diagonal angle with sharp side light casting shadows across the face and arm.",
        
        # Low light, indoor reflection suppression
        f"The {descriptor} hunches over a cracked bathroom sink, wiping a cut from their lip. Warm tungsten lighting from the side; medium shot from behind the shoulder. No mirror reflection visible.",
    ]
    
    # Black and white stylized prompts - illustration styles
    bw_stylized_prompts = [
        # Pen & ink — townhouse stoop
        f"A black-and-white pen and ink line drawing of the {descriptor} tying their bootlaces on a townhouse stoop under a single streetlamp in light rain. Three-quarter side view, mid shot. High-contrast lines with crosshatching and stippling for shading, no grayscale gradients, clean white negative space. Preserve the subject's defining features. Illustration only, not photorealistic.",
        
        # Graphite pencil — train window
        f"A graphite pencil sketch of the {descriptor} seated by a train window at dawn, looking out with a reflective expression. Medium close-up from slightly below eye level. Soft hatching and blending, visible pencil grain, no color. Preserve facial structure and hairstyle. Illustration, not photorealistic.",
        
        # Charcoal — warehouse door
        f"A charcoal drawing of the {descriptor} bracing a shoulder against a half-rolled warehouse door, dust in the air. Three-quarter view, dramatic top light, rough strokes and smudged shadows, no color. Preserve identity cues. Illustration, not photorealistic.",
        
        # Woodcut/linocut — alley sprint
        f"A black-and-white woodcut print style image of the {descriptor} sprinting down a narrow alley, angular highlights and carved textures. Profile mid shot, strong diagonal composition, thick black shapes and white cuts, no halftones. Preserve recognizable features. Illustration, not photorealistic.",
        
        # Monochrome vector — poster silhouette
        f"A monochrome flat vector illustration of {descriptor} in the style of a detailed hand-drawn concept sketch, with clean, confident lines, subtle hatching, and balanced proportions. Minimal geometric shapes, hard edges, no gradients, single black ink on white background. Poster-like framing. Preserve silhouette and key features.",
        
        # Manga screentone — phone call in alley
        f"A black-and-white manga illustration of the {descriptor} making a tense phone call in an alley. Half-body shot, three-quarter angle, expressive inking with screentone patterns for shading, speed lines in background. No grayscale gradients, no color. Preserve identity. Illustration, not photorealistic.",
    ]
    
    # Color stylized prompts - artistic illustration styles
    color_stylized_prompts = [
        # Comic book — rooftop gap
        f"A dynamic comic book illustration of the {descriptor} leaping a narrow rooftop gap at night with a city skyline behind. Low angle, foreshortened limbs, speed lines, bold inks, cel-shaded color, limited palette with halftone dots. Preserve identity and key attributes. Illustration style, not photorealistic.",
        
        # Flat vector — metro platform
        f"A flat vector illustration of the {descriptor} waiting on a metro platform, holding a small duffel, looking left as a train approaches. Medium profile shot with long geometric shadows, flat colors, simple shapes, crisp outlines, poster-like composition. Preserve recognizable features. Not photorealistic.",
        
        # Watercolor — diner window
        f"A watercolor illustration of the {descriptor} seated alone in a diner booth by a rain-streaked window at dusk, hand around a steaming mug. Three-quarter view, soft backlight from the window, warm interior tones against cool exterior. Paper texture visible, gentle bleeding, hand-painted look. Preserve identity. Illustration, not photorealistic.",
        
        # Gouache — stairwell action
        f"A gouache painting of the {descriptor} ascending a concrete stairwell, caught mid-step. Low angle, chunky brush strokes, matte opaque paint, simplified forms with saturated accents. Preserve facial features and hairstyle. Illustration, not photorealistic.",
    ]
    
    # Use all 6 photorealistic prompts for comprehensive coverage
    photo_realistic_prompts = base_images_prompts
    
    # Final ordered set: 6 photo + 6 B/W stylized + 4 color stylized = 16 total
    all_training_prompts = [
        *photo_realistic_prompts,
        *bw_stylized_prompts,
        *color_stylized_prompts
    ]
    
    return all_training_prompts


def get_actor_descriptor(actor_type: str, actor_sex: str = None) -> str:
    """
    Get the descriptor string for an actor based on type and sex.
    
    Args:
        actor_type: Type of actor ("human", "creature", "robotic", "anthropomorphic", "mythical")
        actor_sex: Sex of actor ("male", "female", or None)
        
    Returns:
        Descriptor string to use in prompts
    """
    sex_word = "person"
    if actor_sex == "male":
        sex_word = "man"
    elif actor_sex == "female":
        sex_word = "woman"
    
    if actor_type == "human":
        return sex_word
    elif actor_type == "creature":
        return "creature"
    elif actor_type == "robotic":
        return "robotic character"
    elif actor_type == "anthropomorphic":
        return "anthropomorphic character"
    elif actor_type == "mythical":
        return "mythical character"
    else:
        return "character"
