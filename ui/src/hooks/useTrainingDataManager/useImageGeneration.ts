import { useState, useCallback } from 'react';
import type { Style } from '../../types';
import type { BaseImage, TrainingImage, ProcessingState, GenerationSettings } from '../../components/TrainingDataManager/types';
import { stripColorReferences, isMonochromeStyle } from '../../utils/promptUtils';
import { eventBus, EVENT_TYPES, type TrainingImageDeletedEvent } from '../../utils/eventBus';
import { BATCH_SIZE } from '../../utils/trainingDataManager/constants';
import { isWorkflowLoaded } from '../../utils/trainingDataManager/validators';

interface UseImageGenerationProps {
  style: Style;
  baseImages: BaseImage[];
  setBaseImages: React.Dispatch<React.SetStateAction<BaseImage[]>>;
  trainingImages: TrainingImage[];
  setTrainingImages: React.Dispatch<React.SetStateAction<TrainingImage[]>>;
  workflow: any;
  settings: GenerationSettings;
  loadData: (isInitialLoad?: boolean) => Promise<void>;
  incrementRefreshKey: () => void;
  imageMap: Map<string, TrainingImage | null>;
}

interface UseImageGenerationReturn {
  processingState: ProcessingState;
  generateSelected: () => Promise<void>;
  generateMissing: () => Promise<void>;
  deleteTrainingImage: (trainingFilename: string) => Promise<void>;
  recreateTrainingImage: (baseImage: BaseImage) => Promise<void>;
  abortGeneration: () => void;
}

export function useImageGeneration({
  style,
  baseImages,
  setBaseImages,
  trainingImages,
  setTrainingImages,
  workflow,
  settings,
  loadData,
  incrementRefreshKey,
  imageMap,
}: UseImageGenerationProps): UseImageGenerationReturn {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isGenerating: false,
    progress: { current: 0, total: 0 }
  });
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const generateBatch = useCallback(async (images: BaseImage[]) => {
    if (!isWorkflowLoaded(workflow)) {
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
      let currentSeed = settings.seed;
      if (!settings.seedLocked) {
        currentSeed = Math.floor(Math.random() * 1000000);
        console.log(`🎲 Random seed: ${currentSeed}`);
      } else {
        console.log(`🔒 Locked seed: ${currentSeed}`);
      }
      
      const generationSettings = {
        seed: currentSeed,
        steps: settings.steps,
        cfg: settings.cfg,
        denoise: settings.denoise,
        guidance: settings.guidance,
        width: settings.width,
        height: settings.height,
        samplerName: settings.samplerName,
        schedulerName: settings.schedulerName,
        monochromeContrast: settings.monochromeContrast,
        monochromeBrightness: settings.monochromeBrightness
      };

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
        let frontpad = settings.frontpad || '';
        let backpad = settings.backpad || '';
        
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
              settings: generationSettings,
              styleId: style.id,
              styleLoraName: style.lora_file,
              loraStrengthModel: settings.loraStrengthModel,
              loraStrengthClip: settings.loraStrengthClip,
              promptFrontpad: frontpad,
              promptBackpad: backpad,
              isMonochrome: isMonochromeStyle(style),
              monochromeContrast: generationSettings.monochromeContrast,
              monochromeBrightness: generationSettings.monochromeBrightness
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
          incrementRefreshKey();

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
  }, [workflow, settings, style, setBaseImages, setTrainingImages, loadData, incrementRefreshKey]);

  const generateSelected = useCallback(async () => {
    const selected = baseImages.filter(img => img.isSelected);
    if (selected.length === 0) {
      console.warn('⚠️ No base images selected');
      return;
    }
    await generateBatch(selected);
  }, [baseImages, generateBatch]);

  const generateMissing = useCallback(async () => {
    const missing = baseImages.filter(img => {
      const basename = img.filename.replace(/\.[^.]+$/, '');
      return imageMap.get(basename) === null;
    });

    if (missing.length === 0) {
      console.log('✅ All base images have training images');
      return;
    }

    await generateBatch(missing);
  }, [baseImages, imageMap, generateBatch]);

  const deleteTrainingImage = useCallback(async (trainingFilename: string) => {
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
    }
  }, [style.id, loadData]);

  const recreateTrainingImage = useCallback(async (baseImage: BaseImage) => {
    await generateBatch([baseImage]);
  }, [generateBatch]);

  const abortGeneration = useCallback(() => {
    if (abortController) {
      console.log('🛑 Aborting training data generation...');
      abortController.abort();
      setAbortController(null);
      setProcessingState({
        isGenerating: false,
        progress: { current: 0, total: 0 }
      });
    }
  }, [abortController]);

  return {
    processingState,
    generateSelected,
    generateMissing,
    deleteTrainingImage,
    recreateTrainingImage,
    abortGeneration,
  };
}
