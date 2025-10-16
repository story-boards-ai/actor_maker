import type { Actor } from '../../types';

export interface TrainingDataManagerProps {
  actor: Actor;
  onClose: () => void;
  onSendToImageGen?: (baseImage: string, trainingImage?: string) => void;
}

export interface BaseImage {
  filename: string;
  path: string;
  fs_path: string;
  promptFile: string;
  prompt: string;
  hasPrompt: boolean;
  isSelected: boolean;
  isGenerating: boolean;
  good?: boolean;
}

export interface TrainingImage {
  filename: string;
  path: string;
  baseFilename: string; // Links back to base image
}

export interface ProcessingState {
  isGenerating: boolean;
  progress: { current: number; total: number };
}

export interface GenerationSettings {
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
  loraStrengthModel: number;
  loraStrengthClip: number;
  monochromeContrast: number;
  monochromeBrightness: number;
  frontpad: string;
  backpad: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
