/**
 * List of color-related words to remove from prompts when using monochrome styles
 */
const COLOR_KEYWORDS = [
  // Basic colors
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
  'violet', 'indigo', 'cyan', 'magenta', 'turquoise', 'teal', 'lime',
  'maroon', 'navy', 'olive', 'aqua', 'fuchsia', 'coral', 'salmon',
  'crimson', 'scarlet', 'burgundy', 'beige', 'tan', 'gold', 'golden',
  'silver', 'bronze', 'copper', 'amber', 'emerald', 'ruby', 'sapphire',
  'rose', 'lavender', 'mint', 'peach', 'plum', 'cream', 'ivory',
  
  // Shades and variations
  'light', 'dark', 'bright', 'pale', 'deep', 'vivid', 'vibrant',
  'pastel', 'neon', 'fluorescent', 'metallic', 'glossy',
  
  // Descriptive color terms
  'colored', 'coloured', 'colorful', 'colourful', 'multicolored',
  'rainbow', 'chromatic', 'hued', 'tinted', 'dyed', 'painted',
  
  // Color-related adjectives (with common suffixes)
  'reddish', 'bluish', 'greenish', 'yellowish', 'orangish', 'purplish',
  'pinkish', 'brownish', 'grayish', 'greyish',
  
  // Warm/cool tones
  'warm tones', 'cool tones', 'warm colors', 'cool colors',
  'earth tones', 'jewel tones',
  
  // Color palettes
  'color palette', 'colour palette', 'color scheme', 'colour scheme',
  'color grading', 'colour grading'
];

/**
 * Removes color references from text for monochrome styles
 * @param text - The input text (prompt, prompt, etc.)
 * @returns Text with color references removed
 */
export function stripColorReferences(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  // Create regex patterns for each color keyword
  // Use word boundaries to avoid partial matches
  COLOR_KEYWORDS.forEach(keyword => {
    // Case-insensitive match with word boundaries
    const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
    result = result.replace(pattern, '');
  });
  
  // Clean up multiple spaces, commas, and extra punctuation
  result = result
    .replace(/\s+,/g, ',')           // Remove spaces before commas
    .replace(/,\s*,/g, ',')          // Remove duplicate commas
    .replace(/,\s+/g, ', ')          // Normalize comma spacing
    .replace(/\s{2,}/g, ' ')         // Remove multiple spaces
    .replace(/^\s*,\s*/g, '')        // Remove leading comma
    .replace(/\s*,\s*$/g, '')        // Remove trailing comma
    .replace(/^[\s,]+|[\s,]+$/g, '') // Trim spaces and commas
    .trim();
  
  return result;
}

/**
 * Checks if a style is monochrome
 * @param style - The style object
 * @returns True if the style is monochrome
 */
export function isMonochromeStyle(style: { monochrome?: boolean }): boolean {
  return style.monochrome === true;
}
