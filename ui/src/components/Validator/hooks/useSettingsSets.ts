import { useState, useCallback } from 'react';
import type { SettingsSet, SettingsSetSummary, AssessmentRating } from '../types/settings-set';
import type { TrainedModel } from './useValidatorState';
import type { Style } from '../../../types';

interface UseSettingsSetsProps {
  selectedStyle: string;
  selectedModel: string;
  trainedModels: TrainedModel[];
  styles: Style[];
  currentRating: AssessmentRating;
  currentComment: string;
  seed: number;
  seedLocked: boolean;
  steps: number;
  cfg: number;
  denoise: number;
  guidance: number;
  width: number;
  height: number;
  samplerName: string;
  schedulerName: string;
  loraWeight: number;
  characterLoraWeight: number;
  cineLoraWeight: number;
  monochromeContrast: number;
  monochromeBrightness: number;
  frontpad: string;
  backpad: string;
  generatedImage: string | null;
  prompt: string;
  addLog: (message: string) => void;
}

export function useSettingsSets(props: UseSettingsSetsProps) {
  const [settingsSets, setSettingsSets] = useState<SettingsSetSummary[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [settingsSetName, setSettingsSetName] = useState('');

  // Load settings sets for current style
  const loadSettingsSets = useCallback(async () => {
    if (!props.selectedStyle) {
      props.addLog('⚠️ No style selected');
      return;
    }

    try {
      const response = await fetch(`/api/settings-sets?styleId=${props.selectedStyle}`);
      if (!response.ok) throw new Error('Failed to load settings sets');
      const data = await response.json();
      setSettingsSets(data.settingsSets || []);
      props.addLog(`✅ Loaded ${data.settingsSets?.length || 0} settings sets for this style`);
    } catch (error) {
      console.error('Failed to load settings sets:', error);
      props.addLog('❌ Failed to load settings sets');
    }
  }, [props.selectedStyle]);

  // Save current settings as a new settings set
  const saveSettingsSet = useCallback(async (name: string) => {
    if (!props.selectedStyle || !props.selectedModel) {
      props.addLog('❌ Select style and model first');
      return;
    }

    const styleData = props.styles.find(s => s.id === props.selectedStyle);
    const modelData = props.trainedModels.find(m => m.id === props.selectedModel);

    if (!styleData || !modelData) {
      props.addLog('❌ Invalid style or model');
      return;
    }

    const settingsSet: Omit<SettingsSet, 'id' | 'timestamp'> = {
      name,
      styleId: props.selectedStyle,
      styleName: styleData.title,
      modelId: props.selectedModel,
      modelName: modelData.name,
      rating: props.currentRating,
      comment: props.currentComment,
      seed: props.seed,
      seedLocked: props.seedLocked,
      steps: props.steps,
      cfg: props.cfg,
      denoise: props.denoise,
      guidance: props.guidance,
      width: props.width,
      height: props.height,
      samplerName: props.samplerName,
      schedulerName: props.schedulerName,
      loraWeight: props.loraWeight,
      characterLoraWeight: props.characterLoraWeight,
      cineLoraWeight: props.cineLoraWeight,
      monochromeContrast: props.monochromeContrast,
      monochromeBrightness: props.monochromeBrightness,
      frontpad: props.frontpad,
      backpad: props.backpad,
      testImageUrl: props.generatedImage || undefined,
      testPrompt: props.prompt || undefined,
    };

    try {
      const response = await fetch('/api/settings-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsSet),
      });

      if (!response.ok) throw new Error('Failed to save settings set');
      
      const saved = await response.json();
      props.addLog(`✅ Saved settings set: "${name}"`);
      
      // Reload the list
      await loadSettingsSets();
      
      setShowSaveModal(false);
      setSettingsSetName('');
      
      return saved;
    } catch (error) {
      console.error('Failed to save settings set:', error);
      props.addLog('❌ Failed to save settings set');
      throw error;
    }
  }, [props, loadSettingsSets]);

  // Load a settings set
  const loadSettingsSet = useCallback(async (id: string, applySettings: (settings: SettingsSet) => void) => {
    try {
      const response = await fetch(`/api/settings-sets/${id}`);
      if (!response.ok) throw new Error('Failed to load settings set');
      
      const settingsSet: SettingsSet = await response.json();
      applySettings(settingsSet);
      props.addLog(`✅ Loaded settings set: "${settingsSet.name}"`);
      
      setShowLoadModal(false);
    } catch (error) {
      console.error('Failed to load settings set:', error);
      props.addLog('❌ Failed to load settings set');
    }
  }, [props]);

  // Delete a settings set
  const deleteSettingsSet = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/settings-sets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete settings set');
      
      props.addLog('✅ Deleted settings set');
      await loadSettingsSets();
    } catch (error) {
      console.error('Failed to delete settings set:', error);
      props.addLog('❌ Failed to delete settings set');
    }
  }, [loadSettingsSets, props]);

  return {
    settingsSets,
    showSaveModal,
    setShowSaveModal,
    showLoadModal,
    setShowLoadModal,
    settingsSetName,
    setSettingsSetName,
    loadSettingsSets,
    saveSettingsSet,
    loadSettingsSet,
    deleteSettingsSet,
  };
}
