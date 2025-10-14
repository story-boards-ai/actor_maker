import { useState, useEffect } from 'react';
import type { Style } from '../../types';
import type { GenerationSettings, SaveStatus } from '../../components/TrainingDataManager/types';
import { DEFAULT_SETTINGS, getDefaultSettings } from '../../utils/trainingDataManager/constants';

interface UseGenerationSettingsReturn extends GenerationSettings {
  saveStatus: SaveStatus;
  setSeed: (seed: number) => void;
  setSeedLocked: (locked: boolean) => void;
  setSteps: (steps: number) => void;
  setCfg: (cfg: number) => void;
  setDenoise: (denoise: number) => void;
  setGuidance: (guidance: number) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setSamplerName: (name: string) => void;
  setSchedulerName: (name: string) => void;
  setLoraStrengthModel: (strength: number) => void;
  setLoraStrengthClip: (strength: number) => void;
  setMonochromeContrast: (contrast: number) => void;
  setMonochromeBrightness: (brightness: number) => void;
  setFrontpad: (frontpad: string) => void;
  setBackpad: (backpad: string) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  resetLoraToDefault: () => void;
  randomizeSeed: () => void;
}

export function useGenerationSettings(style: Style): UseGenerationSettingsReturn {
  const styleDefaults = getDefaultSettings(style);
  
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [seedLocked, setSeedLocked] = useState(DEFAULT_SETTINGS.seedLocked);
  const [steps, setSteps] = useState(styleDefaults.steps!);
  const [cfg, setCfg] = useState(styleDefaults.cfg!);
  const [denoise, setDenoise] = useState(styleDefaults.denoise!);
  const [guidance, setGuidance] = useState(styleDefaults.guidance!);
  const [width, setWidth] = useState(DEFAULT_SETTINGS.width);
  const [height, setHeight] = useState(DEFAULT_SETTINGS.height);
  const [samplerName, setSamplerName] = useState(styleDefaults.samplerName!);
  const [schedulerName, setSchedulerName] = useState(styleDefaults.schedulerName!);
  const [loraStrengthModel, setLoraStrengthModel] = useState(styleDefaults.loraStrengthModel!);
  const [loraStrengthClip, setLoraStrengthClip] = useState(styleDefaults.loraStrengthClip!);
  const [monochromeContrast, setMonochromeContrast] = useState(DEFAULT_SETTINGS.monochromeContrast);
  const [monochromeBrightness, setMonochromeBrightness] = useState(DEFAULT_SETTINGS.monochromeBrightness);
  const [frontpad, setFrontpad] = useState(styleDefaults.frontpad!);
  const [backpad, setBackpad] = useState(styleDefaults.backpad!);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    loadSettings();
  }, [style.id]);

  async function loadSettings() {
    try {
      const response = await fetch(`/api/settings/load?styleId=${style.id}`);
      if (response.ok) {
        const savedSettings = await response.json();
        // Priority: Saved settings > Style defaults > Current state
        setSeed(savedSettings.seed ?? seed);
        setSteps(savedSettings.steps ?? steps);
        setCfg(savedSettings.cfg ?? cfg);
        setDenoise(savedSettings.denoise ?? denoise);
        setGuidance(savedSettings.guidance ?? guidance);
        setWidth(savedSettings.width ?? width);
        setHeight(savedSettings.height ?? height);
        setSamplerName(savedSettings.samplerName ?? samplerName);
        setSchedulerName(savedSettings.schedulerName ?? schedulerName);
        setLoraStrengthModel(savedSettings.loraStrengthModel ?? styleDefaults.loraStrengthModel ?? loraStrengthModel);
        setLoraStrengthClip(savedSettings.loraStrengthClip ?? styleDefaults.loraStrengthClip ?? loraStrengthClip);
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
    setSteps(styleDefaults.steps!);
    setCfg(styleDefaults.cfg!);
    setDenoise(styleDefaults.denoise!);
    setGuidance(styleDefaults.guidance!);
    setWidth(DEFAULT_SETTINGS.width);
    setHeight(DEFAULT_SETTINGS.height);
    setSamplerName(styleDefaults.samplerName!);
    setSchedulerName(styleDefaults.schedulerName!);
    setLoraStrengthModel(styleDefaults.loraStrengthModel!);
    setLoraStrengthClip(styleDefaults.loraStrengthClip!);
    setMonochromeContrast(DEFAULT_SETTINGS.monochromeContrast);
    setMonochromeBrightness(DEFAULT_SETTINGS.monochromeBrightness);
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

  return {
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
    frontpad,
    backpad,
    saveStatus,
    setSeed,
    setSeedLocked,
    setSteps,
    setCfg,
    setDenoise,
    setGuidance,
    setWidth,
    setHeight,
    setSamplerName,
    setSchedulerName,
    setLoraStrengthModel,
    setLoraStrengthClip,
    setMonochromeContrast,
    setMonochromeBrightness,
    setFrontpad,
    setBackpad,
    saveSettings,
    resetSettings,
    resetLoraToDefault,
    randomizeSeed,
  };
}
