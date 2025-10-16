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
        List of 17 training prompts (7 photorealistic + 6 B/W stylized + 4 color stylized)
    """
    
    # Base photorealistic prompts - cinematic action scenes (CANDID SHOTS ONLY - NO CAMERA CONTACT)
    base_images_prompts = [
        # Nighttime urban, character visible
        f"Candid shot: The {descriptor} runs across a rain-slick street at night, mid-stride, lit by car headlights from the side. Three-quarter back angle, eyes focused ahead on the street. Reflections on the asphalt, no other figures in frame. Character unaware of camera, looking away.",
        
        # Close-up candid portrait
        f"Candid close-up portrait of the {descriptor}'s face in natural lighting, eyes gazing off to the side, looking at something in the distance. Photorealistic, sharp focus on facial features, neutral expression, head turned away from camera. Preserve all defining details such as hairstyle, eye color, skin texture, and unique facial characteristics. No eye contact, unposed.",
        
        # Close-up, warm lighting
        f"Candid close-up of the {descriptor} looking out a rain-streaked window, eyes focused on the street below, warm interior light from the side. Three-quarter profile, gaze directed downward and away, shallow depth of field, no other figures visible. Character absorbed in thought, unaware of camera.",
        
        # Subway platform wait
        f"Candid shot: The {descriptor} stands alone on a dimly lit subway platform at night, hands in pockets, eyes looking down the tunnel into the distance. Side angle, head turned away from camera, fluorescent overhead lights casting harsh shadows. Urban grit, tiled walls, character lost in thought, no eye contact.",
        
        # Parking garage walk
        f"Candid shot: The {descriptor} walks through a concrete parking garage, lit by overhead strip lights. medium shot, eyes focused ahead on the path. Cold blue-green lighting, pillars casting long shadows. Character moving towards camera, unaware of being observed.",
        
        # Wide shot - rooftop
        f"Wide cinematic candid shot of the {descriptor} standing small on a rooftop edge at dusk, city skyline sprawling behind them. Silhouette against orange-purple sky. Character facing away, eyes scanning the cityscape below. Dramatic scale, tiny figure in vast urban landscape, completely unaware of camera.",
        
        # Alley phone call
        f"Candid shot: The {descriptor} leans against a brick wall in a narrow alley, holding a phone to their ear, head tilted down, eyes closed or looking at the ground. Side profile, single streetlight creating dramatic rim lighting. Wet pavement reflecting light, steam rising from a grate. No direct eye contact, absorbed in conversation.",
        
        # Rear-view, foggy warehouse, top-lit
        f"Candid wide handheld shot from behind shows the {descriptor} walking into a smoky, abandoned warehouse at dawn, back to camera. A harsh light overhead silhouettes the figure but keeps the outline sharp. Character facing away, eyes on the warehouse interior ahead.",
        
        # Indoor, artificial lighting, side view
        f"Candid shot: Inside a motel room in chicago, the {descriptor} kneels at a bed, stuffing gear into a half-zipped duffel bag, eyes focused on the task. Medium shot from a side angle, head turned away from camera, warm lamp light to the left, alone. Character concentrating, unaware of observation.",
        
        # Close-up, soft warm light, looking left
        f"Candid close-up of the {descriptor}'s face bathed in soft orange window light, jaw clenched, eyes looking intently off-frame to the left at something in the distance. The camera is slightly below eye level, head turned away. Preserve all defining details such as hairstyle, makeup, scars, or headgear if present. Background softly blurred, no eye contact.",
        
        # Evening, outdoor, neon glow, right profile
        f"Candid shot: The {descriptor} lights a cigarette in an alley at dusk, neon sign flickering above, eyes looking down at the lighter flame. Medium profile shot from the right, face softly illuminated, head turned away from camera, shallow depth of field. Character unaware, focused on the moment.",
        
        # Harsh top-down light, urban concrete, action
        f"Candid action shot: The {descriptor} charges up concrete stairs at midday, face angled left, eyes focused upward on the stairs ahead, caught mid-step. Low angle shot with shadows cast sharply downward. Stairway empty, character looking away from camera, absorbed in movement.",
        
        # Train interior, mixed light
        f"Candid shot: Inside a moving train, the {descriptor} stumbles slightly while walking down the aisle, grabbing a handrail, eyes looking ahead down the train car. Shot from just ahead, head turned to the side, lit by overhead fluorescents and streaking sunlight through windows. Character focused on balance, unaware of camera.",
        
        # Strong side lighting, industrial action
        f"Candid action shot: The {descriptor} kicks open a rusted metal door, caught at the moment of motion, eyes focused on the door. Shot from a diagonal angle, head turned away from camera, sharp side light casting shadows across the face and arm. Character absorbed in the action, no eye contact.",
        
        # Low light, indoor reflection suppression
        f"Candid shot: The {descriptor} hunches over a cracked bathroom sink, wiping a cut from their lip, eyes looking down at their hands. Warm tungsten lighting from the side; medium shot from behind the shoulder, head bowed. No mirror reflection visible, character focused on the task, unaware of observation.",
    ]
    
    # Black and white stylized prompts - illustration styles (CANDID POSES - NO CAMERA CONTACT)
    bw_stylized_prompts = [
        # Pen & ink — townhouse stoop
        f"A black-and-white pen and ink line drawing of the {descriptor} tying their bootlaces on a townhouse stoop under a single streetlamp in light rain, head bowed down looking at their boots. Three-quarter side view, mid shot, eyes focused on the laces. High-contrast lines with crosshatching and stippling for shading, no grayscale gradients, clean white negative space. Preserve the subject's defining features. Candid pose, character unaware, no eye contact. Illustration only, not photorealistic.",
        
        # Graphite pencil — train window
        f"A graphite pencil sketch of the {descriptor} seated by a train window at dawn, eyes gazing out at the passing landscape with a reflective expression, head turned away from viewer. Medium close-up from slightly below eye level, face in profile looking outside. Soft hatching and blending, visible pencil grain, no color. Preserve facial structure and hairstyle. Candid moment, no eye contact with viewer. Illustration, not photorealistic.",
        
        # Charcoal — warehouse door
        f"A charcoal drawing of the {descriptor} bracing a shoulder against a half-rolled warehouse door, dust in the air, eyes focused on the effort, head turned to the side. Three-quarter view, face looking away from viewer, dramatic top light, rough strokes and smudged shadows, no color. Preserve identity cues. Candid action pose, no camera awareness. Illustration, not photorealistic.",
        
        # Woodcut/linocut — alley sprint
        f"A black-and-white woodcut print style image of the {descriptor} sprinting down a narrow alley, eyes focused ahead on the path, angular highlights and carved textures. Profile mid shot, head turned away from viewer, strong diagonal composition, thick black shapes and white cuts, no halftones. Preserve recognizable features. Candid action, character looking forward. Illustration, not photorealistic.",
        
        # Monochrome vector — poster silhouette
        f"A monochrome flat vector illustration of {descriptor} in the style of a detailed hand-drawn concept sketch, with clean, confident lines, subtle hatching, and balanced proportions. Head turned to the side in profile or three-quarter view, eyes looking away from viewer. Minimal geometric shapes, hard edges, no gradients, single black ink on white background. Poster-like framing. Preserve silhouette and key features. Candid pose, no eye contact.",
        
        # Manga screentone — phone call in alley
        f"A black-and-white manga illustration of the {descriptor} making a tense phone call in an alley, eyes closed or looking down, head tilted. Half-body shot, three-quarter angle, face turned away from viewer, expressive inking with screentone patterns for shading, speed lines in background. No grayscale gradients, no color. Preserve identity. Candid moment, no camera awareness. Illustration, not photorealistic.",
    ]
    
    # Color stylized prompts - artistic illustration styles (CANDID POSES - NO CAMERA CONTACT)
    color_stylized_prompts = [
        # Comic book — rooftop gap
        f"A dynamic comic book illustration of the {descriptor} leaping a narrow rooftop gap at night with a city skyline behind, eyes focused on the landing spot ahead, head turned away from viewer. Low angle, foreshortened limbs, face in profile or three-quarter view looking at the opposite rooftop, speed lines, bold inks, cel-shaded color, limited palette with halftone dots. Preserve identity and key attributes. Candid action pose, no eye contact. Illustration style, not photorealistic.",
        
        # Flat vector — metro platform
        f"A flat vector illustration of the {descriptor} waiting on a metro platform, holding a small duffel, eyes looking left as a train approaches, head turned in profile away from viewer. Medium profile shot with long geometric shadows, face directed toward the approaching train, flat colors, simple shapes, crisp outlines, poster-like composition. Preserve recognizable features. Candid waiting pose, no camera awareness. Not photorealistic.",
        
        # Watercolor — diner window
        f"A watercolor illustration of the {descriptor} seated alone in a diner booth by a rain-streaked window at dusk, hand around a steaming mug, eyes gazing out the window at the rain. Three-quarter view, head turned away from viewer looking outside, soft backlight from the window, warm interior tones against cool exterior. Paper texture visible, gentle bleeding, hand-painted look. Preserve identity. Candid contemplative moment, no eye contact. Illustration, not photorealistic.",
        
        # Gouache — stairwell action
        f"A gouache painting of the {descriptor} ascending a concrete stairwell, caught mid-step, eyes focused upward on the stairs ahead, head angled away from viewer. Low angle, face in profile or three-quarter view looking up the stairwell, chunky brush strokes, matte opaque paint, simplified forms with saturated accents. Preserve facial features and hairstyle. Candid action moment, no camera contact. Illustration, not photorealistic.",
    ]
    
    # Use all 7 photorealistic prompts for comprehensive coverage
    photo_realistic_prompts = base_images_prompts
    
    # Final ordered set: 7 photo + 6 B/W stylized + 4 color stylized = 17 total
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
