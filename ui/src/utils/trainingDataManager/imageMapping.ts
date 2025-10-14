import type { BaseImage, TrainingImage } from '../../components/TrainingDataManager/types';

/**
 * Creates a map of base images to their corresponding training images
 * @param baseImages - Array of base images
 * @param trainingImages - Array of training images
 * @returns Map where key is base filename (without extension) and value is training image or null
 */
export function createImageMap(
  baseImages: BaseImage[],
  trainingImages: TrainingImage[]
): Map<string, TrainingImage | null> {
  const map = new Map<string, TrainingImage | null>();
  
  baseImages.forEach(base => {
    const basename = base.filename.replace(/\.[^.]+$/, '');
    const training = trainingImages.find(t => t.baseFilename === base.filename);
    map.set(basename, training || null);
  });
  
  return map;
}

/**
 * Gets the base filename without extension
 * @param filename - Full filename with extension
 * @returns Filename without extension
 */
export function getBasename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

/**
 * Parses training images and links them to base images
 * @param trainingData - Raw training data from API
 * @param baseImages - Array of base images with captions
 * @returns Array of parsed training images with baseFilename populated
 */
export function parseTrainingImages(
  trainingData: { images?: any[] },
  baseImages: BaseImage[]
): TrainingImage[] {
  return (trainingData.images || []).map((img: any) => {
    // Extract base filename from training filename
    // e.g., "input_001_training.jpg" -> "input_001.avif" (or whatever the base extension is)
    const baseName = img.filename.replace(/_training\.(jpg|jpeg|png|webp|avif)$/i, '');
    
    // Find matching base image filename (could have different extension)
    const matchingBase = baseImages.find(base => 
      base.filename.startsWith(baseName + '.')
    );
    
    return {
      ...img,
      baseFilename: matchingBase ? matchingBase.filename : baseName
    };
  });
}
