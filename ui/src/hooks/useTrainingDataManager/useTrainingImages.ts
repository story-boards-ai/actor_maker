import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Style } from '../../types';
import type { BaseImage, TrainingImage } from '../../components/TrainingDataManager/types';
import { eventBus, EVENT_TYPES, type TrainingImageSavedEvent, type TrainingImageDeletedEvent, type TrainingImagesGeneratedEvent } from '../../utils/eventBus';
import { createImageMap, parseTrainingImages } from '../../utils/trainingDataManager/imageMapping';

interface UseTrainingImagesReturn {
  trainingImages: TrainingImage[];
  setTrainingImages: React.Dispatch<React.SetStateAction<TrainingImage[]>>;
  workflow: any;
  loading: boolean;
  error: string | null;
  imageRefreshKey: number;
  imageMap: Map<string, TrainingImage | null>;
  missingCount: number;
  loadData: (isInitialLoad?: boolean) => Promise<void>;
  incrementRefreshKey: () => void;
}

export function useTrainingImages(
  style: Style,
  baseImages: BaseImage[],
  setBaseImages: React.Dispatch<React.SetStateAction<BaseImage[]>>
): UseTrainingImagesReturn {
  const [trainingImages, setTrainingImages] = useState<TrainingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const [workflow, setWorkflow] = useState<any>(null);

  useEffect(() => {
    loadData(true); // Initial load
    loadWorkflow();
    
    // Listen for training image events from other components
    const unsubscribeSaved = eventBus.on(
      EVENT_TYPES.TRAINING_IMAGE_SAVED,
      (data: TrainingImageSavedEvent) => {
        if (data.styleId === style.id) {
          console.log('[TrainingDataManager] Training image saved event received, refreshing...');
          loadData();
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

  const loadData = useCallback(async (isInitialLoad = false) => {
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
      const parsedTrainingImages = parseTrainingImages(trainingData, baseImagesWithCaptions);
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
  }, [style.id, setBaseImages]);

  const imageMap = useMemo(() => {
    return createImageMap(baseImages, trainingImages);
  }, [baseImages, trainingImages]);

  const missingCount = useMemo(() => {
    return baseImages.filter(img => {
      const basename = img.filename.replace(/\.[^.]+$/, '');
      return imageMap.get(basename) === null;
    }).length;
  }, [baseImages, imageMap]);

  const incrementRefreshKey = useCallback(() => {
    setImageRefreshKey(prev => prev + 1);
  }, []);

  return {
    trainingImages,
    setTrainingImages,
    workflow,
    loading,
    error,
    imageRefreshKey,
    imageMap,
    missingCount,
    loadData,
    incrementRefreshKey,
  };
}
