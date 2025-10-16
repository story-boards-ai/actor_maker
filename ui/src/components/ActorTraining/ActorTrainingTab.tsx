import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Actor } from "../../types";
import { ActorSelectorModal } from "./components/ActorSelectorModal";
import { NgrokPanel } from "../LoRATraining/components/NgrokPanel";
import { ParametersForm } from "./components/ParametersForm";
import { ConsolePanel } from "../LoRATraining/components/ConsolePanel";
import { VersionsPanel } from "./components/VersionsPanel";
import { TrainingGuidelinesModal } from "./components/TrainingGuidelinesModal";
import { SleepWarningBanner } from "../LoRATraining/components/SleepWarningBanner";
import { VersionSelector } from "./components/VersionSelector";
import { useTrainingState } from "./hooks/useTrainingState";
import { useTrainingOperations } from "./hooks/useTrainingOperations";
import { useNgrok } from "../LoRATraining/hooks/useNgrok";
import { useDataLoading } from "./hooks/useDataLoading";
import { clearAllStoredState } from "./utils/storage";
import {
  autoAdjustParameters,
  calculateRecommendedSteps,
} from "./utils/calculations";
import "./ActorTrainingTab.css";

export function ActorTrainingTab() {
  // Load all actors
  const [actors, setActors] = useState<Actor[]>([]);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [showActorModal, setShowActorModal] = useState(false);
  const [actorsLoading, setActorsLoading] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Load actors on mount
  useEffect(() => {
    async function loadActors() {
      try {
        // Import actors from the data file
        const module = await import("../../../data/actorsData");
        const actorsList: Actor[] = module.actorsLibraryData;
        console.log("[ActorTraining] Loaded actors:", actorsList.length);
        setActors(actorsList);
      } catch (err) {
        console.error("Failed to load actors:", err);
        toast.error("Failed to load actors");
      } finally {
        setActorsLoading(false);
      }
    }
    loadActors();
  }, []);

  const selectedActor = actors.find((a) => a.id.toString() === selectedActorId);

  // Training state
  const state = useTrainingState(selectedActorId, selectedActor);

  // Auto-fill trigger token when actor is selected
  useEffect(() => {
    if (selectedActorId && selectedActor) {
      // Only auto-fill if the current token is empty or matches the default pattern
      const currentToken = state.parameters.class_tokens;
      const isDefaultOrEmpty =
        !currentToken ||
        currentToken === "" ||
        currentToken.startsWith("actor SBai_actor_");

      if (isDefaultOrEmpty) {
        const autoToken = `actor SBai_actor_${selectedActorId}`;
        state.setParameters((prev) => ({
          ...prev,
          class_tokens: autoToken,
        }));
      }
    }
  }, [selectedActorId, selectedActor]);

  // Ngrok operations
  const ngrok = useNgrok();

  // Data loading (used for side effects - loading data on mount)
  useDataLoading({
    selectedActorId,
    setVersions: state.setVersions,
    checkNgrokStatus: ngrok.checkNgrokStatus,
    addLog: (type, message) => {
      const timestamp = new Date().toLocaleTimeString();
      state.setConsoleLogs((prev) => [...prev, { timestamp, type, message }]);
    },
    setLoadingStates: state.setLoadingStates,
  });

  // Training operations
  const operations = useTrainingOperations({
    selectedActorId,
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
    selectedActor,
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

  // Calculate recommended steps based on training data count
  const imageCount = selectedActor?.training_data?.count || 0;
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
          `${imageCount} images is large - consider curating to 30-60 best images for stronger identity`
        );
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Clear all stored state handler
  const handleClearState = () => {
    if (!selectedActorId) return;
    clearAllStoredState(selectedActorId);
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
    if (!selectedActorId) {
      console.error("[Mark as Good] No actor ID selected");
      return;
    }

    console.log(
      `[Mark as Good] Marking version ${versionId} as good for actor ${selectedActorId}`
    );

    try {
      const url = `/api/actors/${selectedActorId}/mark-good`;
      console.log(`[Mark as Good] Calling API: ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      toast.success(
        `✅ Marked "${version?.name}" as good and updated actors registry`
      );

      const timestamp = new Date().toLocaleTimeString();
      state.setConsoleLogs((prev) => [
        ...prev,
        {
          timestamp,
          type: "success",
          message: `✅ Marked version as good: ${version?.name}`,
        },
        {
          timestamp,
          type: "info",
          message: "📝 Updated actors registry with validated LoRA model",
        },
      ]);
    } catch (error) {
      console.error("[Mark as Good] Error:", error);
      toast.error(
        `Failed to mark version as good: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Show loading state while actors are loading
  if (actorsLoading) {
    return (
      <div className="actor-training-tab">
        <div className="training-header">
          <h2>Actor LoRA Training</h2>
        </div>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <div className="spinner"></div>
          <p>Loading actors...</p>
        </div>
      </div>
    );
  }

  // Show granular loading indicators
  const isLoadingData = state.loadingStates.versions;
  const loadingMessage = state.loadingStates.versions
    ? "Loading training history..."
    : "";

  return (
    <div className="actor-training-tab">
      <div className="training-header">
        <h2>Actor LoRA Training</h2>
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
          {/* Actor Selection */}
          <div className="config-section">
            <h4>Actor Selection</h4>
            <button
              onClick={() => setShowActorModal(true)}
              disabled={state.loading}
              className="actor-selector-button"
            >
              {selectedActor ? (
                <div className="selected-actor-preview">
                  <img
                    src={selectedActor.poster_frames.standard.webp_sm}
                    alt={selectedActor.name}
                    className="selected-actor-image"
                  />
                  <div className="selected-actor-info">
                    <span className="selected-actor-name">
                      {selectedActor.name}
                    </span>
                    <span className="selected-actor-meta">
                      {selectedActor.age} • {selectedActor.sex} •{" "}
                      {selectedActor.ethnicity}
                    </span>
                    {selectedActor.training_data && (
                      <span className="selected-actor-training">
                        {selectedActor.training_data.count} training images
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="actor-selector-placeholder">
                  <span className="placeholder-icon">👤</span>
                  <span>Select an Actor to Train</span>
                </div>
              )}
            </button>

            <ActorSelectorModal
              actors={actors}
              selectedActorId={selectedActorId || ""}
              onSelect={setSelectedActorId}
              open={showActorModal}
              onOpenChange={setShowActorModal}
            />
          </div>

          {!selectedActor && (
            <div
              style={{ padding: "2rem", textAlign: "center", color: "#888" }}
            >
              <p>Please select an actor to begin training configuration.</p>
            </div>
          )}

          {selectedActor && (
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

              {/* Training Data Info */}
              <div className="config-section">
                <h4>Training Data</h4>
                {selectedActor.training_data ? (
                  <div className="training-data-info">
                    <div className="info-row">
                      <span className="info-label">Images:</span>
                      <span className="info-value">
                        {selectedActor.training_data.count}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Recommended Steps:</span>
                      <span className="info-value">{recommendedSteps}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">S3 Synced:</span>
                      <span
                        className={`info-value ${
                          selectedActor.training_data.synced
                            ? "synced"
                            : "not-synced"
                        }`}
                      >
                        {selectedActor.training_data.synced ? "✓ Yes" : "✗ No"}
                      </span>
                    </div>
                    {selectedActor.training_data.synced && (
                      <button
                        className="auto-adjust-btn"
                        onClick={handleAutoAdjust}
                        disabled={state.loading}
                      >
                        Auto-Adjust Parameters
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="warning-text">
                    ⚠️ No training data available for this actor
                  </p>
                )}
              </div>

              {/* Training Description */}
              <div className="config-section">
                <h4>Training Description (Optional)</h4>
                <textarea
                  value={state.description}
                  onChange={(e) => state.setDescription(e.target.value)}
                  placeholder="e.g., Testing higher learning rate, Using full training dataset..."
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
                  state.loading ||
                  !selectedActor.training_data?.synced ||
                  !ngrok.isNgrokRunning
                }
              >
                {state.loading ? "Starting Training..." : "Start Training"}
              </button>
            </>
          )}
        </div>

        {/* Right Panel: Console / Training Versions */}
        {selectedActor && (
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
                    title="Clear all stored state for this actor"
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
                actorId={selectedActorId || undefined}
              />
            )}
          </div>
        )}
      </div>

      {/* Info Modal */}
      <TrainingGuidelinesModal
        show={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}
