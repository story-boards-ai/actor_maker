export interface Style {
  id: string;
  client_index: number;
  title: string;
  lora_name: string;
  lora_file: string;
  lora_version: string;
  lora_weight: number;
  character_lora_weight: number;
  cine_lora_weight: number;
  trigger_words: string;
  monochrome: boolean;
  model: string;
  image_path: string;
  frontpad: string;
  backpad: string;
  // Optional generation defaults (can be overridden per style)
  sampler_name?: string;
  scheduler_name?: string;
  cfg?: number;
  guidance?: number;
  denoise?: number;
  steps?: number;
  training_data: {
    source_images_count: number;
    training_images_count: number;
    s3_bucket: string;
    s3_prefix: string;
    last_trained: string | null;
  };
  metadata: {
    created_at: string;
    updated_at: string;
    status: string;
    notes: string;
  };
}

export interface StyleRegistry {
  version: string;
  last_synced: string;
  styles: Style[];
}

export interface Actor {
  id: number;
  img: string;
  age: string;
  sex: string;
  ethnicity: string;
  face_prompt: string;
  name: string;
  image: string;
  outfit: string;
  poster_frames: {
    standard: {
      webp_sm: string;
      webp_md: string;
      webp_lg: string;
      png: string;
    };
    accelerated: {
      webp_sm: string;
      webp_md: string;
      webp_lg: string;
      png: string;
    };
  };
  description: string;
  url: string;
  training_data?: {
    s3_urls: string[];
    local_path: string;
    base_image_path: string;
    count: number;
    synced: boolean;
  };
}
