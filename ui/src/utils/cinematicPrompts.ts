/**
 * Cinematic prompts for character validation
 * Use [character] placeholder which will be replaced with the character's class token
 */

export interface CinematicPrompt {
  id: string;
  label: string;
  prompt: string;
}

export const CINEMATIC_PROMPTS: CinematicPrompt[] = [
  {
    id: "hero-moment",
    label: "Heroic Moment",
    prompt: "[character] standing tall on a cliff edge overlooking a vast valley at sunset, arms crossed confidently, wind blowing through hair and clothes, determined expression gazing into the distance, dramatic clouds swirling in the sky behind them, epic heroic stance"
  },
  {
    id: "intense-confrontation",
    label: "Intense Confrontation",
    prompt: "[character] face illuminated by flickering firelight, eyes narrowed with intense focus and determination, jaw clenched, beads of sweat on forehead, leaning forward aggressively in a tense standoff, shadows dancing across their face"
  },
  {
    id: "action-combat",
    label: "Action Combat",
    prompt: "[character] mid-fight in a rain-soaked alley, throwing a powerful punch with body twisted in dynamic motion, water splashing around their feet, opponent's silhouette in background, muscles tensed, face showing fierce concentration and adrenaline"
  },
  {
    id: "mysterious-arrival",
    label: "Mysterious Arrival",
    prompt: "[character] walking slowly through fog-filled street at night, long coat billowing behind them, hands in pockets, mysterious confident stride, neon signs glowing in the mist, puddles reflecting colorful lights, enigmatic expression"
  },
  {
    id: "epic-journey",
    label: "Epic Journey",
    prompt: "[character] standing alone in the middle of an endless desert with towering sand dunes, backpack slung over shoulder, shielding eyes from the sun while looking toward the horizon, small figure against massive landscape, journey ahead"
  },
  {
    id: "urban-pursuit",
    label: "Urban Pursuit",
    prompt: "[character] running full speed down a crowded city street at night, pushing past pedestrians, looking back over shoulder with worried expression, neon signs and car headlights blurring past, urgent escape in progress"
  },
  {
    id: "moment-of-loss",
    label: "Moment of Loss",
    prompt: "[character] sitting slumped on the floor against a wall, head in hands, shoulders shaking with emotion, dim light from a nearby window casting long shadows, scattered papers or broken objects around them, devastated and alone"
  },
  {
    id: "silhouette-contemplation",
    label: "Silhouette Contemplation",
    prompt: "[character] standing in profile at a large window, silhouetted against bright city lights or sunset, hand touching the glass, head slightly bowed in deep thought, isolated and contemplative, rain streaking down the window"
  },
  {
    id: "heated-argument",
    label: "Heated Argument",
    prompt: "[character] in the middle of an intense argument, gesturing emphatically with hands, face flushed with anger or passion, leaning across a table toward another person, papers scattered, coffee cups knocked over, emotional confrontation"
  },
  {
    id: "mountain-summit",
    label: "Mountain Summit Victory",
    prompt: "[character] reaching the peak of a snow-covered mountain, arms raised triumphantly above head, face showing exhaustion and joy, ice crystals in hair, climbing gear visible, vast mountain range stretching endlessly below, moment of achievement"
  },
  {
    id: "rainy-goodbye",
    label: "Rainy Goodbye",
    prompt: "[character] standing in pouring rain without an umbrella, hair and clothes completely soaked, reaching out with one hand toward someone walking away in the distance, face showing heartbreak and desperation, rain creating curtains of water"
  },
  {
    id: "underground-discovery",
    label: "Underground Discovery",
    prompt: "[character] holding a flashlight in a dark underground tunnel or cave, beam of light revealing ancient symbols on walls, face showing awe and wonder, dust particles floating in the light beam, crouching to examine mysterious artifacts"
  },
  {
    id: "rooftop-escape",
    label: "Rooftop Escape",
    prompt: "[character] leaping between rooftops high above the city, body stretched in mid-air jump, arms windmilling for balance, expression of fear and determination, city lights far below, dangerous parkour escape"
  },
  {
    id: "car-chase-driver",
    label: "Car Chase Driver",
    prompt: "[character] gripping the steering wheel tightly with white knuckles, face lit by dashboard glow and passing streetlights, eyes wide with intensity focused on the road, jaw set, city lights streaking past the windows, high-speed pursuit"
  },
  {
    id: "peaceful-morning",
    label: "Peaceful Morning",
    prompt: "[character] sitting on a wooden porch with steaming coffee mug in hands, wrapped in a cozy blanket, watching the sunrise over misty hills, gentle smile, peaceful and content expression, birds flying in the golden morning light"
  }
];

/**
 * Replace [character] placeholder with actual character class token
 */
export function replaceCharacterToken(prompt: string, characterToken: string): string {
  return prompt.replace(/\[character\]/g, characterToken);
}
