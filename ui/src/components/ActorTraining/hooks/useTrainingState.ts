import { useState, useEffect } from "react";
import type { Actor } from "../../../types";
import type {
  TrainingParameters,
  TrainingVersion,
  ConsoleLog,
  CurrentTraining,
  ValidationIssue,
} from "../types";
import {
  loadStoredParameters,
  saveStoredParameters,
  loadStoredDescription,
  saveStoredDescription,
} from "../utils/storage";

// Default parameters based on FLUX LoRA Training Guide
// Conservative preset for medium datasets (20-30 images)
// Using rank 16/8 for consistent identity with smaller file sizes
const DEFAULT_PARAMETERS: TrainingParameters = {
  learning_rate: 0.00025, // 2.5e-4 (standard, safe starting point)
  max_train_steps: 2000, // Target for 20-30 images
  network_dim: 16, // Rank 16 for consistent identity, smaller files
  network_alpha: 8, // Alpha = rank/2 (standard practice)
  class_tokens: "",
  batch_size: 1, // Keep at 1 for VRAM efficiency
  num_repeats: 2, // Guide: Keep repeats 1-3, adjust epochs to hit target steps
  lr_scheduler: "cosine", // Cosine with warmup (recommended over constant)
  lr_warmup_steps: 400, // 20% of 2000 steps (0.2 * max_train_steps)
  optimizer_type: "adamw8bit", // AdamW 8-bit (standard)
  gradient_dtype: "bf16", // BF16 recommended for FLUX
};

export function useTrainingState(
  selectedActorId: string | null,
  selectedActor: Actor | undefined
) {
  const [parameters, setParameters] = useState<TrainingParameters>(
    DEFAULT_PARAMETERS
  );
  const [description, setDescription] = useState("");
  const [versions, setVersions] = useState<TrainingVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [activeTab, setActiveTab] = useState<"console" | "versions">(
    "console"
  );
  const [currentTraining, setCurrentTraining] =
    useState<CurrentTraining | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationIssue, setValidationIssue] = useState<ValidationIssue>({
    type: "missing_s3",
    missingFiles: [],
    missingCaptions: [],
  });
  const [loadingStates, setLoadingStates] = useState({
    versions: false,
  });

  // Load stored parameters when actor changes
  useEffect(() => {
    if (selectedActorId) {
      const stored = loadStoredParameters(selectedActorId);
      if (stored) {
        setParameters(stored);
      } else {
        // Use defaults, but adjust warmup steps to match max_train_steps
        const defaults = {
          ...DEFAULT_PARAMETERS,
          lr_warmup_steps: Math.floor(DEFAULT_PARAMETERS.max_train_steps * 0.2),
        };
        setParameters(defaults);
      }

      const storedDesc = loadStoredDescription(selectedActorId);
      setDescription(storedDesc);
    }
  }, [selectedActorId]);

  // Save parameters when they change
  useEffect(() => {
    if (selectedActorId) {
      saveStoredParameters(selectedActorId, parameters);
    }
  }, [selectedActorId, parameters]);

  // Save description when it changes
  useEffect(() => {
    if (selectedActorId) {
      saveStoredDescription(selectedActorId, description);
    }
  }, [selectedActorId, description]);

  // Load selected version's parameters
  useEffect(() => {
    if (selectedVersionId) {
      const version = versions.find((v) => v.id === selectedVersionId);
      if (version && version.parameters) {
        // Ensure warmup steps are calculated if missing
        const params = {
          ...version.parameters,
          lr_warmup_steps: version.parameters.lr_warmup_steps || 
            Math.floor(version.parameters.max_train_steps * 0.2),
        };
        setParameters(params);
        setDescription(version.description || "");
      }
    }
  }, [selectedVersionId, versions]);

  return {
    parameters,
    setParameters,
    description,
    setDescription,
    versions,
    setVersions,
    selectedVersionId,
    setSelectedVersionId,
    consoleLogs,
    setConsoleLogs,
    activeTab,
    setActiveTab,
    currentTraining,
    setCurrentTraining,
    loading,
    setLoading,
    showAdvanced,
    setShowAdvanced,
    showValidationModal,
    setShowValidationModal,
    validationIssue,
    setValidationIssue,
    loadingStates,
    setLoadingStates,
  };
}
