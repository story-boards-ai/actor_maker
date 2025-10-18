"""
Actor-specific training prompts for generating diverse training data.
These prompts are designed for character/actor LoRA training with cinematic scenes.
"""

from typing import List
from prompt_color_stripper import strip_color_terms


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
        f"Cinematic film scene: The {descriptor} runs across a rain-slick street at night, mid-stride, lit by car headlights from the side. Dutch angle with 15-degree tilt, low camera position, three-quarter back view with strong diagonal composition. Eyes focused ahead on the street, body leaning into motion. Reflections on the asphalt, no other figures in frame. Dynamic off-center framing with character positioned in lower-left third of frame, asymmetrical composition, no central vanishing point, diagonal depth instead of straight central lines, character unaware of camera, looking away. Film-like cinematography, absolutely NOT symmetrical or centered.",
        
        # NATURE - Forest daytime - OVER-THE-SHOULDER TRACKING
        f"Cinematic film scene: The {descriptor} walks through a misty forest at dawn, sunlight filtering through tall pine trees. Over-the-shoulder tracking shot from behind and to the side, camera following at 45-degree angle, eyes focused on the forest path ahead. Asymmetric framing with character in right third of frame, trees creating diagonal depth lines, two-point perspective, soft morning light creating long shadows at angles. Character moving deeper into the woods, head turned slightly, unaware of camera. Film-like cinematography, off-center framing, no central axis, absolutely NOT centered or symmetrical.",
        
        # WATER - Beach golden hour - EXTREME LOW ANGLE
        f"Cinematic film scene: The {descriptor} stands at the edge of a rocky beach at golden hour, waves crashing nearby. Extreme low angle from beach level, shooting upward at a steep diagonal, eyes gazing out at the ocean horizon. Off-center composition with character in upper-right third, dramatic sky dominating frame, three-point perspective, warm orange sunset light illuminating the face from the side, hair moving in the wind. Character lost in thought, completely unaware of observation. Film-like cinematography, angled camera view, no visible vanishing point in center, absolutely NOT symmetrical or centered.",
        
        # URBAN - Close-up candid portrait - EXTREME CLOSE-UP OFFSET
        f"Cinematic film scene: Extreme close-up of the {descriptor}'s face in natural lighting, shot from below and to the side at 30-degree angle. Eyes gazing off-frame to the left or right, looking at something in the distance. Photorealistic, sharp focus on facial features, neutral expression, head turned away from camera at an angle. Asymmetric framing with face positioned in left or right third, heavy negative space on opposite side, slightly tilted camera. Preserve all defining details such as hairstyle, eye color, skin texture, and unique facial characteristics. No eye contact, unposed. Film-like cinematography, dynamic off-center framing, absolutely NOT centered or symmetrical.",
        
        # NATURE - Mountain daytime - EXTREME LOW ANGLE WIDE
        f"Cinematic film scene: The {descriptor} climbs a rocky mountain trail at midday, hands gripping stone. Extreme low angle shot from below, camera tilted upward at a steep 60-degree angle from side position, eyes focused upward on the path ahead. Off-center framing with character in lower-left third, dramatic sky and rock formations creating diagonal composition, three-point perspective, bright sunlight creating harsh angular shadows, blue sky above. Character mid-climb, absorbed in the effort, looking away from camera. Film-like cinematography, shot from the side, no central vanishing point, absolutely NOT symmetrical or centered.",
        
        # WATER - Lake evening - HIGH ANGLE DIAGONAL
        f"Cinematic film scene: The {descriptor} sits on a weathered wooden dock at dusk, feet dangling over calm lake water. High angle shot from above and behind at a 45-degree diagonal, eyes watching ripples spread across the surface. Asymmetric composition with character positioned in right third, dock creating strong diagonal line leading into frame, two-point perspective, soft purple-blue twilight, silhouette against the water. Character in quiet contemplation, unaware of camera. Film-like cinematography, angled camera view, diagonal depth instead of straight central lines, absolutely NOT centered or symmetrical.",
        
        # URBAN - Close-up, warm lighting - PROFILE EXTREME CLOSE-UP
        f"Cinematic film scene: Extreme close-up profile of the {descriptor} looking out a rain-streaked window. Camera positioned to the side at 90-degree angle, capturing face in sharp profile positioned in left or right third of frame, eyes focused on the street below, warm interior light from the opposite side. Asymmetric framing with window edge creating strong diagonal line, gaze directed downward and away, shallow depth of field, no other figures visible. Character absorbed in thought, unaware of camera. Film-like cinematography, off-center framing, no central axis, absolutely NOT symmetrical or centered.",
        
        # OUTDOOR - Field daytime - CRANE SHOT HIGH ANGLE
        f"Cinematic film scene: The {descriptor} walks through a tall grass field at noon, wind blowing the grass in waves. Crane shot from high above at a 60-degree angle from side, eyes scanning the horizon ahead. Asymmetric wide composition with character positioned in lower-right third, bright daylight, character small in the vast landscape, three-point perspective. Head turned away, moving forward diagonally through frame at 45-degree angle, completely unaware of observation. Film-like cinematography, dynamic composition, no visible vanishing point in center, absolutely NOT centered or symmetrical.",
        
        # URBAN - Subway platform night - CANTED ANGLE
        f"Cinematic film scene: The {descriptor} stands alone on a dimly lit subway platform at night, hands in pockets. Canted angle with 20-degree tilt (tilted horizon), camera positioned low and to the side, eyes looking down the tunnel into the distance. Off-center framing with character in left third, strong diagonal lines from platform and tracks, two-point perspective, head turned away from camera, fluorescent overhead lights casting harsh angular shadows. Urban grit, tiled walls, character lost in thought, no eye contact. Film-like cinematography, slightly tilted camera, diagonal depth instead of straight central lines, absolutely NOT symmetrical or centered.",
        
        # NATURE - Forest stream - GROUND-LEVEL SIDE ANGLE
        f"Cinematic film scene: The {descriptor} crouches by a forest stream, hands cupped in the water. Ground-level camera positioned to the side at water height and 45-degree angle, eyes focused on the flowing current. Asymmetric framing with character in right third, stream creating strong diagonal line through frame, two-point perspective, dappled sunlight through trees creating angular light patterns, green foliage surrounding. Character absorbed in the moment, head bowed, unaware of camera. Film-like cinematography, shot from the side, no central vanishing point, absolutely NOT centered or symmetrical.",
        
        # URBAN - Parking garage - TRACKING SHOT DIAGONAL
        f"Cinematic film scene: The {descriptor} walks through a concrete parking garage, lit by overhead strip lights. Tracking shot from the side at 45-degree angle, camera moving with character, eyes focused ahead on the path. Off-center framing with character in left third, pillars creating depth and strong diagonal lines, two-point perspective, cold blue-green lighting, pillars casting long angular shadows. Character moving through frame diagonally at angle, unaware of being observed. Film-like cinematography, angled camera view, diagonal depth instead of straight central lines, absolutely NOT symmetrical or centered.",
        
        # OUTDOOR - Desert/canyon sunset - EXTREME WIDE SIDE ANGLE
        f"Cinematic film scene: The {descriptor} stands at the edge of a desert canyon at sunset, red rock formations in the background. Extreme wide shot from the side at 60-degree angle, eyes looking down into the canyon depths. Off-center composition with character positioned in lower-left third, dramatic landscape dominating frame, three-point perspective, warm golden-red light, dramatic landscape. Character silhouetted against the sky, facing away at angle, completely unaware of camera. Film-like cinematography, shot from the side, no visible vanishing point in center, absolutely NOT centered or symmetrical.",
        
        # URBAN - Wide shot rooftop - EXTREME HIGH ANGLE
        f"Cinematic film scene: Extreme high angle crane shot of the {descriptor} standing on a rooftop edge at dusk, city skyline sprawling behind them. Camera positioned high above at a steep 70-degree angle from side, looking down. Off-center framing with character small in frame positioned in upper-right third, silhouette against orange-purple sky, three-point perspective. Character facing away at angle, eyes scanning the cityscape below. Dramatic scale, tiny figure in vast urban landscape, completely unaware of camera. Film-like cinematography, angled camera view, no central vanishing point, absolutely NOT symmetrical or centered.",
        
        # WATER - Rain/storm - LOW TRACKING SHOT
        f"Cinematic film scene: The {descriptor} walks along a rain-soaked pier during a storm, hood up. Low tracking shot from behind and to the side at 45-degree angle, camera following, eyes focused on the wooden planks ahead. Asymmetric framing with character in right third, pier creating strong diagonal line through frame, two-point perspective, dark gray sky, waves crashing against the pier supports at angles. Character hunched against the wind, moving forward through frame diagonally, unaware of observation. Film-like cinematography, slightly tilted camera, diagonal depth instead of straight central lines, absolutely NOT centered or symmetrical.",
        
        # URBAN - Alley phone call - DUTCH ANGLE CLOSE-UP
        f"Cinematic film scene: The {descriptor} leans against a brick wall in a narrow alley, holding a phone to their ear. Dutch angle close-up from the side with 25-degree tilt, camera tilted, head tilted down, eyes closed or looking at the ground. Off-center framing with character in left third, wall creating strong diagonal line, side profile, single streetlight creating dramatic rim lighting from angle. Wet pavement reflecting light at angles, steam rising from a grate. No direct eye contact, absorbed in conversation. Film-like cinematography, angled camera view, no central axis, absolutely NOT symmetrical or centered.",
    ]
    
    # Black and white stylized prompts - DYNAMIC ILLUSTRATION ANGLES, NO CENTERED FRAMING
    bw_stylized_prompts = [
        # Pen & ink — townhouse stoop - HIGH ANGLE
        f"A black-and-white pen and ink line drawing of the {descriptor} tying their bootlaces on a townhouse stoop under a single streetlamp in light rain, head bowed down looking at their boots. High angle shot from above and to the side, three-quarter side view, mid shot, eyes focused on the laces. Off-center composition with stoop steps creating diagonal lines, high-contrast lines with crosshatching and stippling for shading, no grayscale gradients, clean white negative space. Preserve the subject's defining features. Candid pose, character unaware, no eye contact. Asymmetric framing, not centered. Illustration only, not photorealistic.",
        
        # Graphite pencil — train window - EXTREME SIDE ANGLE
        f"A graphite pencil sketch of the {descriptor} seated by a train window at dawn, eyes gazing out at the passing landscape with a reflective expression, head turned away from viewer. Extreme side angle from aisle perspective, medium close-up from slightly below eye level, face in sharp profile looking outside. Off-center framing with window creating diagonal, soft hatching and blending, visible pencil grain, no color. Preserve facial structure and hairstyle. Candid moment, no eye contact with viewer. Asymmetric composition, not centered. Illustration, not photorealistic.",
        
        # Charcoal — warehouse door - LOW ANGLE DIAGONAL
        f"A charcoal drawing of the {descriptor} bracing a shoulder against a half-rolled warehouse door, dust in the air, eyes focused on the effort, head turned to the side. Low angle shot from ground level at a 40-degree diagonal, three-quarter view, face looking away from viewer, dramatic top light. Off-center framing with character in right third, door creating strong diagonal line, two-point perspective, rough strokes and smudged shadows, no color. Preserve identity cues. Candid action pose, no camera awareness. Asymmetric composition, no central vanishing point, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Woodcut/linocut — alley sprint - DUTCH ANGLE
        f"A black-and-white woodcut print style image of the {descriptor} sprinting down a narrow alley, eyes focused ahead on the path, angular highlights and carved textures. Dutch angle with 18-degree tilt, profile mid shot from the side, head turned away from viewer, strong diagonal composition with alley walls creating depth. Off-center framing with character in left third, thick black shapes and white cuts, no halftones, diagonal depth instead of straight central lines. Preserve recognizable features. Candid action, character looking forward. Asymmetric framing, shot from the side, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Monochrome vector — poster silhouette - EXTREME LOW ANGLE
        f"A monochrome flat vector illustration of {descriptor} in the style of a detailed hand-drawn concept sketch, with clean, confident lines, subtle hatching, and balanced proportions. Extreme low angle looking upward at 55-degree angle, head turned to the side in profile or three-quarter view, eyes looking away from viewer. Off-center composition with character in upper-left third, heavy negative space on opposite side, minimal geometric shapes, hard edges, no gradients, single black ink on white background. Poster-like framing. Preserve silhouette and key features. Candid pose, no eye contact. Asymmetric framing, angled camera view, no central axis, absolutely NOT centered or symmetrical.",
        
        # Manga screentone — phone call in alley - CANTED ANGLE
        f"A black-and-white manga illustration of the {descriptor} making a tense phone call in an alley, eyes closed or looking down, head tilted. Canted angle with 22-degree tilt (tilted horizon), half-body shot, three-quarter angle from the side, face turned away from viewer. Off-center framing with character in right third, alley walls creating strong diagonal lines, two-point perspective, expressive inking with screentone patterns for shading, speed lines in background. No grayscale gradients, no color. Preserve identity. Candid moment, no camera awareness. Asymmetric composition, slightly tilted camera, diagonal depth, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Ink wash — market crowd - HIGH ANGLE WIDE
        f"A black-and-white ink wash drawing of the {descriptor} pushing through a crowded marketplace, arm extended forward parting the crowd, eyes focused downward on the path ahead. High angle wide shot from above at a 50-degree diagonal, frontal three-quarter angle, face visible but looking down and to the side. Off-center framing with character positioned in lower-right third, small in busy scene, three-point perspective, loose gestural brushwork with varying ink densities, atmospheric crowd silhouettes in background. Preserve facial features. Candid action, no eye contact. Asymmetric composition, angled camera view, no visible vanishing point in center, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Scratchboard — climbing action - EXTREME LOW ANGLE
        f"A black-and-white scratchboard illustration of the {descriptor} scaling a rocky cliff face, both hands gripping stone above, eyes focused upward on the next handhold. Extreme low angle from far below at 65-degree angle, medium shot looking up at steep angle, face angled up and away from viewer. Off-center framing with character in upper-left third, dramatic rock formations creating diagonal composition, three-point perspective, white lines scratched from black surface, dramatic contrast with fine detail work. Preserve identity. Candid climbing action, no camera awareness. Asymmetric framing, shot from the side, no central vanishing point, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Linocut — rain crossing - GROUND LEVEL DIAGONAL
        f"A black-and-white linocut print of the {descriptor} running across a rain-soaked plaza, coat billowing, eyes squinting against the downpour looking ahead. Ground level diagonal shot from low angle to the side at 35-degree angle, full body, face visible but turned slightly down shielding from rain. Off-center composition with character in left third, plaza creating diagonal depth lines, two-point perspective, bold carved shapes, strong vertical rain lines at angles, high contrast black and white. Preserve recognizable features. Candid action in weather, no eye contact. Asymmetric framing, angled camera view, diagonal depth instead of straight central lines, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Etching — workshop scene - SIDE ANGLE ELEVATED
        f"A black-and-white etching of the {descriptor} hammering metal at an anvil in a workshop, sparks flying, eyes focused intently on the workpiece below. Side angle from elevated position at 45-degree angle, medium shot from slightly above and to the side, face lit by forge glow looking down at work. Off-center framing with character in right third, workshop tools creating diagonal depth lines, two-point perspective, fine cross-hatched lines, rich blacks in shadows, detailed linework. Preserve facial structure. Candid crafting action, no camera awareness. Asymmetric composition, shot from the side, no central axis, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Conte crayon — subway rush - TRACKING DIAGONAL
        f"A black-and-white conte crayon drawing of the {descriptor} rushing down subway stairs, hand on railing, eyes looking down at steps ahead. Tracking shot from the side at a 42-degree diagonal angle, frontal diagonal view from platform level, face visible but angled downward in motion. Off-center framing with character in left third, stairs creating strong diagonal lines, two-point perspective, soft smudged blacks with sharp highlights, textured paper grain visible, dynamic diagonal composition. Preserve identity cues. Candid hurried movement, no eye contact. Asymmetric framing, angled camera view, diagonal depth instead of straight central lines, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
    ]
    
    # Color stylized prompts - DYNAMIC ILLUSTRATION ANGLES, NO CENTERED FRAMING
    color_stylized_prompts = [
        # Comic book — rooftop gap - EXTREME LOW ANGLE
        f"A dynamic comic book illustration of the {descriptor} leaping a narrow rooftop gap at night with a city skyline behind, eyes focused on the landing spot ahead, head turned away from viewer. Extreme low angle from street level looking up at 70-degree angle, foreshortened limbs, face in profile or three-quarter view looking at the opposite rooftop. Off-center framing with character in upper-right third, dramatic perspective, three-point perspective, speed lines, bold inks, cel-shaded color, limited palette with halftone dots. Preserve identity and key attributes. Candid action pose, no eye contact. Asymmetric composition, angled camera view, no central vanishing point, absolutely NOT centered or symmetrical. Illustration style, not photorealistic.",
        
        # Flat vector — metro platform - SIDE ANGLE DIAGONAL
        f"A flat vector illustration of the {descriptor} waiting on a metro platform, holding a small duffel, eyes looking left as a train approaches, head turned in profile away from viewer. Side angle shot from platform edge at a 38-degree diagonal, medium profile shot with long geometric shadows, face directed toward the approaching train. Off-center composition with character in left third, platform creating diagonal depth lines, two-point perspective, flat colors, simple shapes, crisp outlines, poster-like composition. Preserve recognizable features. Candid waiting pose, no camera awareness. Asymmetric framing, shot from the side, diagonal depth instead of straight central lines, absolutely NOT centered or symmetrical. Not photorealistic.",
        
        # Watercolor — diner window - HIGH ANGLE THROUGH WINDOW
        f"A watercolor illustration of the {descriptor} seated alone in a diner booth by a rain-streaked window at dusk, hand around a steaming mug, eyes gazing out the window at the rain. High angle shot from outside looking in through window at a 48-degree diagonal, three-quarter view, head turned away from viewer looking outside. Off-center framing with character in right third, window frame creating strong diagonal line, two-point perspective, soft backlight from the window, warm interior tones against cool exterior. Paper texture visible, gentle bleeding, hand-painted look. Preserve identity. Candid contemplative moment, no eye contact. Asymmetric composition, angled camera view, no central axis, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Gouache — stairwell action - EXTREME LOW ANGLE
        f"A gouache painting of the {descriptor} ascending a concrete stairwell, caught mid-step, eyes focused upward on the stairs ahead, head angled away from viewer. Extreme low angle from bottom of stairs looking up at steep 62-degree angle, face in profile or three-quarter view looking up the stairwell. Off-center framing with character in lower-left third, stairs creating strong diagonal composition, three-point perspective, chunky brush strokes, matte opaque paint, simplified forms with saturated accents. Preserve facial features and hairstyle. Candid action moment, no camera contact. Asymmetric composition, shot from below, no visible vanishing point in center, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Acrylic — street performance - DUTCH ANGLE WIDE
        f"A vibrant acrylic painting of the {descriptor} juggling flaming torches in a street performance, eyes tracking the arc of flames above, face tilted upward. Dutch angle with 17-degree tilt, wide shot from audience perspective to the side at 45-degree angle, face visible but looking up at the torches. Off-center framing with character in right third, crowd silhouettes creating diagonal depth, two-point perspective, bold brushwork, rich saturated colors with orange flame glow, energetic paint application. Preserve identity. Candid performance action, no eye contact. Asymmetric composition, slightly tilted camera, diagonal depth instead of straight central lines, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Digital painting — motorcycle repair - HIGH ANGLE DIAGONAL
        f"A digital painting of the {descriptor} crouched beside a vintage motorcycle in a desert garage, wrench in hand, eyes focused on engine parts below. High angle shot from above at a 52-degree diagonal, wide view from standing height, face angled down examining the work. Off-center framing with character in lower-right third, motorcycle dominating foreground creating diagonal composition, two-point perspective, warm afternoon light, painterly digital brushstrokes, dusty oranges and teals, detailed mechanical elements. Preserve facial features. Candid repair work, no camera awareness. Asymmetric composition, angled camera view, no central vanishing point, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Oil painting — greenhouse botanist - SIDE ANGLE CLOSE
        f"An impressionistic oil painting of the {descriptor} examining exotic plants in a humid greenhouse, holding a specimen jar up to diffused light, eyes studying the contents. Side angle close shot from chest level at a 43-degree diagonal, face turned slightly up toward the jar. Off-center framing with character in left third, plants creating diagonal depth lines, two-point perspective, loose expressive brushwork, lush greens with warm golden light, visible paint texture. Preserve recognizable features. Candid scientific observation, no eye contact. Asymmetric composition, shot from the side, no central axis, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Pastel — beach cleanup - GROUND LEVEL SIDE ANGLE
        f"A soft pastel illustration of the {descriptor} bending to collect debris on a windswept beach at sunset, hair blowing, eyes focused on the sand ahead. Ground level side angle from low position at a 37-degree diagonal, full body view, face angled downward searching the beach. Off-center framing with character in right third, beach stretching into distance creating diagonal depth, two-point perspective, blended pastel colors, warm sunset palette with cool shadows, atmospheric coastal scene. Preserve identity cues. Candid environmental action, no camera awareness. Asymmetric composition, angled camera view, diagonal depth instead of straight central lines, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
        
        # Mixed media collage — urban parkour - EXTREME LOW ANGLE DIAGONAL
        f"A mixed media collage illustration of the {descriptor} vaulting over a concrete barrier in an urban plaza, mid-leap with arms extended, eyes locked on the landing zone ahead. Extreme low angle diagonal shot from ground level to the side at 68-degree angle, face visible but focused downward on landing spot. Off-center framing with character in upper-left third, dramatic perspective, three-point perspective, layered textures combining paint and paper elements, bold graphic shapes, vibrant street art color palette. Preserve facial structure. Candid parkour action, no eye contact. Asymmetric composition, shot from the side, no visible vanishing point in center, absolutely NOT centered or symmetrical. Illustration, not photorealistic.",
    ]
    
    # Use all 15 photorealistic prompts for comprehensive coverage
    photo_realistic_prompts = base_images_prompts
    
    # Strip color terms from B&W prompts
    # B&W prompts should not contain any color-related terms
    bw_stylized_prompts_cleaned = [
        strip_color_terms(prompt) for prompt in bw_stylized_prompts
    ]
    
    # Final ordered set: 15 photo + 11 B/W stylized + 9 color stylized = 35 total
    all_training_prompts = [
        *photo_realistic_prompts,
        *bw_stylized_prompts_cleaned,  # Use cleaned B&W prompts
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
