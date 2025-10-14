export type AssessmentRating = 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed' | null;

export interface SettingsSet {
  id: string;
  name: string;
  styleId: string;
  styleName: string;
  modelId: string;
  modelName: string;
  timestamp: string;
  
  // Assessment
  rating: AssessmentRating;
  comment: string;
  
  // Generation Parameters
  seed: number;
  seedLocked: boolean;
  steps: number;
  cfg: number;
  denoise: number;
  guidance: number;
  width: number;
  height: number;
  samplerName: string;
  schedulerName: string;
  
  // LoRA Weights
  loraWeight: number;
  characterLoraWeight: number;
  cineLoraWeight: number;
  
  // Monochrome
  monochromeContrast: number;
  monochromeBrightness: number;
  
  // Prompt Padding
  frontpad: string;
  backpad: string;
  
  // Optional: Reference image if test was run
  testImageUrl?: string;
  testPrompt?: string;
}

export interface SettingsSetSummary {
  id: string;
  name: string;
  styleId: string;
  styleName: string;
  modelName: string;
  rating: AssessmentRating;
  timestamp: string;
}
