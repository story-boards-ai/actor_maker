/**
 * Get a local fallback image path for a style
 * Maps style IDs to local resource images
 */
export function getLocalStyleImage(styleId: string, styleName: string): string | null {
  // Map style IDs to local folder names and first known image
  const styleImageMap: Record<string, string> = {
    '1': '1_ink_intensity/LIFE IN DIFFERENT PLACES_scene_1_shot_1.jpg',
    '16': '16_dynamic_simplicity/preview.jpg',
    '5': '5_sweeping_elegance/preview.jpg',
    '59': '59_etheral_washes/preview.jpg',
    '48': '48_dynamic_scenes/preview.jpg',
    '53': '53_city_chronicles/preview.jpg',
    '68': '68_everyday_vibes/preview.jpg',
    '82': '82_stellar_sketch/preview.jpg',
    '91': '91_vibrant_vectorcraft/preview.jpg',
    '99': '99_illustrated_detail/preview.jpg',
    '100': '100_dark_narrative/preview.jpg',
    '101': '101_linear_perspective/preview.jpg',
    '102': '102_captive_board/preview.jpg',
    '2': '2_vivid_portraiture/preview.jpg'
  };

  const imagePath = styleImageMap[styleId];
  if (!imagePath) {
    return null;
  }

  return `/resources/style_images/${imagePath}`;
}

/**
 * Generate a gradient placeholder based on style name
 */
export function getGradientForStyle(styleName: string): string {
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
  ];

  // Use style name to deterministically pick a gradient
  const hash = styleName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}
