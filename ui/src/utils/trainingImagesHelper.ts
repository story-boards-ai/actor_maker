/**
 * Helper functions for managing training images per style version
 */

export interface TrainingImageInfo {
  styleId: string;
  styleName: string;
  version: string;
  folderPath: string;
  images: string[];
}

/**
 * Get the folder path for a style's training images
 */
export function getTrainingImagesFolderPath(styleId: string, version: string = '1.0'): string | null {
  // Map style IDs to their resource folders (Version 1.0)
  const v1StyleFolders: Record<string, string> = {
    '1': '1_ink_intensity',
    '16': '16_dynamic_simplicity',
    '5': '5_sweeping_elegance',
    '59': '59_etheral_washes',
    '48': '48_dynamic_scenes',
    '53': '53_city_chronicles',
    '68': '68_everyday_vibes',
    '82': '82_stellar_sketch',
    '91': '91_vibrant_vectorcraft',
    '99': '99_illustrated_detail',
    '100': '100_dark_narrative',
    '101': '101_linear_perspective',
    '102': '102_captive_board',
    '2': '2_vivid_portraiture'
  };

  if (version === '1.0') {
    const folder = v1StyleFolders[styleId];
    return folder ? `/resources/style_images/${folder}` : null;
  }

  // Version 2.0 and beyond will be added here later
  return null;
}

/**
 * Get style folder name from styleId
 */
export function getStyleFolderName(styleId: string): string | null {
  const v1StyleFolders: Record<string, string> = {
    '1': '1_ink_intensity',
    '16': '16_dynamic_simplicity',
    '5': '5_sweeping_elegance',
    '59': '59_etheral_washes',
    '48': '48_dynamic_scenes',
    '53': '53_city_chronicles',
    '68': '68_everyday_vibes',
    '82': '82_stellar_sketch',
    '91': '91_vibrant_vectorcraft',
    '99': '99_illustrated_detail',
    '100': '100_dark_narrative',
    '101': '101_linear_perspective',
    '102': '102_captive_board',
    '2': '2_vivid_portraiture'
  };
  
  return v1StyleFolders[styleId] || null;
}

/**
 * Get training image count from style metadata
 */
export function getTrainingImageCount(styleId: string, version: string = '1.0'): number {
  // This could be read from the styles_registry.json or calculated
  // For now, return 0 as placeholder
  return 0;
}
