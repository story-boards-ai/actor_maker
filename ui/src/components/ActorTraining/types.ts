export interface TrainingParameters {
  learning_rate: number;
  max_train_steps: number;
  network_dim: number;
  network_alpha: number;
  class_tokens: string;
  batch_size: number;
  num_repeats: number;
  lr_scheduler: string;
  lr_warmup_steps: number;
  optimizer_type: string;
  gradient_dtype: string;
}

export interface TrainingVersion {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
  parameters: TrainingParameters;
  status: "pending" | "training" | "completed" | "failed";
  loraUrl?: string;
  error?: string;
  imageCount: number;
  isGood?: boolean;
}

export interface ConsoleLog {
  timestamp: string;
  type: "info" | "success" | "error" | "warning" | "request" | "response";
  message: string;
}

export interface CurrentTraining {
  jobId: string;
  startTime: number;
  estimatedDuration: number;
  status: "training" | "completed" | "failed" | "pending";
}

export interface ValidationIssue {
  type: "missing_s3" | "missing_captions";
  missingFiles: string[];
  missingCaptions: string[];
}
