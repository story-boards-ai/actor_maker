import type { TrainingParameters } from '../types';

export const calculateRecommendedSteps = (imageCount: number): number => {
  if (imageCount === 0) return 1000;
  return Math.max(500, Math.min(2000, imageCount * 40));
};

export const calculateEstimatedDuration = (steps: number): number => {
  // Estimate training duration (rough: 2-3 minutes per 100 steps)
  const estimatedMinutes = Math.ceil((steps / 100) * 2.5);
  return estimatedMinutes * 60 * 1000;
};

export const autoAdjustParameters = (
  currentParams: TrainingParameters,
  imageCount: number
): TrainingParameters => {
  if (imageCount === 0) {
    throw new Error('Please select a dataset first');
  }

  // Calculate optimal parameters based on image count and training guide recommendations
  const newParams = { ...currentParams };

  // Target: 30-60 steps per image (we use 40 as sweet spot)
  const TARGET_STEPS_PER_IMAGE = 40;
  
  // Num repeats: Always 1 for proper step calculation
  newParams.num_repeats = 1;

  // Calculate total steps: imageCount × target steps per image
  const calculatedSteps = imageCount * TARGET_STEPS_PER_IMAGE;
  newParams.max_train_steps = Math.max(500, Math.min(3500, calculatedSteps));

  // Learning rate based on dataset size
  if (imageCount <= 15) {
    newParams.learning_rate = 0.0001;
  } else if (imageCount <= 30) {
    newParams.learning_rate = 0.0001;
  } else if (imageCount <= 60) {
    newParams.learning_rate = 0.0001;
  } else {
    newParams.learning_rate = 0.0001;
  }

  // Network dimension: 16 for most styles
  newParams.network_dim = 16;
  newParams.network_alpha = 16;

  // Batch size: 2 for VRAM safety
  newParams.batch_size = 2;

  // Checkpoint frequency based on total steps
  if (newParams.max_train_steps >= 2000) {
    newParams.save_every_n_steps = 500;
  } else if (newParams.max_train_steps >= 1000) {
    newParams.save_every_n_steps = 250;
  } else {
    newParams.save_every_n_steps = 100;
  }

  // LR scheduler: cosine_with_restarts is recommended for Flux LoRA
  newParams.lr_scheduler = 'cosine_with_restarts';
  newParams.lr_warmup_steps = 0;

  // Optimizer: adamw8bit is standard
  newParams.optimizer_type = 'adamw8bit';

  // Gradient dtype: bf16 for Flux
  newParams.gradient_dtype = 'bf16';

  return newParams;
};

export const getNextVersionNumber = (versions: Array<{ name: string }>): number => {
  const existingVersionNumbers = versions
    .map(v => {
      const match = v.name.match(/^V(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  
  return existingVersionNumbers.length > 0 
    ? Math.max(...existingVersionNumbers) + 1 
    : 1;
};
