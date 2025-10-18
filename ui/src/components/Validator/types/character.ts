export interface ValidatorCharacter {
  id: string;
  name: string;
  classToken: string;
  type: 'system' | 'custom';
  description?: string;
  loraUrl?: string;
  previewImage?: string;
  customLoraModels?: Array<{
    filename: string;
    version: string;
    s3_url: string;
    s3_accelerated_url: string;
    size_bytes: number;
    size_mb: number;
    md5_hash: string;
    last_modified: string;
    created_date: string;
    format: string;
    good?: boolean;
    assessment?: {
      rating: 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed' | null;
      comment: string;
      updatedAt: string;
    } | null;
  }>;
}

export interface ActorData {
  id: number;
  name: string;
  description: string;
  url: string;
  img?: string;
  age?: string;
  sex?: string;
  ethnicity?: string;
  poster_frames?: {
    accelerated?: {
      webp_md?: string;
      webp_sm?: string;
    };
  };
}
