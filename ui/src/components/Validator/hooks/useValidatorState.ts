import { useState, useEffect, useMemo } from "react";
import type { Style } from "../../../types";
import type { AssessmentRating } from "../types/settings-set";
import type { ValidatorCharacter } from "../types/character";

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
  good?: boolean;
  version?: string;
  isSystem?: boolean;
  assessment?: {
    rating: 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed' | null;
    comment: string;
    updatedAt: string;
  } | null;
}

export function useValidatorState() {
  // Styles and selection
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [trainedModels, setTrainedModels] = useState<TrainedModel[]>([]);
  const [selectedModel, setSelectedModelInternal] = useState<string>("");
  const [showStyleModal, setShowStyleModal] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");

  // Wrapper to log model selection changes
  const setSelectedModel = (modelId: string) => {
    console.log('[Validator] setSelectedModel called:', {
      oldModel: selectedModel,
      newModel: modelId,
      stack: new Error().stack?.split('\n').slice(2, 4).join('\n')
    });
    setSelectedModelInternal(modelId);
  };

  // Assessment state
  const [currentRating, setCurrentRating] = useState<AssessmentRating>(null);
  const [currentComment, setCurrentComment] = useState<string>("");

  // Character and Camera LoRA management
  const [selectedCharacters, setSelectedCharacters] = useState<
    ValidatorCharacter[]
  >([]);
  const [useCameraLora, setUseCameraLora] = useState<boolean>(false);

  // Filter models by selected character - use manifest LoRA models
  const filteredModels = useMemo(() => {
    if (selectedCharacters.length === 0) return trainedModels;
    
    console.log('[Validator] Building models from character manifests:', {
      selectedCharacters: selectedCharacters.map(c => ({ id: c.id, name: c.name }))
    });
    
    // Build models list from character's lora_model and custom_lora_models
    const models: TrainedModel[] = [];
    
    selectedCharacters.forEach((char) => {
      // Add system LoRA model if available
      if (char.loraUrl) {
        models.push({
          id: `${char.id}_system`,
          name: `${char.name} (System LoRA)`,
          styleId: char.id,
          styleName: char.name,
          loraUrl: char.loraUrl,
          timestamp: new Date().toISOString(),
          description: 'System-trained LoRA model'
        });
      }
      
      // Add custom LoRA models if available
      if (char.customLoraModels && char.customLoraModels.length > 0) {
        char.customLoraModels.forEach((customModel: any) => {
          models.push({
            id: `${char.id}_${customModel.version}`,
            name: `${char.name} (${customModel.version})`,
            styleId: char.id,
            styleName: char.name,
            loraUrl: customModel.s3_accelerated_url || customModel.s3_url,
            timestamp: customModel.last_modified || new Date().toISOString(),
            description: `Custom LoRA model - ${customModel.version}`
          });
        });
      }
    });
    
    console.log('[Validator] Built models from manifests:', models.length, 'models');
    return models;
  }, [trainedModels, selectedCharacters]);

  // Generation parameters - all editable
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 1000000));
  const [seedLocked, setSeedLocked] = useState<boolean>(false);
  const [steps, setSteps] = useState<number>(20);
  const [cfg, setCfg] = useState<number>(1);
  const [denoise, setDenoise] = useState<number>(1);
  const [guidance, setGuidance] = useState<number>(3.5);
  const [width, setWidth] = useState<number>(1360);
  const [height, setHeight] = useState<number>(768);
  const [samplerName, setSamplerName] = useState<string>("euler");
  const [schedulerName, setSchedulerName] = useState<string>("ddim_uniform");

  // Style-specific LoRA weights (from registry)
  const [loraWeight, setLoraWeight] = useState<number>(1.0);
  const [characterLoraWeight, setCharacterLoraWeight] = useState<number>(0.9);
  const [cineLoraWeight, setCineLoraWeight] = useState<number>(0.8);

  // Monochrome processing
  const [monochromeContrast, setMonochromeContrast] = useState<number>(1.2);
  const [monochromeBrightness, setMonochromeBrightness] = useState<number>(1.0);

  // Prompt padding (from registry, editable per generation)
  const [frontpad, setFrontpad] = useState<string>("");
  const [backpad, setBackpad] = useState<string>("");

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [fullPrompt, setFullPrompt] = useState<string>("");
  const [showPromptPreview, setShowPromptPreview] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [logs, setLogs] = useState<string[]>([]);

  // Load styles and trained models on mount
  useEffect(() => {
    loadStyles();
    loadTrainedModels();
  }, []);

  // Reset selected model when character changes
  useEffect(() => {
    console.log('[Validator] Character/filteredModels changed:', {
      selectedCharacters: selectedCharacters.length,
      filteredModels: filteredModels.length,
      currentSelectedModel: selectedModel
    });
    
    if (selectedCharacters.length > 0 && filteredModels.length > 0) {
      // Check if current model is still valid for selected character
      const isCurrentModelValid = filteredModels.some(
        (m) => m.id === selectedModel
      );
      console.log('[Validator] Current model valid?', isCurrentModelValid);
      if (!isCurrentModelValid) {
        // Auto-select first model for this character
        console.log('[Validator] Auto-selecting first model:', filteredModels[0].id);
        setSelectedModel(filteredModels[0].id);
        addLog(`🔄 Auto-selected model: ${filteredModels[0].name}`);
      }
    } else if (selectedCharacters.length > 0 && filteredModels.length === 0) {
      setSelectedModel("");
      addLog(
        `⚠️ No trained models for character "${selectedCharacters[0].name}"`
      );
    } else if (selectedCharacters.length === 0) {
      console.log('[Validator] No characters selected, clearing model');
      setSelectedModel("");
    }
  }, [selectedCharacters, filteredModels]);

  // Load assessment when model changes
  useEffect(() => {
    if (selectedStyle && selectedModel) {
      loadAssessment(selectedStyle, selectedModel);
    }
  }, [selectedStyle, selectedModel]);

  // Save assessment when rating changes (immediate save)
  useEffect(() => {
    if (selectedStyle && selectedModel) {
      saveAssessment(
        selectedStyle,
        selectedModel,
        currentRating,
        currentComment
      );
    }
  }, [currentRating]);

  async function loadAssessment(styleId: string, modelId: string) {
    try {
      const response = await fetch(
        `/api/assessments/load?styleId=${styleId}&modelId=${modelId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentRating(data.rating);
        setCurrentComment(data.comment || "");
      }
    } catch (error) {
      console.error("Failed to load assessment:", error);
    }
  }

  async function saveAssessment(
    styleId: string,
    modelId: string,
    rating: AssessmentRating,
    comment: string
  ) {
    try {
      await fetch("/api/assessments/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId, modelId, rating, comment }),
      });
    } catch (error) {
      console.error("Failed to save assessment:", error);
    }
  }

  async function loadStyles() {
    try {
      const response = await fetch("/api/styles");
      if (!response.ok) throw new Error("Failed to load styles");
      const data = await response.json();
      setStyles(data.styles || []);
      addLog(`✅ Loaded ${data.styles?.length || 0} styles`);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load styles";
      setError(errorMsg);
      addLog(`ERROR: ${errorMsg}`);
    }
  }

  async function loadTrainedModels() {
    try {
      const response = await fetch("/api/training/models");
      if (!response.ok) throw new Error("Failed to load trained models");
      const data = await response.json();
      const models = data.models || [];
      setTrainedModels(models);

      // Auto-select first model if available and no model selected
      if (models.length > 0 && !selectedModel) {
        setSelectedModel(models[0].id);
      }

      addLog(`✅ Loaded ${models.length} trained LoRA models`);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load trained models";
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
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
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
