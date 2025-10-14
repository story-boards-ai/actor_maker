import { useEffect, useState, useMemo } from 'react';
import type { Style } from '../types';
import { stripColorReferences, isMonochromeStyle } from '../utils/promptUtils';
import { SettingsModalRedesigned } from './ImageGenerator/components/SettingsModalRedesigned';
import './TrainingDataManager.css';
import { eventBus, EVENT_TYPES, type TrainingImageSavedEvent, type TrainingImageDeletedEvent, type TrainingImagesGeneratedEvent } from '../utils/eventBus';

interface TrainingDataManagerProps {
  style: Style;
  onClose: () => void;
  onSendToImageGen?: (baseImage: string, trainingImage?: string) => void;
}

interface BaseImage {
  filename: string;
  path: string;
  fs_path: string;
  promptFile: string;
  prompt: string;
  hasPrompt: boolean;
  isSelected: boolean;
  isGenerating: boolean;
}

interface TrainingImage {
  filename: string;
  path: string;
  baseFilename: string; // Links back to base image
}

interface ProcessingState {
  isGenerating: boolean;
  progress: { current: number; total: number };
}

export function TrainingDataManager({ style, onClose, onSendToImageGen }: TrainingDataManagerProps) {
  const [baseImages, setBaseImages] = useState<BaseImage[]>([]);
  const [trainingImages, setTrainingImages] = useState<TrainingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  
  // Processing state
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isGenerating: false,
    progress: { current: 0, total: 0 }
  });
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Settings state - Initialize with style defaults or global defaults
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [seedLocked, setSeedLocked] = useState(false);
  const [steps, setSteps] = useState(style.steps ?? 20);
  const [cfg, setCfg] = useState(style.cfg ?? 1);
  const [denoise, setDenoise] = useState(style.denoise ?? 0.8);
  const [guidance, setGuidance] = useState(style.guidance ?? 3.5);
  const [width, setWidth] = useState(1360);
  const [height, setHeight] = useState(768);
  const [samplerName, setSamplerName] = useState(style.sampler_name ?? 'euler');
  const [schedulerName, setSchedulerName] = useState(style.scheduler_name ?? 'ddim_uniform');
  const [loraStrengthModel, setLoraStrengthModel] = useState(style.lora_weight || 1.0);
  const [loraStrengthClip, setLoraStrengthClip] = useState(style.lora_weight || 1.0);
  const [monochromeContrast, setMonochromeContrast] = useState(1.2);
  const [monochromeBrightness, setMonochromeBrightness] = useState(1.0);
  const [frontpad, setFrontpad] = useState(style.frontpad || '');
  const [backpad, setBackpad] = useState(style.backpad || '');

  // Load workflow template
  const [workflow, setWorkflow] = useState<any>(null);

  useEffect(() => {
    loadData(true); // Initial load
    loadWorkflow();
    loadSettings();
    
    // Listen for training image events from other components
    const unsubscribeSaved = eventBus.on(
      EVENT_TYPES.TRAINING_IMAGE_SAVED,
      (data: TrainingImageSavedEvent) => {
        // Only refresh if this is the same style
        if (data.styleId === style.id) {
          console.log('[TrainingDataManager] Training image saved event received, refreshing...');
          loadData(); // Refresh without showing loading screen
        }
      }
    );
    
    const unsubscribeDeleted = eventBus.on(
      EVENT_TYPES.TRAINING_IMAGE_DELETED,
      (data: TrainingImageDeletedEvent) => {
        if (data.styleId === style.id) {
          console.log('[TrainingDataManager] Training image deleted event received, refreshing...');
          loadData();
        }
      }
    );
    
    const unsubscribeGenerated = eventBus.on(
      EVENT_TYPES.TRAINING_IMAGES_GENERATED,
      (data: TrainingImagesGeneratedEvent) => {
        if (data.styleId === style.id) {
          console.log('[TrainingDataManager] Training images generated event received, refreshing...');
          loadData();
        }
      }
    );
    
    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeSaved();
      unsubscribeDeleted();
      unsubscribeGenerated();
    };
  }, [style.id]);

  async function loadWorkflow() {
    try {
      const response = await fetch('/workflows/img2img_workflow.json');
      if (!response.ok) throw new Error('Failed to load workflow');
      const data = await response.json();
      setWorkflow(data);
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
  }

  async function loadSettings() {
    try {
      const response = await fetch(`/api/settings/load?styleId=${style.id}`);
      if (response.ok) {
        const savedSettings = await response.json();
        // Priority: Saved settings > Style defaults > Current state (initialized with style defaults)
        setSeed(savedSettings.seed ?? seed);
        setSteps(savedSettings.steps ?? steps);
        setCfg(savedSettings.cfg ?? cfg);
        setDenoise(savedSettings.denoise ?? denoise);
        setGuidance(savedSettings.guidance ?? guidance);
        setWidth(savedSettings.width ?? width);
        setHeight(savedSettings.height ?? height);
        setSamplerName(savedSettings.samplerName ?? samplerName);
        setSchedulerName(savedSettings.schedulerName ?? schedulerName);
        setLoraStrengthModel(savedSettings.loraStrengthModel ?? style.lora_weight ?? loraStrengthModel);
        setLoraStrengthClip(savedSettings.loraStrengthClip ?? style.lora_weight ?? loraStrengthClip);
        setSeedLocked(savedSettings.seedLocked ?? false);
        setMonochromeContrast(savedSettings.monochromeContrast ?? monochromeContrast);
        setMonochromeBrightness(savedSettings.monochromeBrightness ?? monochromeBrightness);
        console.log('✅ Loaded saved settings for style:', style.id);
      } else {
        console.log('ℹ️ No saved settings found, using style defaults');
      }
    } catch (err) {
      console.warn('⚠️ Could not load saved settings, using style defaults');
    }
  }

  async function saveSettings() {
    try {
      setSaveStatus('saving');
      
      const settingsToSave = {
        seed,
        seedLocked,
        steps,
        cfg,
        denoise,
        guidance,
        width,
        height,
        samplerName,
        schedulerName,
        loraStrengthModel,
        loraStrengthClip,
        monochromeContrast,
        monochromeBrightness,
        styleId: style.id
      };

      const response = await fetch(`/api/settings/save?styleId=${style.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave)
      });

      if (response.ok) {
        console.log('✅ Settings saved for style:', style.id);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      console.error('❌ Failed to save settings:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }

  function resetSettings() {
    setSeed(Math.floor(Math.random() * 1000000));
    // Reset to style defaults, or global defaults if not specified
    setSteps(style.steps ?? 20);
    setCfg(style.cfg ?? 1);
    setDenoise(style.denoise ?? 0.8);
    setGuidance(style.guidance ?? 3.5);
    setWidth(1360);
    setHeight(768);
    setSamplerName(style.sampler_name ?? 'euler');
    setSchedulerName(style.scheduler_name ?? 'ddim_uniform');
    setLoraStrengthModel(style.lora_weight || 1.0);
    setLoraStrengthClip(style.lora_weight || 1.0);
    setMonochromeContrast(1.2);
    setMonochromeBrightness(1.0);
    setSeedLocked(false);
    console.log('↺ Settings reset to style defaults');
  }

  function resetLoraToDefault() {
    setLoraStrengthModel(style.lora_weight || 1.0);
    setLoraStrengthClip(style.lora_weight || 1.0);
    console.log('↺ LoRA strengths reset to style default:', style.lora_weight);
  }

  function randomizeSeed() {
    setSeed(Math.floor(Math.random() * 1000000));
  }

  async function loadData(isInitialLoad = false) {
    try {
      // Only show loading state on initial load, not on refreshes
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      // Load base images (V2 - input images)
      const baseResponse = await fetch(`/api/styles/${style.id}/training-images?version=v2`);
      if (!baseResponse.ok) throw new Error('Failed to load base images');
      const baseData = await baseResponse.json();

      // Load existing training images (V1 - generated training images)
      const trainingResponse = await fetch(`/api/styles/${style.id}/training-images?version=v1`);
      const trainingData = trainingResponse.ok ? await trainingResponse.json() : { images: [] };
      
      console.log('📦 Training images data loaded:', {
        count: trainingData.images?.length || 0,
        images: trainingData.images || [],
        samplePaths: trainingData.images?.slice(0, 3).map((img: any) => img.path) || []
      });

      // Load captions for base images
      const baseImagesWithCaptions = await Promise.all(
        (baseData.images || []).map(async (img: any) => {
          let prompt = '';
          if (img.hasPrompt) {
            try {
              const captionResponse = await fetch(`/api/prompt/read/${img.promptFile}`);
              const captionData = await captionResponse.json();
              prompt = captionData.prompt || '';
            } catch (err) {
              console.error(`Failed to load prompt for ${img.filename}:`, err);
            }
          }

          // Convert web path to filesystem path for Python processing
          // Python script runs from project root, so path should be relative to that
          const fs_path = img.path.replace('/resources/', 'resources/');

          return {
            ...img,
            fs_path,
            prompt,
            isSelected: false,
            isGenerating: false
          };
        })
      );

      setBaseImages(baseImagesWithCaptions);
      
      // Parse training images and link to base images
      const parsedTrainingImages = (trainingData.images || []).map((img: any) => {
        // Extract base filename from training filename
        // e.g., "input_001_training.jpg" -> "input_001.avif" (or whatever the base extension is)
        // First, remove "_training" and the extension to get just the base name
        const baseName = img.filename.replace(/_training\.(jpg|jpeg|png|webp|avif)$/i, '');
        
        // Find matching base image filename (could have different extension)
        const matchingBase = baseImagesWithCaptions.find(base => 
          base.filename.startsWith(baseName + '.')
        );
        
        return {
          ...img,
          baseFilename: matchingBase ? matchingBase.filename : baseName
        };
      });
      
      setTrainingImages(parsedTrainingImages);
      
      // Always increment refresh key to force image reload (cache bust)
      setImageRefreshKey(prev => prev + 1);

    } catch (err) {
      console.error('Error loading training data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load training data');
    } finally {
      // Only clear loading state if this was the initial load
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }

  // Map training images to their base images
  const imageMap = useMemo(() => {
    const map = new Map<string, TrainingImage | null>();
    
    baseImages.forEach(base => {
      const basename = base.filename.replace(/\.[^.]+$/, '');
      const training = trainingImages.find(t => t.baseFilename === base.filename);
      map.set(basename, training || null);
    });
    
    return map;
  }, [baseImages, trainingImages]);

  function toggleSelection(index: number) {
    setBaseImages(prev => prev.map((img, i) => 
      i === index ? { ...img, isSelected: !img.isSelected } : img
    ));
  }

  function selectAll() {
    setBaseImages(prev => prev.map(img => ({ ...img, isSelected: true })));
  }

  function deselectAll() {
    setBaseImages(prev => prev.map(img => ({ ...img, isSelected: false })));
  }

  function selectMissing() {
    setBaseImages(prev => prev.map(img => {
      const basename = img.filename.replace(/\.[^.]+$/, '');
      const hasTraining = imageMap.get(basename) !== null;
      return { ...img, isSelected: !hasTraining };
    }));
  }

  async function generateSelected() {
    const selected = baseImages.filter(img => img.isSelected);
    if (selected.length === 0) {
      console.warn('⚠️ No base images selected');
      return;
    }

    await generateBatch(selected);
  }

  async function generateMissing() {
    const missing = baseImages.filter(img => {
      const basename = img.filename.replace(/\.[^.]+$/, '');
      return imageMap.get(basename) === null;
    });

    if (missing.length === 0) {
      console.log('✅ All base images have training images');
      return;
    }

    await generateBatch(missing);
  }

  function abortGeneration() {
    if (abortController) {
      console.log('🛑 Aborting training data generation...');
      abortController.abort();
      setAbortController(null);
      setProcessingState({
        isGenerating: false,
        progress: { current: 0, total: 0 }
      });
    }
  }

  async function generateBatch(images: BaseImage[]) {
    if (!workflow) {
      console.error('❌ Workflow not loaded');
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setProcessingState({
      isGenerating: true,
      progress: { current: 0, total: images.length }
    });

    // Mark selected images as generating
    const imageFilenames = images.map(img => img.filename);
    setBaseImages(prev => prev.map(img => 
      imageFilenames.includes(img.filename) 
        ? { ...img, isGenerating: true }
        : img
    ));

    try {
      // Randomize seed if not locked
      let currentSeed = seed;
      if (!seedLocked) {
        currentSeed = Math.floor(Math.random() * 1000000);
        setSeed(currentSeed);
        console.log(`🎲 Random seed: ${currentSeed}`);
      } else {
        console.log(`🔒 Locked seed: ${currentSeed}`);
      }
      
      // Use current settings state
      const settings = {
        seed: currentSeed,
        steps,
        cfg,
        denoise,
        guidance,
        width,
        height,
        samplerName,
        schedulerName,
        monochromeContrast,
        monochromeBrightness
      };

      const BATCH_SIZE = 2; // Process 2 images at a time
      console.log(`🚀 Starting batch generation: ${images.length} images in batches of ${BATCH_SIZE}`);

      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;

      // Process images in chunks of BATCH_SIZE
      for (let i = 0; i < images.length; i += BATCH_SIZE) {
        // Check if aborted
        if (controller.signal.aborted) {
          console.log('🛑 Generation aborted by user');
          break;
        }

        const chunk = images.slice(i, Math.min(i + BATCH_SIZE, images.length));
        const chunkNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalChunks = Math.ceil(images.length / BATCH_SIZE);
        
        console.log(`📦 Processing chunk ${chunkNum}/${totalChunks} (${chunk.length} images)...`);

        // Prepare prompts - strip color references if monochrome style
        let frontpad = style.frontpad || '';
        let backpad = style.backpad || '';
        
        if (isMonochromeStyle(style)) {
          console.log('⚫ Monochrome style detected - stripping color references');
          frontpad = stripColorReferences(frontpad);
          backpad = stripColorReferences(backpad);
        }
        
        // Prepare image data with captions for this chunk
        const imageData = chunk.map(img => {
          let prompt = img.prompt || 'a movie scene';
          
          // Strip color references from prompt if monochrome
          if (isMonochromeStyle(style)) {
            prompt = stripColorReferences(prompt);
          }
          
          return {
            filename: img.filename,
            path: img.path,
            fs_path: img.fs_path,
            prompt
          };
        });

        try {
          // Call batch generation API for this chunk
          const response = await fetch('/api/training-data/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              images: imageData,
              workflow,
              settings,
              styleId: style.id,
              styleLoraName: style.lora_file,
              loraStrengthModel: loraStrengthModel,
              loraStrengthClip: loraStrengthClip,
              promptFrontpad: frontpad,
              promptBackpad: backpad,
              isMonochrome: isMonochromeStyle(style),
              monochromeContrast: settings.monochromeContrast,
              monochromeBrightness: settings.monochromeBrightness
            }),
            signal: controller.signal
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Batch generation failed');
          }

          const result = await response.json();

          // Update totals
          totalSuccessful += result.successful || 0;
          totalFailed += result.failed || 0;
          totalProcessed += chunk.length;

          // Update progress
          setProcessingState(prev => ({
            ...prev,
            progress: { current: totalProcessed, total: images.length }
          }));

          console.log(`✅ Chunk ${chunkNum}/${totalChunks} complete (${result.successful} succeeded, ${result.failed} failed)`);
          console.log(`   Overall progress: ${totalProcessed}/${images.length} images processed`);

          // Incrementally add new training images without full reload
          if (result.results && Array.isArray(result.results)) {
            const newTrainingImages: TrainingImage[] = [];
            
            result.results.forEach((item: any) => {
              if (item.success && item.trainingFilename) {
                // Find the base image filename
                const baseImg = chunk.find(img => img.filename === item.filename);
                if (baseImg) {
                  newTrainingImages.push({
                    filename: item.trainingFilename,
                    path: `/resources/style_images/${style.id}_${style.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}/${item.trainingFilename}`,
                    baseFilename: baseImg.filename
                  });
                }
              }
            });
            
            // Add new training images to state
            if (newTrainingImages.length > 0) {
              setTrainingImages(prev => [...prev, ...newTrainingImages]);
              console.log(`📸 Added ${newTrainingImages.length} new training images to state`);
            }
          }

          // Clear generating state for completed chunk images
          const chunkFilenames = chunk.map(img => img.filename);
          setBaseImages(prev => prev.map(img => 
            chunkFilenames.includes(img.filename)
              ? { ...img, isGenerating: false }
              : img
          ));

          // Increment refresh key to force image reload with cache busting
          setImageRefreshKey(prev => prev + 1);

        } catch (chunkErr: any) {
          if (chunkErr.name === 'AbortError') {
            console.log('🛑 Chunk processing aborted');
            break;
          }
          console.error(`❌ Chunk ${chunkNum} failed:`, chunkErr.message);
          totalFailed += chunk.length;
          totalProcessed += chunk.length;
          
          // Clear generating state for failed chunk
          const chunkFilenames = chunk.map(img => img.filename);
          setBaseImages(prev => prev.map(img => 
            chunkFilenames.includes(img.filename)
              ? { ...img, isGenerating: false }
              : img
          ));
        }
      }

      if (!controller.signal.aborted) {
        console.log(`🎉 All batches complete: ${totalSuccessful} succeeded, ${totalFailed} failed (${totalProcessed} total)`);
        
        // Final reload to ensure everything is in sync
        console.log('🔄 Final data reload after all batches complete...');
        await loadData();
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('🛑 Generation aborted');
      } else {
        console.error('❌ Batch generation error:', err);
        setError(err.message);
      }
      // Clear generating state on error
      setBaseImages(prev => prev.map(img => ({ ...img, isGenerating: false })));
    } finally {
      setProcessingState({
        isGenerating: false,
        progress: { current: 0, total: 0 }
      });
      setAbortController(null);
    }
  }

  async function deleteTrainingImage(trainingFilename: string) {
    try {
      const response = await fetch('/api/training-data/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId: style.id,
          filename: trainingFilename
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete training image');
      }

      console.log('✅ Training image deleted');
      
      // Emit event to notify other components
      const eventData: TrainingImageDeletedEvent = {
        styleId: style.id,
        trainingImageFilename: trainingFilename,
      };
      eventBus.emit(EVENT_TYPES.TRAINING_IMAGE_DELETED, eventData);
      
      // Reload data (not initial load, no loading screen)
      await loadData();
    } catch (err) {
      console.error('❌ Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  }

  async function recreateTrainingImage(baseImage: BaseImage) {
    await generateBatch([baseImage]);
  }

  function handleSendToImageGen(baseImage: BaseImage, trainingImage?: TrainingImage) {
    if (onSendToImageGen) {
      onSendToImageGen(baseImage.path, trainingImage?.path);
    }
  }

  if (loading) {
    return (
      <div className="training-data-manager">
        <div className="training-header">
          <div>
            <h2>{style.title} - Training Data</h2>
            <p className="training-subtitle">Loading...</p>
          </div>
        </div>
        <div className="training-loading">
          <div className="spinner"></div>
          <p>Loading training data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="training-data-manager">
        <div className="training-header">
          <div>
            <h2>{style.title} - Training Data</h2>
            <p className="training-subtitle">Error loading data</p>
          </div>
        </div>
        <div className="training-error">
          <div className="error-icon">⚠️</div>
          <h3>Error</h3>
          <p>{error}</p>
          <button className="training-button" onClick={() => loadData(true)}>Retry</button>
        </div>
      </div>
    );
  }

  const selectedCount = baseImages.filter(img => img.isSelected).length;
  const missingCount = baseImages.filter(img => {
    const basename = img.filename.replace(/\.[^.]+$/, '');
    return imageMap.get(basename) === null;
  }).length;
  const totalTrainingImages = trainingImages.length;

  return (
    <div className="training-data-manager">
      <div className="training-header">
        <div>
          <h2>{style.title} - Training Data Manager</h2>
          <p className="training-subtitle">
            {baseImages.length} base images • {totalTrainingImages} training images • {missingCount} missing
            {selectedCount > 0 && ` • ${selectedCount} selected`}
          </p>
        </div>

        <div className="training-actions">
          {processingState.isGenerating ? (
            <button 
              className="training-button abort"
              onClick={abortGeneration}
              title="Stop generation"
            >
              🛑 Abort ({processingState.progress.current}/{processingState.progress.total})
            </button>
          ) : (
            <>
              <button 
                className="training-button primary"
                onClick={generateMissing}
                disabled={missingCount === 0}
                title="Generate training images for all base images without training data"
              >
                ✨ Generate Missing ({missingCount})
              </button>
              
              <button 
                className="training-button"
                onClick={generateSelected}
                disabled={selectedCount === 0}
                title="Generate training images for selected base images"
              >
                Generate Selected ({selectedCount})
              </button>

              <button
                className="training-button"
                onClick={() => setShowSettingsModal(true)}
                title="Configure expert settings"
              >
                ⚙️ Expert Settings
              </button>

              <button
                className="training-button"
                onClick={onClose}
                title="Close and return to style library"
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>

      {processingState.isGenerating && processingState.progress.total > 0 && (
        <div className="training-progress-bar">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(processingState.progress.current / processingState.progress.total) * 100}%` }}
            />
          </div>
          <div className="progress-bar-text">
            Generating training images: {processingState.progress.current} / {processingState.progress.total} 
            ({Math.round((processingState.progress.current / processingState.progress.total) * 100)}%)
          </div>
        </div>
      )}

      <div className="training-toolbar">
        <div className="selection-actions">
          <button 
            className="training-button small"
            onClick={selectAll}
            disabled={baseImages.length === 0}
          >
            Select All
          </button>
          <button 
            className="training-button small"
            onClick={selectMissing}
            disabled={missingCount === 0}
          >
            Select Missing ({missingCount})
          </button>
          <button 
            className="training-button small"
            onClick={deselectAll}
            disabled={selectedCount === 0}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="training-grid">
        {baseImages.map((baseImg, index) => {
          const basename = baseImg.filename.replace(/\.[^.]+$/, '');
          const trainingImg = imageMap.get(basename);
          const hasTraining = trainingImg !== null;

          return (
            <div key={baseImg.filename} className={`training-pair ${baseImg.isSelected ? 'selected' : ''}`}>
              {/* Base Image */}
              <div className="training-item base">
                <div className="training-item-checkbox">
                  <input
                    type="checkbox"
                    checked={baseImg.isSelected}
                    onChange={() => toggleSelection(index)}
                    title="Select for batch processing"
                  />
                </div>
                
                <div className="training-item-image">
                  <img src={baseImg.path} alt={baseImg.filename} loading="lazy" />
                  <div className="training-badge base-badge">
                    Base Image
                  </div>
                  {baseImg.hasPrompt && (
                    <div className="prompt-indicator">📝</div>
                  )}
                </div>

                <div className="training-item-info">
                  <span className="training-filename">{baseImg.filename}</span>
                  {baseImg.prompt && (
                    <p className="training-prompt">{baseImg.prompt.substring(0, 80)}...</p>
                  )}
                </div>
              </div>

              {/* Training Image or Placeholder */}
              <div className="training-item result">
                {hasTraining && trainingImg ? (
                  <>
                    <div className="training-item-image">
                      <img 
                        key={`${trainingImg.filename}-${imageRefreshKey}`}
                        src={`${trainingImg.path}?v=${imageRefreshKey}`}
                        alt={trainingImg.filename} 
                        loading="lazy"
                        onLoad={() => console.log('✅ Training image loaded:', trainingImg.filename, 'Path:', trainingImg.path)}
                        onError={(e) => {
                          console.error('❌ Training image FAILED to load:', trainingImg.filename);
                          console.error('   Path:', trainingImg.path);
                          console.error('   Full URL:', `${trainingImg.path}?v=${imageRefreshKey}`);
                          console.error('   Error:', e);
                        }}
                      />
                      <div className="training-badge training-badge">
                        Training Image
                      </div>
                      {baseImg.isGenerating && (
                        <div className="training-generating-overlay">
                          <div className="spinner-small"></div>
                          <span>Regenerating...</span>
                        </div>
                      )}
                    </div>

                    <div className="training-item-info">
                      <span className="training-filename">{trainingImg.filename}</span>
                    </div>

                    <div className="training-actions-buttons">
                      <button
                        className="training-button small"
                        onClick={() => handleSendToImageGen(baseImg, trainingImg)}
                        title="Send to Image Generation tab"
                        disabled={baseImg.isGenerating}
                      >
                        🎨 Edit
                      </button>
                      <button
                        className="training-button small"
                        onClick={() => recreateTrainingImage(baseImg)}
                        title="Recreate training image"
                        disabled={baseImg.isGenerating}
                      >
                        🔄 Recreate
                      </button>
                      <button
                        className="training-button small danger"
                        onClick={() => deleteTrainingImage(trainingImg.filename)}
                        title="Delete training image"
                        disabled={baseImg.isGenerating}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="training-placeholder">
                      {baseImg.isGenerating ? (
                        <>
                          <div className="spinner"></div>
                          <p>Generating training image...</p>
                        </>
                      ) : (
                        <>
                          <div className="placeholder-icon">📸</div>
                          <p>No training image</p>
                          <button
                            className="training-button small primary"
                            onClick={() => generateBatch([baseImg])}
                            title="Generate training image"
                          >
                            ✨ Generate
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {baseImages.length === 0 && (
        <div className="training-empty">
          <div className="empty-icon">📸</div>
          <h3>No Base Images Found</h3>
          <p>Add base images to /resources/input_images to get started.</p>
        </div>
      )}

      <SettingsModalRedesigned
        show={showSettingsModal}
        selectedStyle={style.id}
        styles={[style]}
        seed={seed}
        seedLocked={seedLocked}
        steps={steps}
        cfg={cfg}
        denoise={denoise}
        guidance={guidance}
        width={width}
        height={height}
        samplerName={samplerName}
        schedulerName={schedulerName}
        loraStrengthModel={loraStrengthModel}
        loraStrengthClip={loraStrengthClip}
        monochromeContrast={monochromeContrast}
        monochromeBrightness={monochromeBrightness}
        frontpad={frontpad}
        backpad={backpad}
        saveStatus={saveStatus}
        loading={processingState.isGenerating}
        onClose={async () => {
          // Auto-save settings when closing modal
          await saveSettings();
          setShowSettingsModal(false);
        }}
        onSave={saveSettings}
        onReset={resetSettings}
        onResetLoraToDefault={resetLoraToDefault}
        onRandomizeSeed={randomizeSeed}
        setSeed={setSeed}
        setSeedLocked={setSeedLocked}
        setSteps={setSteps}
        setCfg={setCfg}
        setDenoise={setDenoise}
        setGuidance={setGuidance}
        setWidth={setWidth}
        setHeight={setHeight}
        setSamplerName={setSamplerName}
        setSchedulerName={setSchedulerName}
        setLoraStrengthModel={setLoraStrengthModel}
        setLoraStrengthClip={setLoraStrengthClip}
        setMonochromeContrast={setMonochromeContrast}
        setMonochromeBrightness={setMonochromeBrightness}
        setFrontpad={setFrontpad}
        setBackpad={setBackpad}
      />
    </div>
  );
}
