import { useEffect, useState } from "react";
import { useValidatorState } from "./hooks/useValidatorState";
import { useSettings } from "../ImageGenerator/hooks/useSettings";
import { SettingsModalRedesigned } from "../ImageGenerator/components/SettingsModalRedesigned";
import { ControlPanel } from "./components/ControlPanel";
import "./Validator.css";
import { GeneratedImageDisplay } from "./components/GeneratedImageDisplay";
import { useImageGeneration } from "./hooks/useImageGeneration";
import { useTestSuiteJob } from "./hooks/useTestSuiteJob";
import { TestSuiteResultsModal } from "./components/TestSuiteResultsModal";
import { TestResultsBrowser } from "./components/TestResultsBrowser";
import { AssessmentPanel } from "./components/AssessmentPanel";
import { useSettingsSets } from "./hooks/useSettingsSets";
import type { SettingsSet } from "./types/settings-set";
import type { TestSuiteResult } from "./types/test-suite";
import { SaveSettingsSetModal } from "./components/SaveSettingsSetModal";
import { LoadSettingsSetModal } from "./components/LoadSettingsSetModal";
import { useStyleAssessments } from "../hooks/useStyleAssessments";
import type { ValidatorCharacter } from "./types/character";

export function Validator() {
  const state = useValidatorState();
  const [showTestBrowser, setShowTestBrowser] = useState(false);
  
  // Fetch assessment ratings for all styles
  const { assessments } = useStyleAssessments(state.styles);

  // Test suite management (background jobs with parallel generation)
  const testSuite = useTestSuiteJob({
    selectedStyle: state.selectedStyle,
    selectedModel: state.selectedModel,
    trainedModels: state.filteredModels,
    styles: state.styles,
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
    loraWeight: state.loraWeight,
    characterLoraWeight: state.characterLoraWeight,
    cineLoraWeight: state.cineLoraWeight,
    monochromeContrast: state.monochromeContrast,
    monochromeBrightness: state.monochromeBrightness,
    frontpad: state.frontpad,
    backpad: state.backpad,
    selectedCharacters: state.selectedCharacters,
    useCameraLora: state.useCameraLora,
    addLog: state.addLog,
  });

  // Auto-load test suites on mount
  useEffect(() => {
    testSuite.loadTestSuites();
  }, []);

  // Settings Sets management
  const settingsSets = useSettingsSets({
    selectedStyle: state.selectedStyle,
    selectedModel: state.selectedModel,
    trainedModels: state.filteredModels,
    styles: state.styles,
    currentRating: state.currentRating,
    currentComment: state.currentComment,
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
    loraWeight: state.loraWeight,
    characterLoraWeight: state.characterLoraWeight,
    cineLoraWeight: state.cineLoraWeight,
    monochromeContrast: state.monochromeContrast,
    monochromeBrightness: state.monochromeBrightness,
    frontpad: state.frontpad,
    backpad: state.backpad,
    generatedImage: state.generatedImage,
    prompt: state.prompt,
    addLog: state.addLog,
  });

  // Load settings sets when style changes
  useEffect(() => {
    if (state.selectedStyle) {
      settingsSets.loadSettingsSets();
    }
  }, [state.selectedStyle]);

  // Function to apply loaded settings
  const applySettings = (settings: SettingsSet) => {
    state.setSeed(settings.seed);
    state.setSeedLocked(settings.seedLocked);
    state.setSteps(settings.steps);
    state.setCfg(settings.cfg);
    state.setDenoise(settings.denoise);
    state.setGuidance(settings.guidance);
    state.setWidth(settings.width);
    state.setHeight(settings.height);
    state.setSamplerName(settings.samplerName);
    state.setSchedulerName(settings.schedulerName);
    state.setLoraWeight(settings.loraWeight);
    state.setCharacterLoraWeight(settings.characterLoraWeight);
    state.setCineLoraWeight(settings.cineLoraWeight);
    state.setMonochromeContrast(settings.monochromeContrast);
    state.setMonochromeBrightness(settings.monochromeBrightness);
    state.setFrontpad(settings.frontpad);
    state.setBackpad(settings.backpad);
    state.setCurrentRating(settings.rating);
    state.setCurrentComment(settings.comment);
    if (settings.testPrompt) {
      state.setPrompt(settings.testPrompt);
    }
  };

  // Settings management (reusing ImageGenerator's useSettings)
  const { loadSettings, saveSettings, resetSettings, saveStylePrompts } = useSettings({
    state: {
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
      loraStrengthModel: state.loraWeight,
      loraStrengthClip: state.loraWeight,
      monochromeContrast: state.monochromeContrast,
      monochromeBrightness: state.monochromeBrightness,
      frontpad: state.frontpad,
      backpad: state.backpad,
    },
    selectedStyle: state.selectedStyle,
    styles: state.styles,
    setters: {
      setSeed: state.setSeed,
      setSeedLocked: state.setSeedLocked,
      setSteps: state.setSteps,
      setCfg: state.setCfg,
      setDenoise: state.setDenoise,
      setGuidance: state.setGuidance,
      setWidth: state.setWidth,
      setHeight: state.setHeight,
      setSamplerName: state.setSamplerName,
      setSchedulerName: state.setSchedulerName,
      setLoraStrengthModel: state.setLoraWeight,
      setLoraStrengthClip: state.setLoraWeight,
      setMonochromeContrast: state.setMonochromeContrast,
      setMonochromeBrightness: state.setMonochromeBrightness,
      setFrontpad: state.setFrontpad,
      setBackpad: state.setBackpad,
      setSaveStatus: state.setSaveStatus,
    },
    addLog: state.addLog,
    reloadStyles: state.reloadStyles,
  });

  // Save settings to registry with Validator-specific LoRA weights
  const saveValidatorSettingsToRegistry = async () => {
    if (!state.selectedStyle) {
      state.addLog('ERROR: No style selected');
      return;
    }
    
    try {
      const currentStyle = state.styles.find(s => s.id === state.selectedStyle);
      const payload = {
        styleId: state.selectedStyle,
        loraWeight: state.loraWeight,
        characterLoraWeight: state.characterLoraWeight,
        cineLoraWeight: state.cineLoraWeight,
        steps: state.steps,
        cfg: state.cfg,
        denoise: state.denoise,
        guidance: state.guidance,
        samplerName: state.samplerName,
        schedulerName: state.schedulerName
      };
      
      console.log('[Validator] Saving settings to registry:', payload);
      state.addLog(`💾 Saving settings to registry for: ${currentStyle?.title || state.selectedStyle}...`);
      
      const response = await fetch('/api/styles/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Validator] Failed to save settings to registry:', errorText);
        throw new Error(`Failed to save settings to registry: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[Validator] Settings saved to registry successfully:', result);
      state.addLog(`✅ Settings saved to registry for: ${currentStyle?.title || state.selectedStyle}`);
      
      // Reload styles from registry to update in-memory cache
      await state.reloadStyles();
      console.log('[Validator] Styles reloaded from registry');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save settings to registry';
      console.error('[Validator] Error saving settings to registry:', err);
      state.addLog(`❌ ERROR: ${errorMsg}`);
    }
  };

  // Toggle "good" flag on trained model
  const handleToggleModelGood = async (modelId: string, actorId: string) => {
    try {
      state.addLog(`🔄 Toggling "good" flag for model ${modelId}...`);
      
      const response = await fetch('/api/training/models/toggle-good', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, actorId })
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle model good flag: ${response.status}`);
      }

      const result = await response.json();
      state.addLog(`✅ Model marked as ${result.good ? 'good' : 'not good'}`);
      
      // Reload models to update the UI
      await state.reloadModels();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to toggle model good flag';
      console.error('[Validator] Error toggling model good:', err);
      state.addLog(`❌ ERROR: ${errorMsg}`);
    }
  };

  // Get frontpad and backpad from selected style
  const selectedStyleData = state.styles.find((s) => s.id === state.selectedStyle);
  const styleFrontpad = selectedStyleData?.frontpad || '';
  const styleBackpad = selectedStyleData?.backpad || '';

  // Image generation
  const { generateImage } = useImageGeneration({
    selectedStyle: state.selectedStyle,
    selectedModel: state.selectedModel,
    trainedModels: state.filteredModels,
    prompt: state.prompt,
    styles: state.styles,
    seed: state.seed,
    seedLocked: state.seedLocked,
    setSeed: state.setSeed,
    steps: state.steps,
    cfg: state.cfg,
    denoise: state.denoise,
    guidance: state.guidance,
    width: state.width,
    height: state.height,
    samplerName: state.samplerName,
    schedulerName: state.schedulerName,
    loraWeight: state.loraWeight,
    characterLoraWeight: state.characterLoraWeight,
    cineLoraWeight: state.cineLoraWeight,
    monochromeContrast: state.monochromeContrast,
    monochromeBrightness: state.monochromeBrightness,
    frontpad: styleFrontpad,
    backpad: styleBackpad,
    selectedCharacters: state.selectedCharacters,
    useCameraLora: state.useCameraLora,
    setLoading: state.setLoading,
    setError: state.setError,
    setGeneratedImage: state.setGeneratedImage,
    setFullPrompt: state.setFullPrompt,
    addLog: state.addLog,
  });

  const handleResetLoraToDefault = () => {
    const styleData = state.styles.find((s) => s.id === state.selectedStyle);
    if (styleData) {
      state.setLoraWeight(styleData.lora_weight || 1.0);
      state.setCharacterLoraWeight(styleData.character_lora_weight || 0.9);
      state.setCineLoraWeight(styleData.cine_lora_weight || 0.8);
      state.addLog(`↺ LoRA weights reset to style defaults`);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(state.fullPrompt);
    state.addLog("✅ Prompt copied");
  };

  const handleCharacterSelect = (character: ValidatorCharacter) => {
    // Toggle character selection
    const exists = state.selectedCharacters.find(c => c.id === character.id);
    if (exists) {
      // Remove if already selected
      state.setSelectedCharacters(state.selectedCharacters.filter(c => c.id !== character.id));
      state.addLog(`➖ Removed character: ${character.name}`);
    } else {
      // Add if not selected
      state.setSelectedCharacters([...state.selectedCharacters, character]);
      state.addLog(`➕ Added character: ${character.name}`);
    }
  };

  const handleCharacterRemove = (characterId: string) => {
    const character = state.selectedCharacters.find(c => c.id === characterId);
    state.setSelectedCharacters(state.selectedCharacters.filter(c => c.id !== characterId));
    if (character) {
      state.addLog(`➖ Removed character: ${character.name}`);
    }
  };

  const handleUseCameraLoraChange = (use: boolean) => {
    state.setUseCameraLora(use);
    state.addLog(use ? "📷 Camera LoRA enabled" : "📷 Camera LoRA disabled");
  };

  const handleLoadTestResult = (result: TestSuiteResult) => {
    testSuite.setTestResults(result);
    testSuite.setShowResultsModal(true);
    state.addLog(`📂 Loaded test result: ${result.suiteName}`);
  };

  return (
    <div className="validator">
      <div className="validator-content">
        <ControlPanel
          styles={state.styles}
          selectedStyle={state.selectedStyle}
          trainedModels={state.trainedModels}
          filteredModels={state.filteredModels}
          selectedModel={state.selectedModel}
          showStyleModal={state.showStyleModal}
          prompt={state.prompt}
          loading={state.loading}
          fullPrompt={state.fullPrompt}
          showPromptPreview={state.showPromptPreview}
          logs={state.logs}
          frontpad={state.frontpad}
          backpad={state.backpad}
          loraWeight={state.loraWeight}
          characterLoraWeight={state.characterLoraWeight}
          cineLoraWeight={state.cineLoraWeight}
          selectedCharacters={state.selectedCharacters}
          useCameraLora={state.useCameraLora}
          assessments={assessments}
          onSelectStyle={state.setSelectedStyle}
          onSelectModel={state.setSelectedModel}
          onToggleModelGood={handleToggleModelGood}
          onToggleStyleModal={state.setShowStyleModal}
          onPromptChange={state.setPrompt}
          onFrontpadChange={state.setFrontpad}
          onBackpadChange={state.setBackpad}
          onSavePromptsToRegistry={saveStylePrompts}
          onCharacterSelect={handleCharacterSelect}
          onCharacterRemove={handleCharacterRemove}
          onUseCameraLoraChange={handleUseCameraLoraChange}
          onTogglePromptPreview={() =>
            state.setShowPromptPreview(!state.showPromptPreview)
          }
          onCopyPrompt={handleCopyPrompt}
          onOpenSettings={() => state.setShowSettingsModal(true)}
          onClearLogs={() => state.setLogs([])}
          onGenerate={generateImage}
          onReloadModels={state.reloadModels}
          onSaveSettingsSet={() => settingsSets.setShowSaveModal(true)}
          onLoadSettingsSet={() => settingsSets.setShowLoadModal(true)}
          testSuites={testSuite.availableSuites}
          selectedTestSuite={testSuite.selectedSuite}
          isRunningTestSuite={testSuite.isRunning}
          testSuiteProgress={testSuite.currentProgress}
          onSelectTestSuite={testSuite.setSelectedSuite}
          onRunTestSuite={testSuite.runTestSuite}
          onLoadTestSuites={testSuite.loadTestSuites}
          onBrowseTestResults={() => setShowTestBrowser(true)}
        />

        <div className="validator-right-panel">
          <AssessmentPanel
            rating={state.currentRating}
            comment={state.currentComment}
            onRatingChange={(rating) => {
              state.setCurrentRating(rating);
              
              // Mark character model as good when rating is 'good'
              if (rating === 'good' && state.selectedCharacters.length > 0) {
                state.selectedCharacters.forEach(character => {
                  console.log('[VALIDATOR] Marking character model as good:', character.id);
                  fetch(`/api/actors/${character.id}/mark-good`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  })
                    .then(response => response.json())
                    .then(data => {
                      console.log('[VALIDATOR] Character model marked as good:', data);
                      state.addLog(`✅ Character model marked as good: ${character.name}`);
                    })
                    .catch(error => {
                      console.error('[VALIDATOR] Failed to mark character as good:', error);
                      state.addLog(`❌ Failed to mark character as good: ${character.name}`);
                    });
                });
              }
            }}
            onCommentChange={state.setCurrentComment}
            disabled={state.loading || testSuite.isRunning}
          />

          <GeneratedImageDisplay
            selectedStyle={state.selectedStyle}
            styles={state.styles}
            generatedImage={state.generatedImage}
            loading={state.loading}
            error={state.error}
            monochromeContrast={state.monochromeContrast}
            monochromeBrightness={state.monochromeBrightness}
          />
        </div>
      </div>

      <SettingsModalRedesigned
        show={state.showSettingsModal}
        selectedStyle={state.selectedStyle}
        styles={state.styles}
        seed={state.seed}
        seedLocked={state.seedLocked}
        steps={state.steps}
        cfg={state.cfg}
        denoise={state.denoise}
        guidance={state.guidance}
        width={state.width}
        height={state.height}
        samplerName={state.samplerName}
        schedulerName={state.schedulerName}
        loraStrengthModel={state.loraWeight}
        loraStrengthClip={state.loraWeight}
        monochromeContrast={state.monochromeContrast}
        monochromeBrightness={state.monochromeBrightness}
        frontpad={state.frontpad}
        backpad={state.backpad}
        saveStatus={state.saveStatus}
        loading={state.loading}
        onOpen={async () => {
          await loadSettings();
        }}
        onClose={async () => {
          await saveSettings();
          state.setShowSettingsModal(false);
        }}
        onSave={async () => {
          await saveSettings();
          await saveValidatorSettingsToRegistry();
        }}
        onSaveToRegistry={saveStylePrompts}
        onReset={resetSettings}
        onResetLoraToDefault={handleResetLoraToDefault}
        onRandomizeSeed={() =>
          state.setSeed(Math.floor(Math.random() * 1000000))
        }
        setSeed={state.setSeed}
        setSeedLocked={state.setSeedLocked}
        setSteps={state.setSteps}
        setCfg={state.setCfg}
        setDenoise={state.setDenoise}
        setGuidance={state.setGuidance}
        setWidth={state.setWidth}
        setHeight={state.setHeight}
        setSamplerName={state.setSamplerName}
        setSchedulerName={state.setSchedulerName}
        setLoraStrengthModel={state.setLoraWeight}
        setLoraStrengthClip={state.setLoraWeight}
        setMonochromeContrast={state.setMonochromeContrast}
        setMonochromeBrightness={state.setMonochromeBrightness}
        setFrontpad={state.setFrontpad}
        setBackpad={state.setBackpad}
      />

      <TestSuiteResultsModal
        show={testSuite.showResultsModal}
        result={testSuite.testResults}
        onClose={() => testSuite.setShowResultsModal(false)}
      />

      <TestResultsBrowser
        show={showTestBrowser}
        onClose={() => setShowTestBrowser(false)}
        onLoadResult={handleLoadTestResult}
        selectedStyle={state.selectedStyle}
      />

      <SaveSettingsSetModal
        show={settingsSets.showSaveModal}
        onClose={() => settingsSets.setShowSaveModal(false)}
        onSave={settingsSets.saveSettingsSet}
        currentRating={state.currentRating}
        currentComment={state.currentComment}
      />

      <LoadSettingsSetModal
        show={settingsSets.showLoadModal}
        settingsSets={settingsSets.settingsSets}
        onClose={() => settingsSets.setShowLoadModal(false)}
        onLoad={(id) => settingsSets.loadSettingsSet(id, applySettings)}
        onDelete={settingsSets.deleteSettingsSet}
      />
    </div>
  );
}
