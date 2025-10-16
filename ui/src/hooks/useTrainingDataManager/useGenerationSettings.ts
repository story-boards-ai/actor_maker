import { useState, useEffect } from 'react';
import type { Actor } from '../../types';
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

export function useGenerationSettings(actor: Actor): UseGenerationSettingsReturn {
  const actorDefaults = getDefaultSettings(actor);
  
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [seedLocked, setSeedLocked] = useState(DEFAULT_SETTINGS.seedLocked);
  const [steps, setSteps] = useState(actorDefaults.steps!);
  const [cfg, setCfg] = useState(actorDefaults.cfg!);
  const [denoise, setDenoise] = useState(actorDefaults.denoise!);
  const [guidance, setGuidance] = useState(actorDefaults.guidance!);
  const [width, setWidth] = useState(DEFAULT_SETTINGS.width);
  const [height, setHeight] = useState(DEFAULT_SETTINGS.height);
  const [samplerName, setSamplerName] = useState(actorDefaults.samplerName!);
  const [schedulerName, setSchedulerName] = useState(actorDefaults.schedulerName!);
  const [loraStrengthModel, setLoraStrengthModel] = useState(actorDefaults.loraStrengthModel!);
  const [loraStrengthClip, setLoraStrengthClip] = useState(actorDefaults.loraStrengthClip!);
  const [monochromeContrast, setMonochromeContrast] = useState(DEFAULT_SETTINGS.monochromeContrast);
  const [monochromeBrightness, setMonochromeBrightness] = useState(DEFAULT_SETTINGS.monochromeBrightness);
  const [frontpad, setFrontpad] = useState(actorDefaults.frontpad!);
  const [backpad, setBackpad] = useState(actorDefaults.backpad!);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    loadSettings();
  }, [actor.id]);

  async function loadSettings() {
    try {
      const response = await fetch(`/api/settings/load?styleId=${actor.id}`);
      if (response.ok) {
        const savedSettings = await response.json();
        // Priority: Saved settings > Actor defaults > Current state
        setSeed(savedSettings.seed ?? seed);
        setSteps(savedSettings.steps ?? steps);
        setCfg(savedSettings.cfg ?? cfg);
        setDenoise(savedSettings.denoise ?? denoise);
        setGuidance(savedSettings.guidance ?? guidance);
        setWidth(savedSettings.width ?? width);
        setHeight(savedSettings.height ?? height);
        setSamplerName(savedSettings.samplerName ?? samplerName);
        setSchedulerName(savedSettings.schedulerName ?? schedulerName);
        setLoraStrengthModel(savedSettings.loraStrengthModel ?? actorDefaults.loraStrengthModel ?? loraStrengthModel);
        setLoraStrengthClip(savedSettings.loraStrengthClip ?? actorDefaults.loraStrengthClip ?? loraStrengthClip);
        setSeedLocked(savedSettings.seedLocked ?? false);
        setMonochromeContrast(savedSettings.monochromeContrast ?? monochromeContrast);
        setMonochromeBrightness(savedSettings.monochromeBrightness ?? monochromeBrightness);
        console.log('✅ Loaded saved settings for actor:', actor.id);
      } else {
        console.log('ℹ️ No saved settings found, using actor defaults');
      }
    } catch (err) {
      console.warn('⚠️ Could not load saved settings, using actor defaults');
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
        styleId: actor.id.toString()
      };

      const response = await fetch(`/api/settings/save?styleId=${actor.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave)
      });

      if (response.ok) {
        console.log('✅ Settings saved for actor:', actor.id);
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
    setSteps(actorDefaults.steps!);
    setCfg(actorDefaults.cfg!);
    setDenoise(actorDefaults.denoise!);
    setGuidance(actorDefaults.guidance!);
    setWidth(DEFAULT_SETTINGS.width);
    setHeight(DEFAULT_SETTINGS.height);
    setSamplerName(actorDefaults.samplerName!);
    setSchedulerName(actorDefaults.schedulerName!);
    setLoraStrengthModel(actorDefaults.loraStrengthModel!);
    setLoraStrengthClip(actorDefaults.loraStrengthClip!);
    setMonochromeContrast(DEFAULT_SETTINGS.monochromeContrast);
    setMonochromeBrightness(DEFAULT_SETTINGS.monochromeBrightness);
    setSeedLocked(false);
    console.log('↺ Settings reset to actor defaults');
  }

  function resetLoraToDefault() {
    // Actors don't have individual lora_weight settings, use default
    const defaultLoraWeight = 1.0;
    setLoraStrengthModel(defaultLoraWeight);
    setLoraStrengthClip(defaultLoraWeight);
    console.log('↺ LoRA strengths reset to default:', defaultLoraWeight);
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
