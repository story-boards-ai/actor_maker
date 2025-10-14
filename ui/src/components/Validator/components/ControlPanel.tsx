import React from "react";
import type { Style } from "../../../types";
import { StyleSelectorModal } from "../../StyleSelectorModal";
import type { TrainedModel } from "../hooks/useValidatorState";
import type { TestSuite } from "../types/test-suite";
import type { ValidatorCharacter } from "../types/character";
import { CharacterSelectionModal } from "./CharacterSelectionModal";

type AssessmentRating = 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed' | null;

interface ControlPanelProps {
  styles: Style[];
  selectedStyle: string;
  trainedModels: TrainedModel[];
  filteredModels: TrainedModel[];
  selectedModel: string;
  showStyleModal: boolean;
  prompt: string;
  loading: boolean;
  fullPrompt: string;
  showPromptPreview: boolean;
  logs: string[];
  frontpad: string;
  backpad: string;
  loraWeight: number;
  characterLoraWeight: number;
  cineLoraWeight: number;
  selectedCharacters: ValidatorCharacter[];
  useCameraLora: boolean;
  assessments?: Record<string, AssessmentRating>;
  onSelectStyle: (styleId: string) => void;
  onSelectModel: (modelId: string) => void;
  onToggleStyleModal: (open: boolean) => void;
  onPromptChange: (prompt: string) => void;
  onFrontpadChange: (frontpad: string) => void;
  onBackpadChange: (backpad: string) => void;
  onSavePromptsToRegistry?: () => void;
  onCharacterSelect: (character: ValidatorCharacter) => void;
  onCharacterRemove: (characterId: string) => void;
  onUseCameraLoraChange: (use: boolean) => void;
  onTogglePromptPreview: () => void;
  onCopyPrompt: () => void;
  onOpenSettings: () => void;
  onClearLogs: () => void;
  onGenerate: () => void;
  onReloadModels: () => void;
  // Settings Sets props
  onSaveSettingsSet?: () => void;
  onLoadSettingsSet?: () => void;
  // Test suite props
  testSuites?: TestSuite[];
  selectedTestSuite?: string | null;
  isRunningTestSuite?: boolean;
  testSuiteProgress?: { current: number; total: number };
  onSelectTestSuite?: (suiteId: string | null) => void;
  onRunTestSuite?: () => void;
  onLoadTestSuites?: () => void;
  onBrowseTestResults?: () => void;
}

export function ControlPanel(props: ControlPanelProps) {
  const [registrySaved, setRegistrySaved] = React.useState(false);
  const [showCharacterModal, setShowCharacterModal] = React.useState(false);

  const handleSaveToRegistry = async () => {
    if (props.onSavePromptsToRegistry) {
      await props.onSavePromptsToRegistry();
      setRegistrySaved(true);
      setTimeout(() => setRegistrySaved(false), 1500);
    }
  };

  const {
    styles,
    selectedStyle,
    trainedModels,
    filteredModels,
    selectedModel,
    showStyleModal,
    prompt,
    loading,
    fullPrompt,
    showPromptPreview,
    logs,
    frontpad,
    backpad,
    loraWeight,
    characterLoraWeight,
    cineLoraWeight,
    selectedCharacters,
    useCameraLora,
    assessments = {},
    onSelectStyle,
    onSelectModel,
    onToggleStyleModal,
    onPromptChange,
    onFrontpadChange,
    onBackpadChange,
    onSavePromptsToRegistry,
    onCharacterSelect,
    onCharacterRemove,
    onUseCameraLoraChange,
    onTogglePromptPreview,
    onCopyPrompt,
    onOpenSettings,
    onClearLogs,
    onGenerate,
    onReloadModels,
    onSaveSettingsSet,
    onLoadSettingsSet,
    testSuites = [],
    selectedTestSuite,
    isRunningTestSuite = false,
    testSuiteProgress,
    onSelectTestSuite,
    onRunTestSuite,
    onLoadTestSuites,
    onBrowseTestResults,
  } = props;

  const selectedStyleData = styles.find((s) => s.id === selectedStyle);
  const selectedModelData = trainedModels.find((m) => m.id === selectedModel);

  return (
    <div className="validator-control-panel">
      {/* Style Selection */}
      <div className="control-section">
        <label className="control-label">
          🎨 Style Selection
        </label>
        <button
          onClick={() => onToggleStyleModal(true)}
          disabled={loading}
          className="style-selector-button"
        >
          {selectedStyleData ? (
            <div className="selected-style-preview">
              <img 
                src={`/public/${selectedStyleData.image_path}`} 
                alt={selectedStyleData.title}
                className="selected-style-image"
              />
              <div className="selected-style-info">
                <span className="selected-style-name">{selectedStyleData.title}</span>
                <span className="selected-style-meta">{selectedStyleData.lora_name}</span>
              </div>
            </div>
          ) : (
            <div className="style-selector-placeholder">
              <span className="placeholder-icon">🎨</span>
              <span>Select a Style</span>
            </div>
          )}
        </button>

        <StyleSelectorModal
          styles={styles}
          selectedStyle={selectedStyle}
          onSelect={onSelectStyle}
          open={showStyleModal}
          onOpenChange={onToggleStyleModal}
          assessments={assessments}
        />

        {selectedStyleData && (
          <div className="style-info">
            <div className="style-info-item">
              <strong>Monochrome:</strong> {selectedStyleData.monochrome ? "Yes" : "No"}
            </div>
            <div className="style-info-item">
              <strong>LoRA Weight:</strong> {loraWeight.toFixed(2)}
            </div>
            <div className="style-info-item">
              <strong>Character Weight:</strong> {characterLoraWeight.toFixed(2)}
            </div>
            <div className="style-info-item">
              <strong>Cine Weight:</strong> {cineLoraWeight.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="control-section">
        <div className="control-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🔥 Trained LoRA Model</span>
          <button 
            onClick={onReloadModels}
            className="btn-reload-models"
            title="Reload trained models"
            style={{ 
              padding: '4px 8px', 
              fontSize: '12px', 
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              borderRadius: '4px',
              color: '#60a5fa',
              cursor: 'pointer'
            }}
          >
            🔄 Reload
          </button>
        </div>
        {!selectedStyle ? (
          <div className="model-empty">
            <p>Select a style first to see available models.</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="model-empty">
            <p>No trained models for this style yet.</p>
            <p className="model-hint">
              {trainedModels.length > 0 
                ? 'Train a model for this style from the Training tab.' 
                : 'Train LoRA models from the Training tab to use them here for validation.'}
            </p>
          </div>
        ) : (
          <>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              disabled={loading}
              className="style-select"
            >
              {filteredModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({new Date(model.timestamp).toLocaleDateString()})
                </option>
              ))}
            </select>
            {selectedModelData && (
              <div className="model-info">
                <p className="model-description">
                  <strong>Style:</strong> {selectedModelData.styleName}
                </p>
                {selectedModelData.description && (
                  <p className="model-description">{selectedModelData.description}</p>
                )}
                {selectedModelData.imageCount && (
                  <p className="model-meta">Trained on {selectedModelData.imageCount} images</p>
                )}
                {selectedModelData.parameters && (
                  <p className="model-meta">
                    Steps: {selectedModelData.parameters.max_train_steps}, 
                    LR: {selectedModelData.parameters.learning_rate}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Settings Sets Management */}
      {selectedStyle && selectedModel && (
        <div className="control-section settings-sets-section">
          <div className="control-label">
            💾 Settings Sets
          </div>
          <div className="settings-sets-buttons">
            <button
              onClick={onSaveSettingsSet}
              disabled={loading || isRunningTestSuite}
              className="btn-settings-set save"
              title="Save current settings as a reusable configuration"
            >
              💾 Save Current Settings
            </button>
            <button
              onClick={onLoadSettingsSet}
              disabled={loading || isRunningTestSuite}
              className="btn-settings-set load"
              title="Load a previously saved configuration"
            >
              📂 Load Settings
            </button>
          </div>
          <p className="settings-sets-hint">
            Save your current configuration with assessment and notes for future reference
          </p>
        </div>
      )}

      {/* Main Prompt */}
      <div className="control-section">
        <div className="control-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✏️ Main Prompt</span>
          <button
            onClick={() => setShowCharacterModal(true)}
            disabled={loading}
            className="btn-add-character"
            title="Add characters to prompt"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              background: 'rgba(251, 146, 60, 0.2)',
              border: '1px solid rgba(251, 146, 60, 0.3)',
              borderRadius: '4px',
              color: '#fb923c',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            👤 Add Character
          </button>
        </div>
        
        {/* Selected Characters Display */}
        {selectedCharacters.length > 0 && (
          <div style={{
            marginBottom: '8px',
            padding: '8px',
            background: 'rgba(251, 146, 60, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(251, 146, 60, 0.2)'
          }}>
            <div style={{ fontSize: '12px', color: '#fb923c', marginBottom: '4px', fontWeight: 600 }}>
              Selected Characters:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedCharacters.map((char) => (
                <div
                  key={char.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#fff'
                  }}
                >
                  <span>{char.name.replace(/_/g, ' ')}</span>
                  <button
                    onClick={() => onCharacterRemove(char.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '0 4px',
                      fontSize: '14px'
                    }}
                    title="Remove character"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          disabled={loading}
          placeholder="Enter your prompt here..."
          className="prompt-textarea"
          rows={4}
        />
      </div>

      {/* Camera LoRA Option */}
      <div className="control-section">
        <label className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={useCameraLora}
            onChange={(e) => onUseCameraLoraChange(e.target.checked)}
            disabled={loading}
            style={{ cursor: 'pointer' }}
          />
          <span>📷 Use Camera LoRA (FILM-V3-FLUX)</span>
        </label>
        {useCameraLora && (
          <div className="style-info-item" style={{ marginTop: '4px', fontSize: '12px', color: '#999' }}>
            Camera LoRA will be added to the LoRA stack with weight: {cineLoraWeight.toFixed(2)}
          </div>
        )}
      </div>

      {/* Front Pad */}
      <div className="control-section">
        <label htmlFor="frontpad-input" className="control-label">
          ⬆️ Front Pad (Prefix)
          {onSavePromptsToRegistry && (
            <button
              type="button"
              className={`save-registry-button ${registrySaved ? 'saved' : ''}`}
              onClick={handleSaveToRegistry}
              title="Save Front Pad and Back Pad to the style registry"
            >
              {registrySaved ? '✅ Saved!' : '💾 Save to Registry'}
            </button>
          )}
        </label>
        <textarea
          id="frontpad-input"
          value={frontpad}
          onChange={(e) => onFrontpadChange(e.target.value)}
          disabled={loading}
          placeholder="Text added before the main prompt..."
          className="frontpad-textarea"
          rows={2}
        />
      </div>

      {/* Back Pad */}
      <div className="control-section">
        <label htmlFor="backpad-input" className="control-label">
          ⬇️ Back Pad (Suffix)
          {onSavePromptsToRegistry && (
            <button
              type="button"
              className={`save-registry-button ${registrySaved ? 'saved' : ''}`}
              onClick={handleSaveToRegistry}
              title="Save Front Pad and Back Pad to the style registry"
            >
              {registrySaved ? '✅ Saved!' : '💾 Save to Registry'}
            </button>
          )}
        </label>
        <textarea
          id="backpad-input"
          value={backpad}
          onChange={(e) => onBackpadChange(e.target.value)}
          disabled={loading}
          placeholder="Text added after the main prompt..."
          className="backpad-textarea"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="control-section">
        <div className="action-buttons">
          <button
            onClick={onGenerate}
            disabled={loading || !selectedStyle || !selectedModel || !prompt || trainedModels.length === 0 || isRunningTestSuite}
            className="btn-generate"
            title={
              trainedModels.length === 0 
                ? "Train a LoRA model first" 
                : !selectedModel 
                ? "Select a trained model" 
                : !selectedStyle 
                ? "Select a style" 
                : !prompt 
                ? "Enter a prompt" 
                : "Generate image"
            }
          >
            {loading ? "⏳ Generating..." : "🚀 Generate Image"}
          </button>
          <button
            onClick={onOpenSettings}
            disabled={loading || isRunningTestSuite}
            className="btn-settings"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Test Suite Section */}
      <div className="control-section test-suite-section">
        <div className="control-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span>🎬 Test Suite</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={onBrowseTestResults}
              className="btn-reload-models"
              disabled={isRunningTestSuite || !selectedStyle}
              title="Browse previous test results"
              style={{ 
                padding: '4px 8px', 
                fontSize: '12px', 
                background: 'rgba(96, 165, 250, 0.2)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                borderRadius: '4px',
                color: '#60a5fa',
                cursor: (isRunningTestSuite || !selectedStyle) ? 'not-allowed' : 'pointer'
              }}
            >
              📖 Browse
            </button>
            <button 
              onClick={onLoadTestSuites}
              className="btn-reload-models"
              disabled={isRunningTestSuite}
              title="Load test suites"
              style={{ 
                padding: '4px 8px', 
                fontSize: '12px', 
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                borderRadius: '4px',
                color: '#a78bfa',
                cursor: isRunningTestSuite ? 'not-allowed' : 'pointer'
              }}
            >
              📂 Load
            </button>
          </div>
        </div>
        
        {testSuites.length === 0 ? (
          <div className="model-empty">
            <p>No test suites loaded.</p>
            <p className="model-hint">Click "Load" to load available test suites.</p>
          </div>
        ) : (
          <>
            <select
              value={selectedTestSuite || ''}
              onChange={(e) => onSelectTestSuite?.(e.target.value || null)}
              disabled={loading || isRunningTestSuite}
              className="style-select"
            >
              <option value="">Select a test suite...</option>
              {testSuites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name} ({suite.prompts.length} prompts)
                </option>
              ))}
            </select>
            
            {selectedTestSuite && (
              <div className="model-info">
                {testSuites.find(s => s.id === selectedTestSuite)?.description}
              </div>
            )}
            
            {isRunningTestSuite && testSuiteProgress && (
              <div className="test-suite-progress">
                <div className="progress-text">
                  <span>⚡ Running in background</span>
                  <span>{testSuiteProgress.current} / {testSuiteProgress.total}</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${(testSuiteProgress.current / testSuiteProgress.total) * 100}%` 
                    }}
                  />
                </div>
                <div className="progress-hint">
                  💡 You can navigate away - job continues in background
                </div>
              </div>
            )}
            
            <button
              onClick={onRunTestSuite}
              disabled={loading || isRunningTestSuite || !selectedStyle || !selectedModel || !selectedTestSuite || trainedModels.length === 0}
              className="btn-test-suite"
              title={
                !selectedStyle || !selectedModel || trainedModels.length === 0
                  ? "Select style and model first"
                  : !selectedTestSuite
                  ? "Select a test suite first"
                  : "Run full test suite"
              }
            >
              {isRunningTestSuite ? "⏳ Running Test Suite..." : "🎬 Run Test Suite"}
            </button>
          </>
        )}
      </div>

      {/* Full Prompt Preview */}
      {selectedStyle && (
        <div className="control-section">
          <div className="prompt-preview-header">
            <button
              onClick={onTogglePromptPreview}
              className="btn-toggle-preview"
            >
              {showPromptPreview ? "▼" : "▶"} Full Prompt Preview
            </button>
            {showPromptPreview && fullPrompt && (
              <button onClick={onCopyPrompt} className="btn-copy-prompt">
                📋 Copy
              </button>
            )}
          </div>
          {showPromptPreview && (
            <div className="prompt-preview-content">
              {fullPrompt || "Prompt will appear here after generation starts..."}
            </div>
          )}
        </div>
      )}

      {/* Generation Logs */}
      <div className="control-section logs-section">
        <div className="logs-header">
          <span className="control-label">📜 Generation Logs</span>
          <button onClick={onClearLogs} className="btn-clear-logs">
            🗑️ Clear
          </button>
        </div>
        <div className="logs-container">
          {logs.length === 0 ? (
            <div className="logs-empty">No logs yet...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="log-entry">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Character Selection Modal */}
      <CharacterSelectionModal
        open={showCharacterModal}
        onClose={() => setShowCharacterModal(false)}
        onSelect={onCharacterSelect}
        selectedCharacters={selectedCharacters}
      />
    </div>
  );
}
