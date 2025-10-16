import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalFiles: number;
    imageFiles: number;
    captionFiles: number;
    emptyCaptions: number;
    missingCaptions: number;
  };
}

/**
 * Validate training data before sending to RunPod
 * Checks that all caption files exist and are not empty
 */
export function validateTrainingData(trainingDataPath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = {
    totalFiles: 0,
    imageFiles: 0,
    captionFiles: 0,
    emptyCaptions: 0,
    missingCaptions: 0
  };

  try {
    if (!fs.existsSync(trainingDataPath)) {
      return {
        valid: false,
        errors: [`Training data directory not found: ${trainingDataPath}`],
        warnings: [],
        stats
      };
    }

    const files = fs.readdirSync(trainingDataPath);
    stats.totalFiles = files.length;

    // Separate images and captions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const imageFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    const captionFiles = files.filter(f => f.endsWith('.txt'));
    
    stats.imageFiles = imageFiles.length;
    stats.captionFiles = captionFiles.length;

    console.log('[Training Validation] Found', stats.imageFiles, 'images and', stats.captionFiles, 'caption files');

    // Check each image has a corresponding caption
    for (const imageFile of imageFiles) {
      const baseName = path.parse(imageFile).name;
      const captionFile = `${baseName}.txt`;
      const captionPath = path.join(trainingDataPath, captionFile);

      if (!fs.existsSync(captionPath)) {
        stats.missingCaptions++;
        errors.push(`Missing caption file for image: ${imageFile}`);
        continue;
      }

      // Check if caption file is empty
      const captionContent = fs.readFileSync(captionPath, 'utf-8').trim();
      
      if (captionContent.length === 0) {
        stats.emptyCaptions++;
        errors.push(`Empty caption file: ${captionFile} (for image: ${imageFile})`);
      } else if (captionContent.length < 3) {
        warnings.push(`Very short caption (${captionContent.length} chars): ${captionFile}`);
      }
    }

    // Check for orphaned caption files (captions without images)
    for (const captionFile of captionFiles) {
      const baseName = path.parse(captionFile).name;
      const hasImage = imageFiles.some(img => path.parse(img).name === baseName);
      
      if (!hasImage) {
        warnings.push(`Caption file without matching image: ${captionFile}`);
      }
    }

    const valid = errors.length === 0;

    if (!valid) {
      console.error('[Training Validation] ❌ Validation failed with', errors.length, 'errors');
    } else if (warnings.length > 0) {
      console.warn('[Training Validation] ⚠️ Validation passed with', warnings.length, 'warnings');
    } else {
      console.log('[Training Validation] ✅ Validation passed');
    }

    return {
      valid,
      errors,
      warnings,
      stats
    };
  } catch (err: any) {
    console.error('[Training Validation] Error during validation:', err);
    return {
      valid: false,
      errors: [`Validation error: ${err.message}`],
      warnings: [],
      stats
    };
  }
}

/**
 * Validate S3 URLs for training data
 * Checks that caption URLs exist for each image URL
 * @param s3Urls - Array of S3 URLs to validate
 * @param requireCaptions - Whether to require captions (default: false for actor training)
 */
export function validateS3TrainingUrls(s3Urls: string[], requireCaptions: boolean = false): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = {
    totalFiles: 0,
    imageFiles: 0,
    captionFiles: 0,
    emptyCaptions: 0,
    missingCaptions: 0
  };

  stats.totalFiles = s3Urls.length;

  // Separate images and captions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
  const imageUrls = s3Urls.filter(url => {
    const ext = path.extname(url).toLowerCase();
    return imageExtensions.includes(ext);
  });
  
  const captionUrls = s3Urls.filter(url => url.endsWith('.txt'));
  
  stats.imageFiles = imageUrls.length;
  stats.captionFiles = captionUrls.length;

  console.log('[S3 Validation] Found', stats.imageFiles, 'images and', stats.captionFiles, 'caption URLs');
  console.log('[S3 Validation] Captions required:', requireCaptions);

  // Check each image has a corresponding caption (only if required)
  if (requireCaptions) {
    for (const imageUrl of imageUrls) {
      const baseName = path.parse(imageUrl).name;
      const captionUrl = imageUrl.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '.txt');
      
      if (!captionUrls.includes(captionUrl)) {
        stats.missingCaptions++;
        errors.push(`Missing caption URL for image: ${path.basename(imageUrl)}`);
      }
    }
  } else {
    // Captions are optional - just count missing ones as warnings
    for (const imageUrl of imageUrls) {
      const baseName = path.parse(imageUrl).name;
      const captionUrl = imageUrl.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '.txt');
      
      if (!captionUrls.includes(captionUrl)) {
        stats.missingCaptions++;
        warnings.push(`Missing caption URL for image: ${path.basename(imageUrl)} (optional)`);
      }
    }
  }

  // Check for orphaned caption URLs
  for (const captionUrl of captionUrls) {
    const baseName = path.parse(captionUrl).name;
    const hasImage = imageUrls.some(url => path.parse(url).name === baseName);
    
    if (!hasImage) {
      warnings.push(`Caption URL without matching image: ${path.basename(captionUrl)}`);
    }
  }

  const valid = errors.length === 0;

  if (!valid) {
    console.error('[S3 Validation] ❌ Validation failed with', errors.length, 'errors');
  } else if (warnings.length > 0) {
    console.warn('[S3 Validation] ⚠️ Validation passed with', warnings.length, 'warnings');
  } else {
    console.log('[S3 Validation] ✅ Validation passed');
  }

  return {
    valid,
    errors,
    warnings,
    stats
  };
}
