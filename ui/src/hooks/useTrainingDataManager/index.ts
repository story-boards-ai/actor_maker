import type { Actor } from '../../types';
import { useGenerationSettings } from './useGenerationSettings';
import { useImageSelection } from './useImageSelection';
import { useTrainingImages } from './useTrainingImages';
import { useImageGeneration } from './useImageGeneration';

export function useTrainingDataManager(actor: Actor) {
  // 1. Settings management
  const settings = useGenerationSettings(actor);
  
  // 2. Image selection
  const selection = useImageSelection();
  
  // 3. Training images data
  const images = useTrainingImages(actor, selection.baseImages, selection.setBaseImages);
  
  // 4. Image generation
  const generation = useImageGeneration({
    actor,
    baseImages: selection.baseImages,
    setBaseImages: selection.setBaseImages,
    trainingImages: images.trainingImages,
    setTrainingImages: images.setTrainingImages,
    workflow: images.workflow,
    settings,
    loadData: images.loadData,
    incrementRefreshKey: images.incrementRefreshKey,
    imageMap: images.imageMap,
  });
  
  return {
    // Settings
    settings,
    
    // Selection
    baseImages: selection.baseImages,
    selectedCount: selection.selectedCount,
    toggleSelection: selection.toggleSelection,
    selectAll: selection.selectAll,
    deselectAll: selection.deselectAll,
    selectMissing: selection.selectMissing,
    
    // Images data
    trainingImages: images.trainingImages,
    workflow: images.workflow,
    loading: images.loading,
    error: images.error,
    imageRefreshKey: images.imageRefreshKey,
    imageMap: images.imageMap,
    missingCount: images.missingCount,
    loadData: images.loadData,
    
    // Generation
    processingState: generation.processingState,
    generateSelected: generation.generateSelected,
    generateMissing: generation.generateMissing,
    deleteTrainingImage: generation.deleteTrainingImage,
    recreateTrainingImage: generation.recreateTrainingImage,
    abortGeneration: generation.abortGeneration,
  };
}
