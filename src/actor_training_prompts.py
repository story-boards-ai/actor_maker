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
        List of 25 training prompts (15 photorealistic + 6 B/W stylized + 4 color stylized)
        Photorealistic: Mix of urban (6), nature (3), water (3), outdoor (3) with varied lighting
    """
    
    # Base photorealistic prompts - cinematic action scenes (CANDID SHOTS ONLY - NO CAMERA CONTACT)
    # Mix of urban, nature, water, and outdoor environments with varied lighting
    base_images_prompts = [
        # URBAN - Nighttime
        f"Candid shot: The {descriptor} runs across a rain-slick street at night, mid-stride, lit by car headlights from the side. Three-quarter back angle, eyes focused ahead on the street. Reflections on the asphalt, no other figures in frame. Character unaware of camera, looking away.",
        
        # NATURE - Forest daytime
        f"Candid shot: The {descriptor} walks through a misty forest at dawn, sunlight filtering through tall pine trees, eyes focused on the forest path ahead. Medium shot from behind, head turned slightly to the side, soft morning light creating long shadows. Character moving deeper into the woods, unaware of camera.",
        
        # WATER - Beach golden hour
        f"Candid shot: The {descriptor} stands at the edge of a rocky beach at golden hour, waves crashing nearby, eyes gazing out at the ocean horizon. Side profile, warm orange sunset light illuminating the face, hair moving in the wind. Character lost in thought, completely unaware of observation.",
        
        # URBAN - Close-up candid portrait
        f"Candid close-up portrait of the {descriptor}'s face in natural lighting, eyes gazing off to the side, looking at something in the distance. Photorealistic, sharp focus on facial features, neutral expression, head turned away from camera. Preserve all defining details such as hairstyle, eye color, skin texture, and unique facial characteristics. No eye contact, unposed.",
        
        # NATURE - Mountain daytime
        f"Candid shot: The {descriptor} climbs a rocky mountain trail at midday, hands gripping stone, eyes focused upward on the path ahead. Low angle shot, bright sunlight creating harsh shadows, blue sky above. Character mid-climb, absorbed in the effort, looking away from camera.",
        
        # WATER - Lake evening
        f"Candid shot: The {descriptor} sits on a weathered wooden dock at dusk, feet dangling over calm lake water, eyes watching ripples spread across the surface. Back three-quarter view, soft purple-blue twilight, silhouette against the water. Character in quiet contemplation, unaware of camera.",
        
        # URBAN - Close-up, warm lighting
        f"Candid close-up of the {descriptor} looking out a rain-streaked window, eyes focused on the street below, warm interior light from the side. Three-quarter profile, gaze directed downward and away, shallow depth of field, no other figures visible. Character absorbed in thought, unaware of camera.",
        
        # OUTDOOR - Field daytime
        f"Candid shot: The {descriptor} walks through a tall grass field at noon, wind blowing the grass in waves, eyes scanning the horizon ahead. Wide shot from behind, bright daylight, character small in the vast landscape. Head turned away, moving forward, completely unaware of observation.",
        
        # URBAN - Subway platform night
        f"Candid shot: The {descriptor} stands alone on a dimly lit subway platform at night, hands in pockets, eyes looking down the tunnel into the distance. Side angle, head turned away from camera, fluorescent overhead lights casting harsh shadows. Urban grit, tiled walls, character lost in thought, no eye contact.",
        
        # NATURE - Forest stream
        f"Candid shot: The {descriptor} crouches by a forest stream, hands cupped in the water, eyes focused on the flowing current. Side angle, dappled sunlight through trees, green foliage surrounding. Character absorbed in the moment, head bowed, unaware of camera.",
        
        # URBAN - Parking garage
        f"Candid shot: The {descriptor} walks through a concrete parking garage, lit by overhead strip lights. medium shot, eyes focused ahead on the path. Cold blue-green lighting, pillars casting long shadows. Character moving towards camera, unaware of being observed.",
        
        # OUTDOOR - Desert/canyon sunset
        f"Candid shot: The {descriptor} stands at the edge of a desert canyon at sunset, red rock formations in the background, eyes looking down into the canyon depths. Profile shot, warm golden-red light, dramatic landscape. Character silhouetted against the sky, facing away, completely unaware of camera.",
        
        # URBAN - Wide shot rooftop
        f"Wide cinematic candid shot of the {descriptor} standing small on a rooftop edge at dusk, city skyline sprawling behind them. Silhouette against orange-purple sky. Character facing away, eyes scanning the cityscape below. Dramatic scale, tiny figure in vast urban landscape, completely unaware of camera.",
        
        # WATER - Rain/storm
        f"Candid shot: The {descriptor} walks along a rain-soaked pier during a storm, hood up, eyes focused on the wooden planks ahead. Medium shot from behind, dark gray sky, waves crashing against the pier supports. Character hunched against the wind, moving forward, unaware of observation.",
        
        # URBAN - Alley phone call
        f"Candid shot: The {descriptor} leans against a brick wall in a narrow alley, holding a phone to their ear, head tilted down, eyes closed or looking at the ground. Side profile, single streetlight creating dramatic rim lighting. Wet pavement reflecting light, steam rising from a grate. No direct eye contact, absorbed in conversation.",
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
        
        # Ink wash — market crowd
        f"A black-and-white ink wash drawing of the {descriptor} pushing through a crowded marketplace, arm extended forward parting the crowd, eyes focused downward on the path ahead. Wide shot from chest height, frontal three-quarter angle, face visible but looking down and to the side, loose gestural brushwork with varying ink densities, atmospheric crowd silhouettes in background. Preserve facial features. Candid action, no eye contact. Illustration, not photorealistic.",
        
        # Scratchboard — climbing action
        f"A black-and-white scratchboard illustration of the {descriptor} scaling a rocky cliff face, both hands gripping stone above, eyes focused upward on the next handhold. Medium frontal shot from below, face angled up and away from viewer, white lines scratched from black surface, dramatic contrast with fine detail work. Preserve identity. Candid climbing action, no camera awareness. Illustration, not photorealistic.",
        
        # Linocut — rain crossing
        f"A black-and-white linocut print of the {descriptor} running across a rain-soaked plaza, coat billowing, eyes squinting against the downpour looking ahead. Full body frontal shot from ground level, face visible but turned slightly down shielding from rain, bold carved shapes, strong vertical rain lines, high contrast black and white. Preserve recognizable features. Candid action in weather, no eye contact. Illustration, not photorealistic.",
        
        # Etching — workshop scene
        f"A black-and-white etching of the {descriptor} hammering metal at an anvil in a workshop, sparks flying, eyes focused intently on the workpiece below. Medium frontal shot from slightly above, face lit by forge glow looking down at work, fine cross-hatched lines, rich blacks in shadows, detailed linework. Preserve facial structure. Candid crafting action, no camera awareness. Illustration, not photorealistic.",
        
        # Conte crayon — subway rush
        f"A black-and-white conte crayon drawing of the {descriptor} rushing down subway stairs, hand on railing, eyes looking down at steps ahead. Frontal diagonal shot from platform level, face visible but angled downward in motion, soft smudged blacks with sharp highlights, textured paper grain visible, dynamic diagonal composition. Preserve identity cues. Candid hurried movement, no eye contact. Illustration, not photorealistic.",
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
        
        # Acrylic — street performance
        f"A vibrant acrylic painting of the {descriptor} juggling flaming torches in a street performance, eyes tracking the arc of flames above, face tilted upward. Medium frontal shot from audience perspective, face visible but looking up at the torches, bold brushwork, rich saturated colors with orange flame glow, energetic paint application. Preserve identity. Candid performance action, no eye contact. Illustration, not photorealistic.",
        
        # Digital painting — motorcycle repair
        f"A digital painting of the {descriptor} crouched beside a vintage motorcycle in a desert garage, wrench in hand, eyes focused on engine parts below. Wide frontal shot from standing height, face angled down examining the work, warm afternoon light, painterly digital brushstrokes, dusty oranges and teals, detailed mechanical elements. Preserve facial features. Candid repair work, no camera awareness. Illustration, not photorealistic.",
        
        # Oil painting — greenhouse botanist
        f"An impressionistic oil painting of the {descriptor} examining exotic plants in a humid greenhouse, holding a specimen jar up to diffused light, eyes studying the contents. Close frontal shot from chest level, face turned slightly up toward the jar, loose expressive brushwork, lush greens with warm golden light, visible paint texture. Preserve recognizable features. Candid scientific observation, no eye contact. Illustration, not photorealistic.",
        
        # Pastel — beach cleanup
        f"A soft pastel illustration of the {descriptor} bending to collect debris on a windswept beach at sunset, hair blowing, eyes focused on the sand ahead. Full body frontal shot from low angle, face angled downward searching the beach, blended pastel colors, warm sunset palette with cool shadows, atmospheric coastal scene. Preserve identity cues. Candid environmental action, no camera awareness. Illustration, not photorealistic.",
        
        # Mixed media collage — urban parkour
        f"A mixed media collage illustration of the {descriptor} vaulting over a concrete barrier in an urban plaza, mid-leap with arms extended, eyes locked on the landing zone ahead. Dynamic frontal shot from ground level, face visible but focused downward on landing spot, layered textures combining paint and paper elements, bold graphic shapes, vibrant street art color palette. Preserve facial structure. Candid parkour action, no eye contact. Illustration, not photorealistic.",
    ]
    
    # Use all 15 photorealistic prompts for comprehensive coverage
    photo_realistic_prompts = base_images_prompts
    
    # Final ordered set: 15 photo + 11 B/W stylized + 9 color stylized = 35 total
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
