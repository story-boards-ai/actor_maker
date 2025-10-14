import { useEffect, Dispatch, SetStateAction } from 'react';
import { stripColorReferences, isMonochromeStyle } from '../../../utils/promptUtils';
import type { Style } from '../../../types';

interface UsePromptBuilderProps {
  selectedImage: string;
  selectedStyle: string;
  prompt: string;
  frontpad: string;
  backpad: string;
  styles: Style[];
  setPrompt: Dispatch<SetStateAction<string>>;
  setLoadingCaption: Dispatch<SetStateAction<boolean>>;
  setFullPrompt: Dispatch<SetStateAction<string>>;
  setPromptBreakdown: Dispatch<SetStateAction<{
    triggerWords: string;
    frontpad: string;
    prompt: string;
    backpad: string;
  } | null>>;
  setLoraStrengthModel: Dispatch<SetStateAction<number>>;
  setLoraStrengthClip: Dispatch<SetStateAction<number>>;
  addLog: (message: string) => void;
}

export function usePromptBuilder(props: UsePromptBuilderProps) {
  const {
    selectedImage,
    selectedStyle,
    prompt,
    frontpad,
    backpad,
    styles,
    setPrompt,
    setLoadingCaption,
    setFullPrompt,
    setPromptBreakdown,
    setLoraStrengthModel,
    setLoraStrengthClip,
    addLog,
  } = props;

  // Load prompt when image is selected
  useEffect(() => {
    if (selectedImage) {
      loadPromptForImage(selectedImage);
    } else {
      setPrompt('');
    }
  }, [selectedImage]);

  // Update prompt preview and LoRA settings when style, prompt, frontpad, or backpad changes
  useEffect(() => {
    if (selectedStyle) {
      updatePromptPreview();
      
      const styleData = styles.find(s => s.id === selectedStyle);
      if (styleData) {
        const defaultLoraWeight = styleData.lora_weight || 1.0;
        setLoraStrengthModel(defaultLoraWeight);
        setLoraStrengthClip(defaultLoraWeight);
        addLog(`📊 Loaded LoRA strength from style: ${defaultLoraWeight}`);
        
        if (styleData.monochrome) {
          addLog(`⚫ Monochrome style detected - B&W conversion will be applied`);
        }
      }
    } else {
      setFullPrompt('');
      setPromptBreakdown(null);
    }
  }, [selectedStyle, prompt, frontpad, backpad, styles]);

  async function loadPromptForImage(imagePathOrFilename: string) {
    try {
      setLoadingCaption(true);
      // Extract just the filename if a full path is provided
      const filename = imagePathOrFilename.split('/').pop() || imagePathOrFilename;
      const basename = filename.replace(/\.[^.]+$/, '');
      const promptFile = `${basename}.txt`;
      
      addLog(`Loading prompt for ${imagePathOrFilename}...`);
      const response = await fetch(`/api/prompt/read/${promptFile}`);
      
      if (!response.ok) {
        addLog(`No prompt file found for ${filename}`);
        setPrompt('');
        return;
      }
      
      const data = await response.json();
      const prompt = data.prompt || '';
      
      if (prompt) {
        setPrompt(prompt);
        addLog(`✅ Loaded prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
      } else {
        setPrompt('');
        addLog(`Caption file empty for ${filename}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load prompt';
      addLog(`WARNING: ${errorMsg}`);
      setPrompt('');
    } finally {
      setLoadingCaption(false);
    }
  }

  function updatePromptPreview() {
    const styleData = styles.find(s => s.id === selectedStyle);
    if (!styleData) return;

    const triggerWords = styleData.trigger_words || '';
    // Use the frontpad/backpad from props (editable state), not from style data
    let currentFrontpad = frontpad || '';
    let currentBackpad = backpad || '';
    let baseDescription = prompt || 'a beautiful scene';
    
    if (isMonochromeStyle(styleData)) {
      currentFrontpad = stripColorReferences(currentFrontpad);
      currentBackpad = stripColorReferences(currentBackpad);
      baseDescription = stripColorReferences(baseDescription);
    }
    
    let finalPrompt = '';
    if (triggerWords) {
      finalPrompt += triggerWords;
    }
    if (currentFrontpad) {
      finalPrompt += (finalPrompt ? ', ' : '') + currentFrontpad;
    }
    if (baseDescription) {
      finalPrompt += (finalPrompt ? ', ' : '') + baseDescription;
    }
    if (currentBackpad) {
      finalPrompt += (finalPrompt ? ', ' : '') + currentBackpad;
    }
    
    setFullPrompt(finalPrompt);
    setPromptBreakdown({
      triggerWords,
      frontpad: currentFrontpad,
      prompt: baseDescription,
      backpad: currentBackpad
    });
  }

  return {
    loadPromptForImage,
    updatePromptPreview,
  };
}
