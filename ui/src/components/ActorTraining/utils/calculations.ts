import type { TrainingParameters, TrainingVersion } from "../types";

/**
 * Calculate recommended training steps based on image count
 * Based on FLUX LoRA Training Guide:
 * - 10-15 imgs: 1,200-1,800 steps (target ~1,500)
 * - 20-30 imgs: 1,500-2,500 steps (target ~2,000)
 * - 40-80 imgs: 2,000-3,000 steps (target ~2,500)
 */
export function calculateRecommendedSteps(imageCount: number): number {
  if (imageCount === 0) return 1500;

  // Evidence-based ranges from FLUX training guide
  if (imageCount <= 15) {
    // Small dataset: 1,200-1,800 steps
    return 1500;
  } else if (imageCount <= 30) {
    // Medium dataset: 1,500-2,500 steps
    return 2000;
  } else if (imageCount <= 60) {
    // Large dataset: 2,000-3,000 steps
    return 2500;
  } else {
    // Very large: cap at 3,000 to avoid overfit
    return 3000;
  }
}

/**
 * Calculate optimal parameters based on FLUX LoRA Training Guide
 * Implements evidence-based presets for character LoRAs
 */
export function autoAdjustParameters(
  currentParams: TrainingParameters,
  imageCount: number
): TrainingParameters {
  if (imageCount === 0) {
    throw new Error("Cannot auto-adjust: No training images available");
  }

  const recommendedSteps = calculateRecommendedSteps(imageCount);

  // Evidence-based parameters from FLUX training guide
  let learningRate: number;
  let numRepeats: number;
  let networkDim: number;
  let networkAlpha: number;

  // Guide recommendation: Keep repeats = 1-3, adjust epochs to hit target steps
  // Formula: total_steps = images × repeats × epochs
  // Therefore: epochs = total_steps / (images × repeats)

  // Use rank 16/8 for all presets: consistent identity, smaller file sizes
  // Higher ranks (32/64) give more detail but larger files and overfit risk
  networkDim = 16;
  networkAlpha = 8; // alpha = rank/2

  if (imageCount <= 15) {
    // Preset A: Small datasets, conservative
    // Target: 1,500 steps
    // LR: 2e-4, rank/alpha: 16/8
    // Repeats: 2 (conservative - smoother progression)
    learningRate = 0.0002; // 2e-4 (conservative for small sets)
    numRepeats = 2;
  } else if (imageCount <= 30) {
    // Preset B: Medium datasets, standard
    // Target: 2,000 steps
    // LR: 2.5e-4, rank/alpha: 16/8
    // Repeats: 2 (balanced - standard progression)
    learningRate = 0.00025; // 2.5e-4 (standard)
    numRepeats = 2;
  } else if (imageCount <= 60) {
    // Preset C: Large datasets, gentle
    // Target: 2,500 steps
    // LR: 1.5e-4 to 2e-4, rank/alpha: 16/8
    // Repeats: 1 (minimal - avoid overfit on large sets)
    learningRate = 0.00015; // 1.5e-4 (gentle for larger sets)
    numRepeats = 1;
  } else {
    // Very large dataset (60+ imgs): very gentle to avoid overfit
    // LR: 1e-4, rank/alpha: 16/8
    // Repeats: 1 (minimal - large dataset needs less repetition)
    learningRate = 0.0001; // 1e-4 (very gentle)
    numRepeats = 1;
  }

  // Calculate epochs to hit target steps
  // Formula: epochs = total_steps / (images × repeats)
  const calculatedEpochs = Math.ceil(recommendedSteps / (imageCount * numRepeats));

  return {
    ...currentParams,
    max_train_steps: recommendedSteps,
    learning_rate: learningRate,
    num_repeats: numRepeats,
    network_dim: networkDim,
    network_alpha: networkAlpha,
    // Best practices from guide:
    lr_scheduler: "cosine", // Cosine with warmup preferred over constant
    lr_warmup_steps: Math.floor(recommendedSteps * 0.2), // 20% warmup
    optimizer_type: "adamw8bit", // AdamW 8-bit is standard
    batch_size: 1, // Keep at 1 for VRAM efficiency
    gradient_dtype: "bf16", // BF16 recommended for FLUX
    // Note: Epochs calculated as: recommendedSteps / (imageCount × numRepeats)
    // For 23 images, repeats=2, steps=2000: epochs = 2000/(23×2) ≈ 43 epochs
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
