export interface SelectionSet {
  id: number;
  filenames: string[];
}

export interface TrainingVersion {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
  parameters: TrainingParameters;
  status: 'pending' | 'training' | 'completed' | 'failed';
  loraUrl?: string;
  error?: string;
  selectionSetId?: number;
  imageCount?: number;
  completedAt?: string;
  isGood?: boolean;
}

export interface TrainingParameters {
  // Core hyperparameters
  network_dim: number;
  network_alpha: number;
  learning_rate: number;
  max_train_steps: number;
  
  // Optimizer settings
  lr_scheduler: 'cosine_with_restarts' | 'cosine' | 'linear';
  lr_warmup_steps: number;
  optimizer_type: 'adamw8bit' | 'adafactor';
  
  // Dataset settings
  batch_size: number;
  num_repeats: number;
  
  // Advanced
  gradient_dtype: 'bf16' | 'fp16';
  save_every_n_steps: number;
  
  // Trigger token
  class_tokens: string;
}

export interface CurrentTraining {
  jobId: string;
  startTime: number;
  estimatedDuration: number;
  status: 'pending' | 'starting' | 'training' | 'completed' | 'failed';
}

export interface ConsoleLog {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'request' | 'response' | 'warning';
  message: string;
}

export interface S3SyncStatus {
  synced: boolean;
  missingCount: number;
  checking: boolean;
  missingFiles: string[];
  missingCaptions: string[];
}

export interface ValidationIssue {
  type: 'missing_s3' | 'missing_captions' | null;
  missingFiles: string[];
  missingCaptions: string[];
}

export const DEFAULT_PARAMETERS: TrainingParameters = {
  network_dim: 16,
  network_alpha: 16,
  learning_rate: 0.0001,
  max_train_steps: 1000,
  lr_scheduler: 'cosine_with_restarts',
  lr_warmup_steps: 0,
  optimizer_type: 'adamw8bit',
  batch_size: 2,
  num_repeats: 1,
  gradient_dtype: 'bf16',
  save_every_n_steps: 250,
  class_tokens: '',
};
