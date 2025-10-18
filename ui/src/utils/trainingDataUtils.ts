export interface TrainingDataInfo {
  count: number;
  hasImage0: boolean;
  hasImage1: boolean;
  hasStylizedImages: boolean;
  hasBaseImage: boolean;
}

/**
 * Fetch training image count for an actor
 */
export async function fetchTrainingImageCount(actorId: number): Promise<number> {
  try {
    const response = await fetch(`/api/actors/${actorId}/training-data`);
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.total_count || 0;
  } catch (error) {
    console.error(`Failed to fetch training count for actor ${actorId}:`, error);
    return 0;
  }
}

/**
 * Fetch detailed training data info for an actor
 */
export async function fetchTrainingDataInfo(actorId: number): Promise<TrainingDataInfo> {
  try {
    const response = await fetch(`/api/actors/${actorId}/training-data`);
    if (!response.ok) {
      return { count: 0, hasImage0: false, hasImage1: false, hasStylizedImages: false, hasBaseImage: false };
    }
    const data = await response.json();
    
    // Check if training images 0 and 1 exist
    // Look for filenames that end with _0.png, _0.jpg, etc. or _1.png, _1.jpg, etc.
    const images = data.training_images || [];
    const hasImage0 = images.some((img: any) => {
      const filename = img.filename || '';
      // Match patterns like: actorname_0.png, actorname_0.jpg, etc.
      return /_(0)\.(png|jpg|jpeg)$/i.test(filename);
    });
    const hasImage1 = images.some((img: any) => {
      const filename = img.filename || '';
      // Match patterns like: actorname_1.png, actorname_1.jpg, etc.
      return /_(1)\.(png|jpg|jpeg)$/i.test(filename);
    });
    
    // Check if any images have stylized/non-photographic prompts
    // Look for keywords in prompt metadata
    const hasStylizedImages = await checkForStylizedImages(actorId);
    
    // Check if base image exists (from manifest)
    const hasBaseImage = data.has_base_image === true;
    
    return {
      count: data.total_count || 0,
      hasImage0,
      hasImage1,
      hasStylizedImages,
      hasBaseImage
    };
  } catch (error) {
    console.error(`Failed to fetch training data info for actor ${actorId}:`, error);
    return { count: 0, hasImage0: false, hasImage1: false, hasStylizedImages: false, hasBaseImage: false };
  }
}

/**
 * Check if actor has stylized (non-photographic) training images
 */
async function checkForStylizedImages(actorId: number): Promise<boolean> {
  try {
    const response = await fetch(`/api/actors/${actorId}/training-data/prompts`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    
    // Keywords that indicate stylized/non-photographic images
    const stylizedKeywords = [
      'painting', 'illustration', 'drawing', 'sketch', 'anime', 'cartoon',
      'manga', 'comic', 'watercolor', 'oil painting', 'acrylic', 'gouache',
      'charcoal', 'pencil', 'ink', 'woodcut', 'linocut', 'etching',
      'digital art', 'concept art', 'stylized', 'cel shaded', '3d render',
      'vector', 'flat illustration', 'graphic novel', 'storyboard style',
      'not photorealistic', 'illustration only'
    ];
    
    // Check prompts for stylized keywords
    const prompts = data.prompts || [];
    return prompts.some((prompt: string) => {
      const lowerPrompt = prompt.toLowerCase();
      return stylizedKeywords.some(keyword => lowerPrompt.includes(keyword));
    });
  } catch (error) {
    console.error(`Failed to check stylized images for actor ${actorId}:`, error);
    return false;
  }
}
