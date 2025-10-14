import { useImageGeneratorState } from "./hooks/useImageGeneratorState";
import { useImageData } from "./hooks/useImageData";
import { useSettings } from "./hooks/useSettings";
import { usePromptBuilder } from "./hooks/usePromptBuilder";
import { useImageGeneration } from "./hooks/useImageGeneration";
import { SettingsModalRedesigned } from "./components/SettingsModalRedesigned";
import { ImageComparison } from "./components/ImageComparison";
import { useEffect } from "react";
import type { Style } from "../../types";
import "./ImageGenerator.css";
import { ControlPanel } from "./components/ControlPanel";
import { eventBus, EVENT_TYPES, type TrainingImageSavedEvent } from "../../utils/eventBus";

interface ImageGeneratorProps {
  pendingLoad?: {
    image: string;
    style: Style;
  } | null;
  onLoadComplete?: () => void;
}

export function ImageGenerator({
  pendingLoad,
  onLoadComplete,
}: ImageGeneratorProps = {}) {
  const state = useImageGeneratorState();

  // Load data
  const { loadStyles } = useImageData({
    setInputImages: state.setInputImages,
    setStyles: state.setStyles,
    setError: state.setError,
    addLog: state.addLog,
  });

  // Handle pending load from Training Data Manager
  useEffect(() => {
    if (
      pendingLoad &&
      state.inputImages.length > 0 &&
      state.styles.length > 0
    ) {
      console.log('[ImageGen] Pending load received:', {
        image: pendingLoad.image,
        style: pendingLoad.style.title,
        availableImages: state.inputImages.map(img => img.path),
      });
      
      // Check if the image exists in the loaded images
      const imageExists = state.inputImages.some(img => img.path === pendingLoad.image);
      if (!imageExists) {
        state.addLog(`⚠️ Warning: Image ${pendingLoad.image} not found in loaded images`);
        console.warn('[ImageGen] Image not found:', pendingLoad.image);
      }
      
      // Set the selected image and style
      state.setSelectedImage(pendingLoad.image);
      state.setSelectedStyle(pendingLoad.style.id);
      state.addLog(
        `Loaded from Training Data: ${pendingLoad.image
          .split("/")
          .pop()} with ${pendingLoad.style.title}`
      );

      // Clear the pending load
      onLoadComplete?.();
    }
  }, [pendingLoad, state.inputImages.length, state.styles.length]);

  // Settings management
  const { loadSettings, saveSettings, resetSettings } = useSettings({
    state: {
      seed: state.seed,
      seedLocked: state.seedLocked,
      steps: state.steps,
      cfg: state.cfg,
      denoise: state.denoise,
      guidance: state.guidance,
      width: state.width,
      height: state.height,
      samplerName: state.samplerName,
      schedulerName: state.schedulerName,
      loraStrengthModel: state.loraStrengthModel,
      loraStrengthClip: state.loraStrengthClip,
      monochromeContrast: state.monochromeContrast,
      monochromeBrightness: state.monochromeBrightness,
      frontpad: state.frontpad,
      backpad: state.backpad,
    },
    selectedStyle: state.selectedStyle,
    styles: state.styles,
    setters: {
      setSeed: state.setSeed,
      setSeedLocked: state.setSeedLocked,
      setSteps: state.setSteps,
      setCfg: state.setCfg,
      setDenoise: state.setDenoise,
      setGuidance: state.setGuidance,
      setWidth: state.setWidth,
      setHeight: state.setHeight,
      setSamplerName: state.setSamplerName,
      setSchedulerName: state.setSchedulerName,
      setLoraStrengthModel: state.setLoraStrengthModel,
      setLoraStrengthClip: state.setLoraStrengthClip,
      setMonochromeContrast: state.setMonochromeContrast,
      setMonochromeBrightness: state.setMonochromeBrightness,
      setFrontpad: state.setFrontpad,
      setBackpad: state.setBackpad,
      setSaveStatus: state.setSaveStatus,
    },
    addLog: state.addLog,
    reloadStyles: loadStyles,
  });

  // Prompt building
  usePromptBuilder({
    selectedImage: state.selectedImage,
    selectedStyle: state.selectedStyle,
    prompt: state.prompt,
    frontpad: state.frontpad,
    backpad: state.backpad,
    styles: state.styles,
    setPrompt: state.setPrompt,
    setLoadingCaption: state.setLoadingCaption,
    setFullPrompt: state.setFullPrompt,
    setPromptBreakdown: state.setPromptBreakdown,
    setLoraStrengthModel: state.setLoraStrengthModel,
    setLoraStrengthClip: state.setLoraStrengthClip,
    addLog: state.addLog,
  });

  // Image generation
  const { generateImage } = useImageGeneration({
    selectedImage: state.selectedImage,
    selectedStyle: state.selectedStyle,
    prompt: state.prompt,
    inputImages: state.inputImages,
    styles: state.styles,
    seed: state.seed,
    seedLocked: state.seedLocked,
    setSeed: state.setSeed,
    steps: state.steps,
    cfg: state.cfg,
    denoise: state.denoise,
    guidance: state.guidance,
    width: state.width,
    height: state.height,
    samplerName: state.samplerName,
    schedulerName: state.schedulerName,
    loraStrengthModel: state.loraStrengthModel,
    loraStrengthClip: state.loraStrengthClip,
    monochromeContrast: state.monochromeContrast,
    monochromeBrightness: state.monochromeBrightness,
    setLoading: state.setLoading,
    setError: state.setError,
    setGeneratedImage: state.setGeneratedImage,
    setFullPrompt: state.setFullPrompt,
    setPromptBreakdown: state.setPromptBreakdown,
    addLog: state.addLog,
  });

  const handleResetLoraToDefault = () => {
    const styleData = state.styles.find(s => s.id === state.selectedStyle);
    if (styleData) {
      const defaultLoraWeight = styleData.lora_weight || 1.0;
      state.setLoraStrengthModel(defaultLoraWeight);
      state.setLoraStrengthClip(defaultLoraWeight);
      state.addLog(`↺ LoRA strengths reset to style default: ${defaultLoraWeight}`);
    }
  };

  const handleSaveAsTrainingImage = async () => {
    if (!state.generatedImage || !state.selectedImage || !state.selectedStyle) {
      state.addLog('ERROR: Missing required data to save training image');
      return;
    }

    try {
      state.setSavingTrainingImage(true);
      state.addLog('💾 Saving generated image as training image...');

      // Extract filename from selected image path
      const imageData = state.inputImages.find(
        (img) => img.path === state.selectedImage || img.filename === state.selectedImage
      );
      
      if (!imageData) {
        throw new Error('Source image not found');
      }

      const styleData = state.styles.find((s) => s.id === state.selectedStyle);
      if (!styleData) {
        throw new Error('Style not found');
      }

      console.log('[SaveTraining] Sending request:', {
        styleId: styleData.id,
        baseImageFilename: imageData.filename,
        generatedImageUrl: state.generatedImage?.substring(0, 100) + '...',
      });

      const response = await fetch('/api/training-data/save-generated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId: styleData.id,
          baseImageFilename: imageData.filename,
          generatedImageUrl: state.generatedImage,
        }),
      });

      console.log('[SaveTraining] Response status:', response.status);

      if (!response.ok) {
        const responseText = await response.text();
        console.error('[SaveTraining] Error response:', responseText);
        let errorMsg = `Failed to save: HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          errorMsg = `${errorMsg} - ${responseText.substring(0, 200)}`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      state.addLog(`✅ Training image saved: ${result.filename}`);
      state.addLog(`   Saved to: ${result.path}`);
      
      // Emit event to notify other components (like TrainingDataManager)
      const eventData: TrainingImageSavedEvent = {
        styleId: styleData.id,
        baseImageFilename: imageData.filename,
        trainingImagePath: result.path,
      };
      eventBus.emit(EVENT_TYPES.TRAINING_IMAGE_SAVED, eventData);
      console.log('[ImageGen] Emitted training image saved event:', eventData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save training image';
      state.addLog(`ERROR: ${errorMsg}`);
      state.setError(errorMsg);
    } finally {
      state.setSavingTrainingImage(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(state.fullPrompt);
    state.addLog("✅ Prompt copied");
  };

  return (
    <div className="image-generator">
      <div className="generator-header">
        <h2>Image-to-Image Generator</h2>
        <p className="generator-subtitle">
          Transform input images with style LoRAs
        </p>
      </div>

      <div className="generator-content">
        <ControlPanel
          inputImages={state.inputImages}
          styles={state.styles}
          selectedImage={state.selectedImage}
          selectedStyle={state.selectedStyle}
          prompt={state.prompt}
          loading={state.loading}
          loadingPrompt={state.loadingPrompt}
          fullPrompt={state.fullPrompt}
          promptBreakdown={state.promptBreakdown}
          showPromptPreview={state.showPromptPreview}
          logs={state.logs}
          onSelectImage={state.setSelectedImage}
          onSelectStyle={state.setSelectedStyle}
          onPromptChange={state.setPrompt}
          onTogglePromptPreview={() =>
            state.setShowPromptPreview(!state.showPromptPreview)
          }
          onCopyPrompt={handleCopyPrompt}
          onOpenSettings={() => state.setShowSettingsModal(true)}
          onClearLogs={() => state.setLogs([])}
        />

        <ImageComparison
          selectedImage={state.selectedImage}
          selectedStyle={state.selectedStyle}
          inputImages={state.inputImages}
          styles={state.styles}
          generatedImage={state.generatedImage}
          loading={state.loading}
          error={state.error}
          monochromeContrast={state.monochromeContrast}
          monochromeBrightness={state.monochromeBrightness}
          onGenerate={generateImage}
          onSaveAsTrainingImage={handleSaveAsTrainingImage}
          savingTrainingImage={state.savingTrainingImage}
        />
      </div>

      <SettingsModalRedesigned
        show={state.showSettingsModal}
        selectedStyle={state.selectedStyle}
        styles={state.styles}
        seed={state.seed}
        seedLocked={state.seedLocked}
        steps={state.steps}
        cfg={state.cfg}
        denoise={state.denoise}
        guidance={state.guidance}
        width={state.width}
        height={state.height}
        samplerName={state.samplerName}
        schedulerName={state.schedulerName}
        loraStrengthModel={state.loraStrengthModel}
        loraStrengthClip={state.loraStrengthClip}
        monochromeContrast={state.monochromeContrast}
        monochromeBrightness={state.monochromeBrightness}
        frontpad={state.frontpad}
        backpad={state.backpad}
        saveStatus={state.saveStatus}
        loading={state.loading}
        onOpen={async () => {
          // Reload settings when opening modal to ensure latest saved values
          await loadSettings();
        }}
        onClose={async () => {
          // Auto-save settings when closing modal
          await saveSettings();
          state.setShowSettingsModal(false);
        }}
        onSave={saveSettings}
        onReset={resetSettings}
        onResetLoraToDefault={handleResetLoraToDefault}
        onRandomizeSeed={() =>
          state.setSeed(Math.floor(Math.random() * 1000000))
        }
        setSeed={state.setSeed}
        setSeedLocked={state.setSeedLocked}
        setSteps={state.setSteps}
        setCfg={state.setCfg}
        setDenoise={state.setDenoise}
        setGuidance={state.setGuidance}
        setWidth={state.setWidth}
        setHeight={state.setHeight}
        setSamplerName={state.setSamplerName}
        setSchedulerName={state.setSchedulerName}
        setLoraStrengthModel={state.setLoraStrengthModel}
        setLoraStrengthClip={state.setLoraStrengthClip}
        setMonochromeContrast={state.setMonochromeContrast}
        setMonochromeBrightness={state.setMonochromeBrightness}
        setFrontpad={state.setFrontpad}
        setBackpad={state.setBackpad}
      />
    </div>
  );
}
