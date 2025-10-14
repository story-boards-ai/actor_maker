import { useEffect, Dispatch, SetStateAction } from 'react';
import type { Style } from '../../../types';

interface InputImage {
  filename: string;
  path: string;
  hasPrompt: boolean;
}

interface UseImageDataProps {
  setInputImages: Dispatch<SetStateAction<InputImage[]>>;
  setStyles: Dispatch<SetStateAction<Style[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  addLog: (message: string) => void;
}

export function useImageData({ setInputImages, setStyles, setError, addLog }: UseImageDataProps) {
  useEffect(() => {
    loadInputImages();
    loadStyles();
  }, []);

  async function loadInputImages() {
    try {
      addLog('Loading input images...');
      const response = await fetch('/api/input-images');
      if (!response.ok) throw new Error('Failed to load input images');
      const data = await response.json();
      setInputImages(data.images || []);
      addLog(`Loaded ${data.images?.length || 0} input images`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load input images';
      addLog(`ERROR: ${errorMsg}`);
      setError(errorMsg);
    }
  }

  async function loadStyles() {
    try {
      addLog('Loading styles...');
      const response = await fetch('/styles_registry.json');
      if (!response.ok) throw new Error('Failed to load styles');
      const registry = await response.json();
      setStyles(registry.styles);
      addLog(`Loaded ${registry.styles.length} styles`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load styles';
      addLog(`ERROR: ${errorMsg}`);
      setError(errorMsg);
    }
  }

  return { loadInputImages, loadStyles };
}
