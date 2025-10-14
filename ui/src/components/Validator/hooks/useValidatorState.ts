import { useState, useEffect, useMemo } from 'react';
import type { Style } from '../../../types';
import type { AssessmentRating } from '../types/settings-set';
import type { ValidatorCharacter } from '../types/character';

export interface TrainedModel {
  id: string;
  name: string;
  styleId: string;
  styleName: string;
  loraUrl: string;
  timestamp: string;
  parameters?: any;
  imageCount?: number;
  description?: string;
}

export function useValidatorState() {
  // Styles and selection
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [trainedModels, setTrainedModels] = useState<TrainedModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showStyleModal, setShowStyleModal] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  
  // Assessment state
  const [currentRating, setCurrentRating] = useState<AssessmentRating>(null);
  const [currentComment, setCurrentComment] = useState<string>('');
  
  // Filter models by selected style
  const filteredModels = useMemo(() => {
    if (!selectedStyle) return trainedModels;
    return trainedModels.filter(model => model.styleId === selectedStyle);
  }, [trainedModels, selectedStyle]);
  
  // Generation parameters - all editable
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 1000000));
  const [seedLocked, setSeedLocked] = useState<boolean>(false);
  const [steps, setSteps] = useState<number>(20);
  const [cfg, setCfg] = useState<number>(1);
  const [denoise, setDenoise] = useState<number>(1);
  const [guidance, setGuidance] = useState<number>(3.5);
  const [width, setWidth] = useState<number>(1360);
  const [height, setHeight] = useState<number>(768);
  const [samplerName, setSamplerName] = useState<string>('euler');
  const [schedulerName, setSchedulerName] = useState<string>('ddim_uniform');
  
  // Style-specific LoRA weights (from registry)
  const [loraWeight, setLoraWeight] = useState<number>(1.0);
  const [characterLoraWeight, setCharacterLoraWeight] = useState<number>(0.9);
  const [cineLoraWeight, setCineLoraWeight] = useState<number>(0.8);
  
  // Monochrome processing
  const [monochromeContrast, setMonochromeContrast] = useState<number>(1.2);
  const [monochromeBrightness, setMonochromeBrightness] = useState<number>(1.0);
  
  // Prompt padding (from registry, editable per generation)
  const [frontpad, setFrontpad] = useState<string>('');
  const [backpad, setBackpad] = useState<string>('');
  
  // Character and Camera LoRA management
  const [selectedCharacters, setSelectedCharacters] = useState<ValidatorCharacter[]>([]);
  const [useCameraLora, setUseCameraLora] = useState<boolean>(false);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [fullPrompt, setFullPrompt] = useState<string>('');
  const [showPromptPreview, setShowPromptPreview] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);

  // Load styles and trained models on mount
  useEffect(() => {
    loadStyles();
    loadTrainedModels();
  }, []);

  // Reset selected model when style changes
  useEffect(() => {
    if (selectedStyle && filteredModels.length > 0) {
      // Check if current model is still valid for selected style
      const isCurrentModelValid = filteredModels.some(m => m.id === selectedModel);
      if (!isCurrentModelValid) {
        // Auto-select first model for this style
        setSelectedModel(filteredModels[0].id);
        addLog(`🔄 Auto-selected model: ${filteredModels[0].name}`);
      }
    } else if (selectedStyle && filteredModels.length === 0) {
      setSelectedModel('');
      addLog(`⚠️ No trained models for style "${styles.find(s => s.id === selectedStyle)?.title}"`);
    }
  }, [selectedStyle, filteredModels]);

  // Load assessment when model changes
  useEffect(() => {
    if (selectedStyle && selectedModel) {
      loadAssessment(selectedStyle, selectedModel);
    }
  }, [selectedStyle, selectedModel]);

  // Save assessment when rating changes (immediate save)
  useEffect(() => {
    if (selectedStyle && selectedModel) {
      saveAssessment(selectedStyle, selectedModel, currentRating, currentComment);
    }
  }, [currentRating]);

  async function loadAssessment(styleId: string, modelId: string) {
    try {
      const response = await fetch(`/api/assessments/load?styleId=${styleId}&modelId=${modelId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentRating(data.rating);
        setCurrentComment(data.comment || '');
      }
    } catch (error) {
      console.error('Failed to load assessment:', error);
    }
  }

  async function saveAssessment(styleId: string, modelId: string, rating: AssessmentRating, comment: string) {
    try {
      await fetch('/api/assessments/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleId, modelId, rating, comment }),
      });
    } catch (error) {
      console.error('Failed to save assessment:', error);
    }
  }

  async function loadStyles() {
    try {
      const response = await fetch('/api/styles');
      if (!response.ok) throw new Error('Failed to load styles');
      const data = await response.json();
      setStyles(data.styles || []);
      addLog(`✅ Loaded ${data.styles?.length || 0} styles`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load styles';
      setError(errorMsg);
      addLog(`ERROR: ${errorMsg}`);
    }
  }

  async function loadTrainedModels() {
    try {
      const response = await fetch('/api/training/models');
      if (!response.ok) throw new Error('Failed to load trained models');
      const data = await response.json();
      const models = data.models || [];
      setTrainedModels(models);
      
      // Auto-select first model if available and no model selected
      if (models.length > 0 && !selectedModel) {
        setSelectedModel(models[0].id);
      }
      
      addLog(`✅ Loaded ${models.length} trained LoRA models`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load trained models';
      setError(errorMsg);
      addLog(`ERROR: ${errorMsg}`);
    }
  }

  async function reloadStyles() {
    await loadStyles();
  }

  async function reloadModels() {
    await loadTrainedModels();
  }

  function addLog(message: string) {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }

  return {
    // Styles
    styles,
    setStyles,
    selectedStyle,
    setSelectedStyle,
    trainedModels,
    setTrainedModels,
    filteredModels,
    selectedModel,
    setSelectedModel,
    showStyleModal,
    setShowStyleModal,
    prompt,
    setPrompt,
    
    // Assessment
    currentRating,
    setCurrentRating,
    currentComment,
    setCurrentComment,
    
    // Generation parameters
    seed,
    setSeed,
    seedLocked,
    setSeedLocked,
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
    
    // LoRA weights
    loraWeight,
    setLoraWeight,
    characterLoraWeight,
    setCharacterLoraWeight,
    cineLoraWeight,
    setCineLoraWeight,
    
    // Monochrome
    monochromeContrast,
    setMonochromeContrast,
    monochromeBrightness,
    setMonochromeBrightness,
    
    // Prompt padding
    frontpad,
    setFrontpad,
    backpad,
    setBackpad,
    
    // UI state
    loading,
    setLoading,
    error,
    setError,
    generatedImage,
    setGeneratedImage,
    fullPrompt,
    setFullPrompt,
    showPromptPreview,
    setShowPromptPreview,
    showSettingsModal,
    setShowSettingsModal,
    saveStatus,
    setSaveStatus,
    logs,
    setLogs,
    
    // Character and Camera LoRA
    selectedCharacters,
    setSelectedCharacters,
    useCameraLora,
    setUseCameraLora,
    
    // Functions
    addLog,
    reloadStyles,
    reloadModels,
  };
}
