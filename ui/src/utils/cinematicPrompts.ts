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
    id: "hero-low-angle",
    label: "Hero Shot - Low Angle",
    prompt: "[character] standing heroically, low angle shot, dramatic lighting from below, cinematic composition, powerful stance, epic atmosphere"
  },
  {
    id: "close-up-intense",
    label: "Close-Up - Intense Moment",
    prompt: "extreme close-up of [character]'s face, intense expression, shallow depth of field, dramatic side lighting, cinematic bokeh background"
  },
  {
    id: "action-dutch-angle",
    label: "Action - Dutch Angle",
    prompt: "[character] in dynamic action pose, dutch angle camera tilt, motion blur, high contrast lighting, cinematic tension, dramatic composition"
  },
  {
    id: "over-shoulder",
    label: "Over-the-Shoulder Shot",
    prompt: "over-the-shoulder shot of [character], cinematic framing, shallow focus on subject, atmospheric lighting, film noir style"
  },
  {
    id: "wide-establishing",
    label: "Wide Establishing Shot",
    prompt: "[character] in wide cinematic shot, epic landscape background, golden hour lighting, anamorphic lens flare, establishing shot composition"
  },
  {
    id: "tracking-shot",
    label: "Tracking Shot - Walking",
    prompt: "[character] walking towards camera, tracking shot, cinematic motion, dramatic backlighting, urban environment, film grain"
  },
  {
    id: "high-angle-vulnerable",
    label: "High Angle - Vulnerable",
    prompt: "[character] from high angle perspective, vulnerable moment, soft dramatic lighting, cinematic depth, emotional atmosphere"
  },
  {
    id: "profile-silhouette",
    label: "Profile Silhouette",
    prompt: "[character] in profile silhouette, dramatic rim lighting, cinematic contrast, moody atmosphere, film noir composition"
  },
  {
    id: "two-shot-conversation",
    label: "Two-Shot Conversation",
    prompt: "[character] in two-shot composition, conversational framing, cinematic lighting setup, shallow depth of field, professional color grading"
  },
  {
    id: "extreme-wide-epic",
    label: "Extreme Wide - Epic Scale",
    prompt: "[character] in extreme wide shot, epic cinematic scale, dramatic sky, anamorphic widescreen composition, sweeping landscape, heroic framing"
  }
];

/**
 * Replace [character] placeholder with actual character class token
 */
export function replaceCharacterToken(prompt: string, characterToken: string): string {
  return prompt.replace(/\[character\]/g, characterToken);
}
