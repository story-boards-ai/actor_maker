import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Style, StyleRegistry } from "../../types";
import { StyleSelectorModal } from "../StyleSelectorModal";
import { NgrokPanel } from "./components/NgrokPanel";
import { DatasetSelector } from "./components/DatasetSelector";
import { ParametersForm } from "./components/ParametersForm";
import { ConsolePanel } from "./components/ConsolePanel";
import { VersionsPanel } from "./components/VersionsPanel";
import { ValidationModal } from "./components/ValidationModal";
import { TrainingGuidelinesModal } from "./components/TrainingGuidelinesModal";
import { SleepWarningBanner } from "./components/SleepWarningBanner";
import { VersionSelector } from "./components/VersionSelector";
import { useTrainingState } from "./hooks/useTrainingState";
import { useTrainingOperations } from "./hooks/useTrainingOperations";
import { useNgrok } from "./hooks/useNgrok";
import { useDataLoading } from "./hooks/useDataLoading";
import { clearAllStoredState } from "./utils/storage";
import {
  autoAdjustParameters,
  calculateRecommendedSteps,
} from "./utils/calculations";
import "../LoRATrainingTab.css";

export function LoRATrainingTab() {
  // Load all styles
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [stylesLoading, setStylesLoading] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Load styles on mount
  useEffect(() => {
    async function loadStyles() {
      try {
        const response = await fetch("/styles_registry.json");
        if (!response.ok) {
          throw new Error("Failed to load styles registry");
        }
        const registry: StyleRegistry = await response.json();
        setStyles(registry.styles);
      } catch (err) {
        console.error("Failed to load styles:", err);
        toast.error("Failed to load styles");
      } finally {
        setStylesLoading(false);
      }
    }
    loadStyles();
  }, []);

  const selectedStyle = styles.find((s) => s.id === selectedStyleId);

  // Training state
  const state = useTrainingState(selectedStyleId, selectedStyle);

  // Auto-fill trigger token when style is selected
  useEffect(() => {
    if (selectedStyleId && selectedStyle) {
      // Only auto-fill if the current token is empty or matches the default pattern
      const currentToken = state.parameters.class_tokens;
      const isDefaultOrEmpty =
        !currentToken ||
        currentToken === "" ||
        currentToken.startsWith("style SBai_style_");

      if (isDefaultOrEmpty) {
        const autoToken =
          selectedStyle.trigger_words || `style SBai_style_${selectedStyleId}`;
        state.setParameters((prev) => ({
          ...prev,
          class_tokens: autoToken,
        }));
      }
    }
  }, [selectedStyleId, selectedStyle]);

  // Ngrok operations
  const ngrok = useNgrok();

  // Data loading (used for side effects - loading data on mount)
  useDataLoading({
    selectedStyleId,
    selectedSetId: state.selectedSetId,
    selectionSets: state.selectionSets,
    setSelectionSets: state.setSelectionSets,
    setVersions: state.setVersions,
    setS3SyncStatus: state.setS3SyncStatus,
    checkNgrokStatus: ngrok.checkNgrokStatus,
    addLog: (type, message) => {
      const timestamp = new Date().toLocaleTimeString();
      state.setConsoleLogs((prev) => [...prev, { timestamp, type, message }]);
    },
    setLoadingStates: state.setLoadingStates,
  });

  // Training operations
  const operations = useTrainingOperations({
    selectedStyleId,
    selectedSetId: state.selectedSetId,
    selectionSets: state.selectionSets,
    parameters: state.parameters,
    description: state.description,
    versions: state.versions,
    ngrokUrl: ngrok.ngrokUrl,
    isNgrokRunning: ngrok.isNgrokRunning,
    loading: state.loading,
    setLoading: state.setLoading,
    setConsoleLogs: state.setConsoleLogs,
    setActiveTab: state.setActiveTab,
    setVersions: state.setVersions,
    setCurrentTraining: state.setCurrentTraining,
    setDescription: state.setDescription,
    setShowValidationModal: state.setShowValidationModal,
    setValidationIssue: state.setValidationIssue,
    currentTraining: state.currentTraining,
  });

  // Automatic polling for training status
  useEffect(() => {
    if (!state.currentTraining || state.currentTraining.status !== "training")
      return;

    const pollInterval = setInterval(async () => {
      console.log("[Training] Auto-polling training status...");
      await operations.checkTrainingStatus();
    }, 30000);

    const timeoutId = setTimeout(() => {
      console.log("[Training] Initial status check on mount...");
      operations.checkTrainingStatus();
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeoutId);
    };
  }, [state.currentTraining?.jobId, state.currentTraining?.status]);

  // Calculate recommended steps
  const selectedSet = state.selectionSets.find(
    (s) => s.id === state.selectedSetId
  );
  const imageCount = selectedSet?.filenames.length || 0;
  const recommendedSteps = calculateRecommendedSteps(imageCount);

  // Auto-adjust parameters handler
  const handleAutoAdjust = () => {
    try {
      const newParams = autoAdjustParameters(state.parameters, imageCount);
      state.setParameters(newParams);

      const actualStepsPerImage = Math.round(
        newParams.max_train_steps / (imageCount * newParams.num_repeats)
      );

      toast.success(
        `Auto-adjusted for ${imageCount} images:\n` +
          `${newParams.max_train_steps} total steps (${actualStepsPerImage} steps/image)\n` +
          `LR: ${newParams.learning_rate}, Repeats: ${newParams.num_repeats}`
      );

      if (imageCount > 60) {
        toast.warning(
          `${imageCount} images is large - consider curating to 30-60 best images for stronger style`
        );
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Clear all stored state handler
  const handleClearState = () => {
    if (!selectedStyleId) return;
    clearAllStoredState(selectedStyleId);
    toast.success("All stored state cleared. Refresh to reset.");
  };

  // Version management handlers
  const handleSelectVersion = (versionId: string | null) => {
    state.setSelectedVersionId(versionId);
    if (versionId) {
      const version = state.versions.find((v) => v.id === versionId);
      if (version) {
        toast.success(`Loaded configuration: ${version.name}`);

        // If version is pending or training, set it as current training and check status
        if (version.status === "pending" || version.status === "training") {
          const timestamp = new Date().toLocaleTimeString();
          state.setConsoleLogs([
            {
              timestamp,
              type: "info",
              message: `📋 Loaded training: ${version.name}`,
            },
            { timestamp, type: "info", message: `🔍 Job ID: ${version.id}` },
            {
              timestamp,
              type: "info",
              message: `⏱️ Started: ${new Date(
                version.timestamp
              ).toLocaleString()}`,
            },
            {
              timestamp,
              type: "info",
              message:
                '💡 Click "Check Status" to get latest updates from RunPod',
            },
          ]);

          state.setCurrentTraining({
            jobId: version.id,
            startTime: new Date(version.timestamp).getTime(),
            estimatedDuration: 0,
            status: version.status === "training" ? "training" : "pending",
          });

          state.setActiveTab("console");
          toast.info(
            'Use "Check Status" button to get latest updates (RunPod keeps status for 24h)'
          );
        }
      }
    }
  };

  const handleNewVersion = () => {
    // Clear current version selection to start fresh
    state.setSelectedVersionId(null);
    state.setParameters({
      ...state.parameters,
      // Keep trigger token but reset other parameters to defaults
    });
    state.setSelectedSetId(null);
    state.setDescription("");
    state.setCurrentTraining(null);
    toast.info("Ready to create new training configuration");
  };

  const handleCheckStatusFromHistory = (jobId: string) => {
    const version = state.versions.find((v) => v.id === jobId);
    if (!version) return;

    // Set this version as current training
    state.setCurrentTraining({
      jobId: version.id,
      startTime: new Date(version.timestamp).getTime(),
      estimatedDuration: 0,
      status: version.status === "training" ? "training" : "pending",
    });

    // Switch to console tab and check status
    state.setActiveTab("console");

    const timestamp = new Date().toLocaleTimeString();
    state.setConsoleLogs([
      {
        timestamp,
        type: "info",
        message: `📋 Checking status for: ${version.name}`,
      },
      { timestamp, type: "info", message: `🔍 Job ID: ${version.id}` },
    ]);

    // Trigger status check
    setTimeout(() => {
      operations.checkTrainingStatus();
    }, 100);
  };

  const handleMarkAsGood = async (versionId: string) => {
    if (!selectedStyleId) {
      console.error('[Mark as Good] No style ID selected');
      return;
    }

    console.log(`[Mark as Good] Marking version ${versionId} as good for style ${selectedStyleId}`);

    try {
      const url = `/api/styles/${selectedStyleId}/mark-good`;
      console.log(`[Mark as Good] Calling API: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });

      console.log(`[Mark as Good] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Mark as Good] API error: ${errorText}`);
        throw new Error(`Failed to mark version as good: ${errorText}`);
      }

      const data = await response.json();
      console.log(`[Mark as Good] API response:`, data);
      
      // Update local state with the new versions
      state.setVersions(data.versions);
      
      const version = data.versions.find((v: any) => v.id === versionId);
      console.log(`[Mark as Good] ✅ Success! Version:`, version);
      toast.success(`✅ Marked "${version?.name}" as good and updated styles registry`);
      
      const timestamp = new Date().toLocaleTimeString();
      state.setConsoleLogs((prev) => [
        ...prev,
        {
          timestamp,
          type: 'success',
          message: `✅ Marked version as good: ${version?.name}`,
        },
        {
          timestamp,
          type: 'info',
          message: '📝 Updated styles registry with validated LoRA model',
        },
      ]);
    } catch (error) {
      console.error('[Mark as Good] Error:', error);
      toast.error(`Failed to mark version as good: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Show loading state while styles are loading
  if (stylesLoading) {
    return (
      <div className="lora-training-tab">
        <div className="training-header">
          <h2>LoRA Training</h2>
        </div>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <div className="spinner"></div>
          <p>Loading styles registry...</p>
        </div>
      </div>
    );
  }

  // Show granular loading indicators
  const isLoadingData =
    state.loadingStates.selectionSets ||
    state.loadingStates.versions ||
    state.loadingStates.s3Sync;
  const loadingMessage = state.loadingStates.selectionSets
    ? "Loading datasets..."
    : state.loadingStates.versions
    ? "Loading training history..."
    : state.loadingStates.s3Sync
    ? "Checking S3 sync status..."
    : "";

  return (
    <div className="lora-training-tab">
      <div className="training-header">
        <h2>LoRA Training</h2>
        {isLoadingData && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              color: "var(--orange-9)",
            }}
          >
            <div
              className="spinner"
              style={{ width: "16px", height: "16px" }}
            ></div>
            <span>{loadingMessage}</span>
          </div>
        )}
      </div>

      <div className="training-content">
        {/* Left Panel: Configuration */}
        <div className="config-panel">
          {/* Style Selection */}
          <div className="config-section">
            <h4>Style Selection</h4>
            <button
              onClick={() => setShowStyleModal(true)}
              disabled={state.loading}
              className="style-selector-button"
            >
              {selectedStyle ? (
                <div className="selected-style-preview">
                  <img
                    src={`/public/${selectedStyle.image_path}`}
                    alt={selectedStyle.title}
                    className="selected-style-image"
                  />
                  <div className="selected-style-info">
                    <span className="selected-style-name">
                      {selectedStyle.title}
                    </span>
                    <span className="selected-style-meta">
                      {selectedStyle.lora_name}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="style-selector-placeholder">
                  <span className="placeholder-icon">🎨</span>
                  <span>Select a Style to Train</span>
                </div>
              )}
            </button>

            <StyleSelectorModal
              styles={styles}
              selectedStyle={selectedStyleId || ""}
              onSelect={setSelectedStyleId}
              open={showStyleModal}
              onOpenChange={setShowStyleModal}
            />
          </div>

          {!selectedStyle && (
            <div
              style={{ padding: "2rem", textAlign: "center", color: "#888" }}
            >
              <p>Please select a style to begin training configuration.</p>
            </div>
          )}

          {selectedStyle && (
            <>
              {/* Version Selector with NEW button */}
              <VersionSelector
                versions={state.versions}
                selectedVersionId={state.selectedVersionId}
                onSelectVersion={handleSelectVersion}
                onNewVersion={handleNewVersion}
                disabled={state.loading}
              />

              {/* Sleep Warning Banner */}
              <SleepWarningBanner
                currentTraining={state.currentTraining}
                ngrokUrl={ngrok.ngrokUrl}
              />

              {/* Ngrok Status */}
              <NgrokPanel
                isRunning={ngrok.isNgrokRunning}
                url={ngrok.ngrokUrl}
                port={ngrok.ngrokPort}
                loading={ngrok.loading}
                onStart={ngrok.startNgrok}
                onStop={ngrok.stopNgrok}
              />

              {/* Dataset Selection */}
              <DatasetSelector
                selectionSets={state.selectionSets}
                selectedSetId={state.selectedSetId}
                onSelectSet={state.setSelectedSetId}
                s3SyncStatus={state.s3SyncStatus}
                recommendedSteps={recommendedSteps}
                loading={state.loading}
                onAutoAdjust={handleAutoAdjust}
              />

              {/* Training Description */}
              <div className="config-section">
                <h4>Training Description (Optional)</h4>
                <textarea
                  value={state.description}
                  onChange={(e) => state.setDescription(e.target.value)}
                  placeholder="e.g., Testing higher learning rate, Using curated dataset with better captions..."
                  rows={3}
                  disabled={state.loading}
                  className="training-description"
                />
                <p className="help-text">
                  Version name will be auto-generated (V1, V2, V3, etc.)
                </p>
              </div>

              {/* Core & Advanced Parameters */}
              <ParametersForm
                parameters={state.parameters}
                onUpdate={state.setParameters}
                recommendedSteps={recommendedSteps}
                loading={state.loading}
                showAdvanced={state.showAdvanced}
                onToggleAdvanced={() =>
                  state.setShowAdvanced(!state.showAdvanced)
                }
                onShowInfo={() => setShowInfoModal(true)}
              />

              {/* Start Training Button */}
              <button
                className="start-training-btn"
                onClick={operations.validateAndStartTraining}
                disabled={
                  state.loading || !state.selectedSetId || !ngrok.isNgrokRunning
                }
              >
                {state.loading ? "Starting Training..." : "Start Training"}
              </button>
            </>
          )}
        </div>

        {/* Right Panel: Console / Training Versions */}
        {selectedStyle && (
          <div className="versions-panel">
            <div className="panel-tabs">
              <button
                className={`panel-tab ${
                  state.activeTab === "console" ? "active" : ""
                }`}
                onClick={() => state.setActiveTab("console")}
              >
                📟 Console
              </button>
              <button
                className={`panel-tab ${
                  state.activeTab === "versions" ? "active" : ""
                }`}
                onClick={() => state.setActiveTab("versions")}
              >
                📚 History
              </button>
              {state.activeTab === "console" && (
                <div
                  style={{ display: "flex", gap: "8px", marginLeft: "auto" }}
                >
                  {state.consoleLogs.length > 0 && (
                    <button
                      className="clear-logs-btn"
                      onClick={operations.clearLogs}
                    >
                      Clear Logs
                    </button>
                  )}
                  <button
                    className="clear-logs-btn"
                    onClick={handleClearState}
                    title="Clear all stored state for this style"
                    style={{ opacity: 0.7 }}
                  >
                    Reset State
                  </button>
                </div>
              )}
            </div>

            {state.activeTab === "console" && (
              <ConsolePanel
                consoleLogs={state.consoleLogs}
                currentTraining={state.currentTraining}
                onCheckStatus={operations.checkTrainingStatus}
                onAbort={operations.abortTraining}
              />
            )}

            {state.activeTab === "versions" && (
              <VersionsPanel
                versions={state.versions}
                onCheckStatus={handleCheckStatusFromHistory}
                onMarkAsGood={handleMarkAsGood}
                styleId={selectedStyleId || undefined}
              />
            )}
          </div>
        )}
      </div>

      {/* Validation Warning Modal */}
      <ValidationModal
        show={state.showValidationModal}
        onClose={() => state.setShowValidationModal(false)}
        validationIssue={state.validationIssue}
        selectedStyleId={selectedStyleId}
      />

      {/* Info Modal */}
      <TrainingGuidelinesModal
        show={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}
