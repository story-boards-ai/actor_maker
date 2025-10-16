import type { TrainingParameters, TrainingVersion } from "../types";

/**
 * Calculate recommended training steps based on image count
 * For actors: Higher steps per image for better identity preservation
 */
export function calculateRecommendedSteps(imageCount: number): number {
  if (imageCount === 0) return 2000;

  // For actors: 100-150 steps per image (vs 40-60 for styles)
  // Minimum 1000, maximum 3000
  const stepsPerImage = 100;
  const calculated = imageCount * stepsPerImage;

  return Math.max(1000, Math.min(3000, calculated));
}

/**
 * Auto-adjust all parameters based on image count
 * Optimized for actor/face training
 */
export function autoAdjustParameters(
  currentParams: TrainingParameters,
  imageCount: number
): TrainingParameters {
  if (imageCount === 0) {
    throw new Error("Cannot auto-adjust: No training images available");
  }

  const recommendedSteps = calculateRecommendedSteps(imageCount);

  // Actor-specific adjustments
  let learningRate = 0.0004;
  let numRepeats = 10;

  // Adjust based on dataset size
  if (imageCount < 10) {
    // Very small dataset: higher repeats, lower LR
    numRepeats = 15;
    learningRate = 0.0003;
  } else if (imageCount < 20) {
    // Small dataset: moderate repeats
    numRepeats = 12;
    learningRate = 0.0004;
  } else if (imageCount < 40) {
    // Medium dataset: standard settings
    numRepeats = 10;
    learningRate = 0.0004;
  } else {
    // Large dataset: fewer repeats, higher LR
    numRepeats = 8;
    learningRate = 0.0005;
  }

  return {
    ...currentParams,
    max_train_steps: recommendedSteps,
    learning_rate: learningRate,
    num_repeats: numRepeats,
    // Actor-specific: smaller network for focused identity learning
    network_dim: 8,
    network_alpha: 8,
  };
}

/**
 * Calculate estimated training duration in milliseconds
 * Actors typically take longer due to higher steps
 */
export function calculateEstimatedDuration(steps: number): number {
  // Rough estimate: ~1.5 seconds per step for actor training
  const secondsPerStep = 1.5;
  const totalSeconds = steps * secondsPerStep;

  // Add 2 minute overhead for setup/download
  const overheadSeconds = 120;

  return (totalSeconds + overheadSeconds) * 1000;
}

/**
 * Get the next version number for a new training
 */
export function getNextVersionNumber(versions: TrainingVersion[]): number {
  if (versions.length === 0) return 1;

  // Extract version numbers from names (e.g., "V1" -> 1)
  const versionNumbers = versions
    .map((v) => {
      const match = v.name.match(/V(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  if (versionNumbers.length === 0) return 1;

  return Math.max(...versionNumbers) + 1;
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}
