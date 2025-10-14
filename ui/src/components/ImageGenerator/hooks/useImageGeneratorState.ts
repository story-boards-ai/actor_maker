import { useState } from 'react';
import type { Style } from '../../../types';

interface InputImage {
  filename: string;
  path: string;
  hasPrompt: boolean;
}

export interface ImageGeneratorState {
  // Data
  inputImages: InputImage[];
  styles: Style[];
  selectedImage: string;
  selectedStyle: string;
  
  // Prompt
  prompt: string;
  fullPrompt: string;
  promptBreakdown: {
    triggerWords: string;
    frontpad: string;
    prompt: string;
    backpad: string;
  } | null;
  
  // Results
  generatedImage: string | null;
  error: string | null;
  logs: string[];
  
  // UI State
  loading: boolean;
  loadingPrompt: boolean;
  showSettingsModal: boolean;
  showPromptPreview: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  
  // Workflow settings
  seed: number;
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
}

export function useImageGeneratorState() {
  const [inputImages, setInputImages] = useState<InputImage[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [loadingPrompt, setLoadingCaption] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savingTrainingImage, setSavingTrainingImage] = useState(false);
  const [fullPrompt, setFullPrompt] = useState<string>('');
  const [promptBreakdown, setPromptBreakdown] = useState<{
    triggerWords: string;
    frontpad: string;
    prompt: string;
    backpad: string;
  } | null>(null);
  
  // Workflow settings
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [seedLocked, setSeedLocked] = useState(false);
  const [steps, setSteps] = useState(20);
  const [cfg, setCfg] = useState(1);
  const [denoise, setDenoise] = useState(1);
  const [guidance, setGuidance] = useState(3.5);
  const [width, setWidth] = useState(1360);
  const [height, setHeight] = useState(768);
  const [samplerName, setSamplerName] = useState('euler');
  const [schedulerName, setSchedulerName] = useState('ddim_uniform');
  const [loraStrengthModel, setLoraStrengthModel] = useState(1.0);
  const [loraStrengthClip, setLoraStrengthClip] = useState(1.0);
  const [monochromeContrast, setMonochromeContrast] = useState(1.2);
  const [monochromeBrightness, setMonochromeBrightness] = useState(1.0);
  
  // Style prompts (frontpad/backpad)
  const [frontpad, setFrontpad] = useState<string>('');
  const [backpad, setBackpad] = useState<string>('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[ImageGen] ${message}`);
  };

  return {
    // State
    inputImages,
    setInputImages,
    styles,
    setStyles,
    selectedImage,
    setSelectedImage,
    selectedStyle,
    setSelectedStyle,
    prompt,
    setPrompt,
    loadingPrompt,
    setLoadingCaption,
    loading,
    setLoading,
    generatedImage,
    setGeneratedImage,
    error,
    setError,
    logs,
    setLogs,
    showSettingsModal,
    setShowSettingsModal,
    showPromptPreview,
    setShowPromptPreview,
    saveStatus,
    setSaveStatus,
    savingTrainingImage,
    setSavingTrainingImage,
    fullPrompt,
    setFullPrompt,
    promptBreakdown,
    setPromptBreakdown,
    
    // Settings
    seed,
    setSeed,
    steps,
    setSteps,
    cfg,
    setCfg,
    denoise,
    setDenoise,
    guidance,
    setGuidance,
    width,
    setWidth,
    height,
    setHeight,
    samplerName,
    setSamplerName,
    schedulerName,
    setSchedulerName,
    loraStrengthModel,
    setLoraStrengthModel,
    loraStrengthClip,
    setLoraStrengthClip,
    seedLocked,
    setSeedLocked,
    monochromeContrast,
    setMonochromeContrast,
    monochromeBrightness,
    setMonochromeBrightness,
    
    // Style prompts
    frontpad,
    setFrontpad,
    backpad,
    setBackpad,
    
    // Helpers
    addLog,
  };
}
