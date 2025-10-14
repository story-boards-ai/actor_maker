import { useState, useCallback } from 'react';
import type { BaseImage } from '../../components/TrainingDataManager/types';
import { getBasename } from '../../utils/trainingDataManager/imageMapping';

interface UseImageSelectionReturn {
  baseImages: BaseImage[];
  setBaseImages: React.Dispatch<React.SetStateAction<BaseImage[]>>;
  toggleSelection: (index: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  selectMissing: (imageMap: Map<string, any>) => void;
  selectedCount: number;
}

export function useImageSelection(): UseImageSelectionReturn {
  const [baseImages, setBaseImages] = useState<BaseImage[]>([]);

  const toggleSelection = useCallback((index: number) => {
    setBaseImages(prev => prev.map((img, i) => 
      i === index ? { ...img, isSelected: !img.isSelected } : img
    ));
  }, []);

  const selectAll = useCallback(() => {
    setBaseImages(prev => prev.map(img => ({ ...img, isSelected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setBaseImages(prev => prev.map(img => ({ ...img, isSelected: false })));
  }, []);

  const selectMissing = useCallback((imageMap: Map<string, any>) => {
    setBaseImages(prev => prev.map(img => {
      const basename = getBasename(img.filename);
      const hasTraining = imageMap.get(basename) !== null;
      return { ...img, isSelected: !hasTraining };
    }));
  }, []);

  const selectedCount = baseImages.filter(img => img.isSelected).length;

  return {
    baseImages,
    setBaseImages,
    toggleSelection,
    selectAll,
    deselectAll,
    selectMissing,
    selectedCount,
  };
}
