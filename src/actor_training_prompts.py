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
    
    # Base photorealistic prompts - CINEMATIC FILM SCENES with DYNAMIC CAMERA ANGLES
    # NO SYMMETRICAL COMPOSITIONS - Avoid centered, Instagram-style framing
    # Mix of urban, nature, water, and outdoor environments with varied lighting
    base_images_prompts = [
        # URBAN - Nighttime - DUTCH ANGLE
        f"Cinematic film scene: The {descriptor} runs across a rain-slick street at night, mid-stride, lit by car headlights from the side. Dutch angle, low camera position, three-quarter back view with strong diagonal composition. Eyes focused ahead on the street, body leaning into motion. Reflections on the asphalt, no other figures in frame. Dynamic off-center framing, character unaware of camera, looking away. Film-like cinematography, not symmetrical.",
        
        # NATURE - Forest daytime - OVER-THE-SHOULDER TRACKING
        f"Cinematic film scene: The {descriptor} walks through a misty forest at dawn, sunlight filtering through tall pine trees. Over-the-shoulder tracking shot from behind and to the side, camera following at an angle, eyes focused on the forest path ahead. Asymmetric framing with trees creating depth, soft morning light creating long shadows. Character moving deeper into the woods, head turned slightly, unaware of camera. Film-like cinematography, not centered.",
        
        # WATER - Beach golden hour - EXTREME LOW ANGLE
        f"Cinematic film scene: The {descriptor} stands at the edge of a rocky beach at golden hour, waves crashing nearby. Extreme low angle from beach level, shooting upward at a diagonal, eyes gazing out at the ocean horizon. Off-center composition with dramatic sky, warm orange sunset light illuminating the face from the side, hair moving in the wind. Character lost in thought, completely unaware of observation. Film-like cinematography, not symmetrical.",
        
        # URBAN - Close-up candid portrait - EXTREME CLOSE-UP OFFSET
        f"Cinematic film scene: Extreme close-up of the {descriptor}'s face in natural lighting, shot from below and to the side. Eyes gazing off-frame to the left or right, looking at something in the distance. Photorealistic, sharp focus on facial features, neutral expression, head turned away from camera at an angle. Asymmetric framing with negative space. Preserve all defining details such as hairstyle, eye color, skin texture, and unique facial characteristics. No eye contact, unposed. Film-like cinematography, not centered.",
        
        # NATURE - Mountain daytime - EXTREME LOW ANGLE WIDE
        f"Cinematic film scene: The {descriptor} climbs a rocky mountain trail at midday, hands gripping stone. Extreme low angle shot from below, camera tilted upward at a steep angle, eyes focused upward on the path ahead. Off-center framing with dramatic sky and rock formations, bright sunlight creating harsh shadows, blue sky above. Character mid-climb, absorbed in the effort, looking away from camera. Film-like cinematography, not symmetrical.",
        
        # WATER - Lake evening - HIGH ANGLE DIAGONAL
        f"Cinematic film scene: The {descriptor} sits on a weathered wooden dock at dusk, feet dangling over calm lake water. High angle shot from above and behind at a diagonal, eyes watching ripples spread across the surface. Asymmetric composition with dock leading into frame, soft purple-blue twilight, silhouette against the water. Character in quiet contemplation, unaware of camera. Film-like cinematography, not centered.",
        
        # URBAN - Close-up, warm lighting - PROFILE EXTREME CLOSE-UP
        f"Cinematic film scene: Extreme close-up profile of the {descriptor} looking out a rain-streaked window. Camera positioned to the side, capturing face in sharp profile, eyes focused on the street below, warm interior light from the opposite side. Asymmetric framing with window edge creating diagonal, gaze directed downward and away, shallow depth of field, no other figures visible. Character absorbed in thought, unaware of camera. Film-like cinematography, not symmetrical.",
        
        # OUTDOOR - Field daytime - CRANE SHOT HIGH ANGLE
        f"Cinematic film scene: The {descriptor} walks through a tall grass field at noon, wind blowing the grass in waves. Crane shot from high above at an angle, eyes scanning the horizon ahead. Asymmetric wide composition with character off-center, bright daylight, character small in the vast landscape. Head turned away, moving forward diagonally through frame, completely unaware of observation. Film-like cinematography, not centered.",
        
        # URBAN - Subway platform night - CANTED ANGLE
        f"Cinematic film scene: The {descriptor} stands alone on a dimly lit subway platform at night, hands in pockets. Canted angle (tilted horizon), camera positioned low and to the side, eyes looking down the tunnel into the distance. Off-center framing with strong diagonal lines, head turned away from camera, fluorescent overhead lights casting harsh shadows. Urban grit, tiled walls, character lost in thought, no eye contact. Film-like cinematography, not symmetrical.",
        
        # NATURE - Forest stream - GROUND-LEVEL SIDE ANGLE
        f"Cinematic film scene: The {descriptor} crouches by a forest stream, hands cupped in the water. Ground-level camera positioned to the side at water height, eyes focused on the flowing current. Asymmetric framing with stream creating diagonal, dappled sunlight through trees, green foliage surrounding. Character absorbed in the moment, head bowed, unaware of camera. Film-like cinematography, not centered.",
        
        # URBAN - Parking garage - TRACKING SHOT DIAGONAL
        f"Cinematic film scene: The {descriptor} walks through a concrete parking garage, lit by overhead strip lights. Tracking shot from the side at an angle, camera moving with character, eyes focused ahead on the path. Off-center framing with pillars creating depth and diagonal lines, cold blue-green lighting, pillars casting long shadows. Character moving through frame diagonally, unaware of being observed. Film-like cinematography, not symmetrical.",
        
        # OUTDOOR - Desert/canyon sunset - EXTREME WIDE SIDE ANGLE
        f"Cinematic film scene: The {descriptor} stands at the edge of a desert canyon at sunset, red rock formations in the background. Extreme wide shot from the side at an angle, eyes looking down into the canyon depths. Off-center composition with dramatic landscape dominating frame, warm golden-red light, dramatic landscape. Character silhouetted against the sky, facing away at an angle, completely unaware of camera. Film-like cinematography, not centered.",
        
        # URBAN - Wide shot rooftop - EXTREME HIGH ANGLE
        f"Cinematic film scene: Extreme high angle crane shot of the {descriptor} standing on a rooftop edge at dusk, city skyline sprawling behind them. Camera positioned high above at a steep angle, looking down. Off-center framing with character small in frame, silhouette against orange-purple sky. Character facing away at an angle, eyes scanning the cityscape below. Dramatic scale, tiny figure in vast urban landscape, completely unaware of camera. Film-like cinematography, not symmetrical.",
        
        # WATER - Rain/storm - LOW TRACKING SHOT
        f"Cinematic film scene: The {descriptor} walks along a rain-soaked pier during a storm, hood up. Low tracking shot from behind and to the side, camera following at an angle, eyes focused on the wooden planks ahead. Asymmetric framing with pier creating diagonal, dark gray sky, waves crashing against the pier supports. Character hunched against the wind, moving forward through frame, unaware of observation. Film-like cinematography, not centered.",
        
        # URBAN - Alley phone call - DUTCH ANGLE CLOSE-UP
        f"Cinematic film scene: The {descriptor} leans against a brick wall in a narrow alley, holding a phone to their ear. Dutch angle close-up from the side, camera tilted, head tilted down, eyes closed or looking at the ground. Off-center framing with wall creating diagonal, side profile, single streetlight creating dramatic rim lighting. Wet pavement reflecting light, steam rising from a grate. No direct eye contact, absorbed in conversation. Film-like cinematography, not symmetrical.",
    ]
    
    # Black and white stylized prompts - DYNAMIC ILLUSTRATION ANGLES, NO CENTERED FRAMING
    bw_stylized_prompts = [
        # Pen & ink — townhouse stoop - HIGH ANGLE
        f"A black-and-white pen and ink line drawing of the {descriptor} tying their bootlaces on a townhouse stoop under a single streetlamp in light rain, head bowed down looking at their boots. High angle shot from above and to the side, three-quarter side view, mid shot, eyes focused on the laces. Off-center composition with stoop steps creating diagonal lines, high-contrast lines with crosshatching and stippling for shading, no grayscale gradients, clean white negative space. Preserve the subject's defining features. Candid pose, character unaware, no eye contact. Asymmetric framing, not centered. Illustration only, not photorealistic.",
        
        # Graphite pencil — train window - EXTREME SIDE ANGLE
        f"A graphite pencil sketch of the {descriptor} seated by a train window at dawn, eyes gazing out at the passing landscape with a reflective expression, head turned away from viewer. Extreme side angle from aisle perspective, medium close-up from slightly below eye level, face in sharp profile looking outside. Off-center framing with window creating diagonal, soft hatching and blending, visible pencil grain, no color. Preserve facial structure and hairstyle. Candid moment, no eye contact with viewer. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Charcoal — warehouse door - LOW ANGLE DIAGONAL
        f"A charcoal drawing of the {descriptor} bracing a shoulder against a half-rolled warehouse door, dust in the air, eyes focused on the effort, head turned to the side. Low angle shot from ground level at a diagonal, three-quarter view, face looking away from viewer, dramatic top light. Off-center framing with door creating strong diagonal, rough strokes and smudged shadows, no color. Preserve identity cues. Candid action pose, no camera awareness. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Woodcut/linocut — alley sprint - DUTCH ANGLE
        f"A black-and-white woodcut print style image of the {descriptor} sprinting down a narrow alley, eyes focused ahead on the path, angular highlights and carved textures. Dutch angle (tilted), profile mid shot from the side, head turned away from viewer, strong diagonal composition with alley walls creating depth. Off-center framing, thick black shapes and white cuts, no halftones. Preserve recognizable features. Candid action, character looking forward. Asymmetric framing, not centered. Illustration, not photorealistic.",
        
        # Monochrome vector — poster silhouette - EXTREME LOW ANGLE
        f"A monochrome flat vector illustration of {descriptor} in the style of a detailed hand-drawn concept sketch, with clean, confident lines, subtle hatching, and balanced proportions. Extreme low angle looking upward, head turned to the side in profile or three-quarter view, eyes looking away from viewer. Off-center composition with negative space, minimal geometric shapes, hard edges, no gradients, single black ink on white background. Poster-like framing. Preserve silhouette and key features. Candid pose, no eye contact. Asymmetric framing, not centered.",
        
        # Manga screentone — phone call in alley - CANTED ANGLE
        f"A black-and-white manga illustration of the {descriptor} making a tense phone call in an alley, eyes closed or looking down, head tilted. Canted angle (tilted horizon), half-body shot, three-quarter angle from the side, face turned away from viewer. Off-center framing with alley walls creating diagonal, expressive inking with screentone patterns for shading, speed lines in background. No grayscale gradients, no color. Preserve identity. Candid moment, no camera awareness. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Ink wash — market crowd - HIGH ANGLE WIDE
        f"A black-and-white ink wash drawing of the {descriptor} pushing through a crowded marketplace, arm extended forward parting the crowd, eyes focused downward on the path ahead. High angle wide shot from above at a diagonal, frontal three-quarter angle, face visible but looking down and to the side. Off-center framing with character small in busy scene, loose gestural brushwork with varying ink densities, atmospheric crowd silhouettes in background. Preserve facial features. Candid action, no eye contact. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Scratchboard — climbing action - EXTREME LOW ANGLE
        f"A black-and-white scratchboard illustration of the {descriptor} scaling a rocky cliff face, both hands gripping stone above, eyes focused upward on the next handhold. Extreme low angle from far below, medium shot looking up at steep angle, face angled up and away from viewer. Off-center framing with dramatic rock formations, white lines scratched from black surface, dramatic contrast with fine detail work. Preserve identity. Candid climbing action, no camera awareness. Asymmetric framing, not centered. Illustration, not photorealistic.",
        
        # Linocut — rain crossing - GROUND LEVEL DIAGONAL
        f"A black-and-white linocut print of the {descriptor} running across a rain-soaked plaza, coat billowing, eyes squinting against the downpour looking ahead. Ground level diagonal shot from low angle to the side, full body, face visible but turned slightly down shielding from rain. Off-center composition with plaza creating depth, bold carved shapes, strong vertical rain lines, high contrast black and white. Preserve recognizable features. Candid action in weather, no eye contact. Asymmetric framing, not centered. Illustration, not photorealistic.",
        
        # Etching — workshop scene - SIDE ANGLE ELEVATED
        f"A black-and-white etching of the {descriptor} hammering metal at an anvil in a workshop, sparks flying, eyes focused intently on the workpiece below. Side angle from elevated position, medium shot from slightly above and to the side, face lit by forge glow looking down at work. Off-center framing with workshop tools creating depth, fine cross-hatched lines, rich blacks in shadows, detailed linework. Preserve facial structure. Candid crafting action, no camera awareness. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Conte crayon — subway rush - TRACKING DIAGONAL
        f"A black-and-white conte crayon drawing of the {descriptor} rushing down subway stairs, hand on railing, eyes looking down at steps ahead. Tracking shot from the side at a diagonal angle, frontal diagonal view from platform level, face visible but angled downward in motion. Off-center framing with stairs creating strong diagonal, soft smudged blacks with sharp highlights, textured paper grain visible, dynamic diagonal composition. Preserve identity cues. Candid hurried movement, no eye contact. Asymmetric framing, not centered. Illustration, not photorealistic.",
    ]
    
    # Color stylized prompts - DYNAMIC ILLUSTRATION ANGLES, NO CENTERED FRAMING
    color_stylized_prompts = [
        # Comic book — rooftop gap - EXTREME LOW ANGLE
        f"A dynamic comic book illustration of the {descriptor} leaping a narrow rooftop gap at night with a city skyline behind, eyes focused on the landing spot ahead, head turned away from viewer. Extreme low angle from street level looking up, foreshortened limbs, face in profile or three-quarter view looking at the opposite rooftop. Off-center framing with dramatic perspective, speed lines, bold inks, cel-shaded color, limited palette with halftone dots. Preserve identity and key attributes. Candid action pose, no eye contact. Asymmetric composition, not centered. Illustration style, not photorealistic.",
        
        # Flat vector — metro platform - SIDE ANGLE DIAGONAL
        f"A flat vector illustration of the {descriptor} waiting on a metro platform, holding a small duffel, eyes looking left as a train approaches, head turned in profile away from viewer. Side angle shot from platform edge at a diagonal, medium profile shot with long geometric shadows, face directed toward the approaching train. Off-center composition with platform creating depth, flat colors, simple shapes, crisp outlines, poster-like composition. Preserve recognizable features. Candid waiting pose, no camera awareness. Asymmetric framing, not centered. Not photorealistic.",
        
        # Watercolor — diner window - HIGH ANGLE THROUGH WINDOW
        f"A watercolor illustration of the {descriptor} seated alone in a diner booth by a rain-streaked window at dusk, hand around a steaming mug, eyes gazing out the window at the rain. High angle shot from outside looking in through window at a diagonal, three-quarter view, head turned away from viewer looking outside. Off-center framing with window frame creating diagonal, soft backlight from the window, warm interior tones against cool exterior. Paper texture visible, gentle bleeding, hand-painted look. Preserve identity. Candid contemplative moment, no eye contact. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Gouache — stairwell action - EXTREME LOW ANGLE
        f"A gouache painting of the {descriptor} ascending a concrete stairwell, caught mid-step, eyes focused upward on the stairs ahead, head angled away from viewer. Extreme low angle from bottom of stairs looking up at steep angle, face in profile or three-quarter view looking up the stairwell. Off-center framing with stairs creating strong diagonal, chunky brush strokes, matte opaque paint, simplified forms with saturated accents. Preserve facial features and hairstyle. Candid action moment, no camera contact. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Acrylic — street performance - DUTCH ANGLE WIDE
        f"A vibrant acrylic painting of the {descriptor} juggling flaming torches in a street performance, eyes tracking the arc of flames above, face tilted upward. Dutch angle (tilted) wide shot from audience perspective to the side, face visible but looking up at the torches. Off-center framing with crowd silhouettes, bold brushwork, rich saturated colors with orange flame glow, energetic paint application. Preserve identity. Candid performance action, no eye contact. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Digital painting — motorcycle repair - HIGH ANGLE DIAGONAL
        f"A digital painting of the {descriptor} crouched beside a vintage motorcycle in a desert garage, wrench in hand, eyes focused on engine parts below. High angle shot from above at a diagonal, wide view from standing height, face angled down examining the work. Off-center framing with motorcycle dominating foreground, warm afternoon light, painterly digital brushstrokes, dusty oranges and teals, detailed mechanical elements. Preserve facial features. Candid repair work, no camera awareness. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Oil painting — greenhouse botanist - SIDE ANGLE CLOSE
        f"An impressionistic oil painting of the {descriptor} examining exotic plants in a humid greenhouse, holding a specimen jar up to diffused light, eyes studying the contents. Side angle close shot from chest level at a diagonal, face turned slightly up toward the jar. Off-center framing with plants creating depth, loose expressive brushwork, lush greens with warm golden light, visible paint texture. Preserve recognizable features. Candid scientific observation, no eye contact. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Pastel — beach cleanup - GROUND LEVEL SIDE ANGLE
        f"A soft pastel illustration of the {descriptor} bending to collect debris on a windswept beach at sunset, hair blowing, eyes focused on the sand ahead. Ground level side angle from low position at a diagonal, full body view, face angled downward searching the beach. Off-center framing with beach stretching into distance, blended pastel colors, warm sunset palette with cool shadows, atmospheric coastal scene. Preserve identity cues. Candid environmental action, no camera awareness. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Mixed media collage — urban parkour - EXTREME LOW ANGLE DIAGONAL
        f"A mixed media collage illustration of the {descriptor} vaulting over a concrete barrier in an urban plaza, mid-leap with arms extended, eyes locked on the landing zone ahead. Extreme low angle diagonal shot from ground level to the side, face visible but focused downward on landing spot. Off-center framing with dramatic perspective, layered textures combining paint and paper elements, bold graphic shapes, vibrant street art color palette. Preserve facial structure. Candid parkour action, no eye contact. Asymmetric composition, not centered. Illustration, not photorealistic.",
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
