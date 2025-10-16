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

const DEFAULT_PARAMETERS: TrainingParameters = {
  learning_rate: 0.0004,
  max_train_steps: 2000,
  network_dim: 8,
  network_alpha: 8,
  class_tokens: "",
  batch_size: 1,
  num_repeats: 10,
  lr_scheduler: "constant",
  lr_warmup_steps: 0,
  optimizer_type: "AdamW8bit",
  gradient_dtype: "fp32",
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
        setParameters(DEFAULT_PARAMETERS);
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
        setParameters(version.parameters);
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
