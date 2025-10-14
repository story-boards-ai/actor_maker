import { useEffect, Dispatch, SetStateAction } from 'react';
import type { Style } from '../../../types';

interface SettingsState {
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
  loraStrengthModel: number;
  loraStrengthClip: number;
  monochromeContrast: number;
  monochromeBrightness: number;
  frontpad: string;
  backpad: string;
}

interface UseSettingsProps {
  state: SettingsState;
  selectedStyle: string;
  styles: Style[];
  setters: {
    setSeed: Dispatch<SetStateAction<number>>;
    setSeedLocked: Dispatch<SetStateAction<boolean>>;
    setSteps: Dispatch<SetStateAction<number>>;
    setCfg: Dispatch<SetStateAction<number>>;
    setDenoise: Dispatch<SetStateAction<number>>;
    setGuidance: Dispatch<SetStateAction<number>>;
    setWidth: Dispatch<SetStateAction<number>>;
    setHeight: Dispatch<SetStateAction<number>>;
    setSamplerName: Dispatch<SetStateAction<string>>;
    setSchedulerName: Dispatch<SetStateAction<string>>;
    setLoraStrengthModel: Dispatch<SetStateAction<number>>;
    setLoraStrengthClip: Dispatch<SetStateAction<number>>;
    setMonochromeContrast: Dispatch<SetStateAction<number>>;
    setMonochromeBrightness: Dispatch<SetStateAction<number>>;
    setFrontpad: Dispatch<SetStateAction<string>>;
    setBackpad: Dispatch<SetStateAction<string>>;
    setSaveStatus: Dispatch<SetStateAction<'idle' | 'saving' | 'saved' | 'error'>>;
  };
  addLog: (message: string) => void;
  reloadStyles: () => Promise<void>;
}

export function useSettings(props: UseSettingsProps) {
  const { state, selectedStyle, styles, setters, addLog } = props;
  // Load settings when component mounts or style changes
  useEffect(() => {
    if (selectedStyle) {
      loadSettings();
      loadStylePrompts();
    }
  }, [selectedStyle]);

  async function loadStylePrompts() {
    if (!selectedStyle) return;
    
    const currentStyle = styles.find(s => s.id === selectedStyle);
    if (currentStyle) {
      setters.setFrontpad(currentStyle.frontpad || '');
      setters.setBackpad(currentStyle.backpad || '');
      addLog(`Loaded style prompts for: ${currentStyle.title}`);
    }
  }

  async function loadSettings() {
    if (!selectedStyle) return;
    
    // Find the current style to get its defaults
    const currentStyle = styles.find(s => s.id === selectedStyle);
    
    try {
      const response = await fetch(`/api/settings/load?styleId=${selectedStyle}`);
      if (!response.ok) {
        // No saved settings, use style defaults
        if (currentStyle) {
          applyStyleDefaults(currentStyle);
          addLog(`Using style defaults for: ${currentStyle.title}`);
        }
        return;
      }
      
      const savedSettings = await response.json();
      if (savedSettings) {
        // Priority: Saved settings > Style defaults > Current state
        setters.setSeed(savedSettings.seed ?? state.seed);
        setters.setSeedLocked(savedSettings.seedLocked ?? false);
        setters.setSteps(savedSettings.steps ?? currentStyle?.steps ?? state.steps);
        setters.setCfg(savedSettings.cfg ?? currentStyle?.cfg ?? state.cfg);
        setters.setDenoise(savedSettings.denoise ?? currentStyle?.denoise ?? state.denoise);
        setters.setGuidance(savedSettings.guidance ?? currentStyle?.guidance ?? state.guidance);
        setters.setWidth(savedSettings.width ?? state.width);
        setters.setHeight(savedSettings.height ?? state.height);
        setters.setSamplerName(savedSettings.samplerName ?? currentStyle?.sampler_name ?? state.samplerName);
        setters.setSchedulerName(savedSettings.schedulerName ?? currentStyle?.scheduler_name ?? state.schedulerName);
        setters.setLoraStrengthModel(savedSettings.loraStrengthModel ?? currentStyle?.lora_weight ?? state.loraStrengthModel);
        setters.setLoraStrengthClip(savedSettings.loraStrengthClip ?? currentStyle?.lora_weight ?? state.loraStrengthClip);
        setters.setMonochromeContrast(savedSettings.monochromeContrast ?? state.monochromeContrast);
        setters.setMonochromeBrightness(savedSettings.monochromeBrightness ?? state.monochromeBrightness);
        addLog(`Loaded saved settings for style: ${selectedStyle}`);
      }
    } catch (err) {
      // No saved settings, use style defaults
      if (currentStyle) {
        applyStyleDefaults(currentStyle);
        addLog(`Using style defaults for: ${currentStyle.title}`);
      }
    }
  }

  function applyStyleDefaults(style: Style) {
    setters.setSteps(style.steps ?? 20);
    setters.setCfg(style.cfg ?? 1);
    setters.setDenoise(style.denoise ?? 1);
    setters.setGuidance(style.guidance ?? 3.5);
    setters.setSamplerName(style.sampler_name ?? 'euler');
    setters.setSchedulerName(style.scheduler_name ?? 'ddim_uniform');
    setters.setLoraStrengthModel(style.lora_weight ?? 1.0);
    setters.setLoraStrengthClip(style.lora_weight ?? 1.0);
  }

  async function saveSettings() {
    if (!selectedStyle) {
      addLog('ERROR: No style selected');
      return;
    }
    
    try {
      setters.setSaveStatus('saving');
      const settings = {
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
        styleId: selectedStyle
      };

      const response = await fetch(`/api/settings/save?styleId=${selectedStyle}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      // Also save frontpad/backpad to the registry
      try {
        await saveStylePrompts();
      } catch (promptErr) {
        console.warn('[Settings] Settings saved but style prompts failed');
        // Continue - settings were saved even if prompts weren't
      }
      
      setters.setSaveStatus('saved');
      addLog(`✅ Settings saved for style: ${selectedStyle}`);
      
      setTimeout(() => setters.setSaveStatus('idle'), 2000);
    } catch (err) {
      setters.setSaveStatus('error');
      const errorMsg = err instanceof Error ? err.message : 'Failed to save settings';
      addLog(`ERROR: ${errorMsg}`);
      
      setTimeout(() => setters.setSaveStatus('idle'), 3000);
    }
  }

  async function saveStylePrompts() {
    if (!selectedStyle) {
      addLog('ERROR: No style selected');
      return;
    }
    
    try {
      const currentStyle = styles.find(s => s.id === selectedStyle);
      const payload = {
        styleId: selectedStyle,
        frontpad: state.frontpad,
        backpad: state.backpad
      };
      
      console.log('[Settings] Saving style prompts:', payload);
      addLog(`📝 Saving prompts to registry for: ${currentStyle?.title || selectedStyle}...`);
      
      const response = await fetch('/api/styles/update-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Settings] Failed to save style prompts:', errorText);
        throw new Error(`Failed to save style prompts: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[Settings] Style prompts saved successfully:', result);
      addLog(`✅ Prompts saved to registry for: ${currentStyle?.title || selectedStyle}`);
      
      // Reload styles from registry to update in-memory cache
      await props.reloadStyles();
      console.log('[Settings] Styles reloaded from registry');
      addLog(`✅ Registry reloaded`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save style prompts';
      console.error('[Settings] Error saving style prompts:', err);
      addLog(`❌ ERROR: ${errorMsg}`);
      throw err; // Re-throw so the parent saveSettings knows it failed
    }
  }

  async function saveSettingsToRegistry() {
    if (!selectedStyle) {
      addLog('ERROR: No style selected');
      return;
    }
    
    try {
      const currentStyle = styles.find(s => s.id === selectedStyle);
      const payload = {
        styleId: selectedStyle,
        loraWeight: state.loraStrengthModel,
        characterLoraWeight: state.loraStrengthModel, // These are mapped to same value in Validator
        cineLoraWeight: state.loraStrengthModel,
        steps: state.steps,
        cfg: state.cfg,
        denoise: state.denoise,
        guidance: state.guidance,
        samplerName: state.samplerName,
        schedulerName: state.schedulerName
      };
      
      console.log('[Settings] Saving settings to registry:', payload);
      addLog(`💾 Saving settings to registry for: ${currentStyle?.title || selectedStyle}...`);
      
      const response = await fetch('/api/styles/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Settings] Failed to save settings to registry:', errorText);
        throw new Error(`Failed to save settings to registry: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[Settings] Settings saved to registry successfully:', result);
      addLog(`✅ Settings saved to registry for: ${currentStyle?.title || selectedStyle}`);
      
      // Reload styles from registry to update in-memory cache
      await props.reloadStyles();
      console.log('[Settings] Styles reloaded from registry');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save settings to registry';
      console.error('[Settings] Error saving settings to registry:', err);
      addLog(`❌ ERROR: ${errorMsg}`);
      throw err;
    }
  }

  function resetSettings() {
    setters.setSeed(Math.floor(Math.random() * 1000000));
    
    // Find current style and reset to its defaults
    const currentStyle = styles.find(s => s.id === selectedStyle);
    if (currentStyle) {
      applyStyleDefaults(currentStyle);
      addLog(`Settings reset to style defaults for: ${currentStyle.title}`);
    } else {
      // Fallback to global defaults
      setters.setSteps(20);
      setters.setCfg(1);
      setters.setDenoise(1);
      setters.setGuidance(3.5);
      setters.setWidth(1360);
      setters.setHeight(768);
      setters.setSamplerName('euler');
      setters.setSchedulerName('ddim_uniform');
      setters.setLoraStrengthModel(1.0);
      setters.setLoraStrengthClip(1.0);
      addLog('Settings reset to global defaults');
    }
    
    setters.setMonochromeContrast(1.2);
    setters.setMonochromeBrightness(1.0);
  }

  return {
    loadSettings,
    saveSettings,
    resetSettings,
    saveStylePrompts,
    saveSettingsToRegistry,
  };
}
