export interface ValidatorCharacter {
  id: string;
  name: string;
  type: 'system' | 'custom';
  description?: string;
  loraUrl?: string;
  previewImage?: string;
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
