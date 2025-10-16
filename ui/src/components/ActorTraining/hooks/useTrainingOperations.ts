import { toast } from "sonner";
import type {
  TrainingVersion,
  TrainingParameters,
  ConsoleLog,
  CurrentTraining,
  ValidationIssue,
} from "../types";
import type { Actor } from "../../../types";
import { buildTrainingWorkflow } from "../../../utils/workflowBuilder";
import {
  calculateEstimatedDuration,
  getNextVersionNumber,
} from "../utils/calculations";

interface UseTrainingOperationsProps {
  selectedActorId: string | null;
  parameters: TrainingParameters;
  description: string;
  versions: TrainingVersion[];
  ngrokUrl: string;
  isNgrokRunning: boolean;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setConsoleLogs: (
    logs: ConsoleLog[] | ((prev: ConsoleLog[]) => ConsoleLog[])
  ) => void;
  setActiveTab: (tab: "console" | "versions") => void;
  setVersions: (
    versions:
      | TrainingVersion[]
      | ((prev: TrainingVersion[]) => TrainingVersion[])
  ) => void;
  setCurrentTraining: (training: CurrentTraining | null) => void;
  setDescription: (desc: string) => void;
  setShowValidationModal: (show: boolean) => void;
  setValidationIssue: (issue: ValidationIssue) => void;
  currentTraining: CurrentTraining | null;
  selectedActor: Actor | undefined;
}

export function useTrainingOperations(props: UseTrainingOperationsProps) {
  const {
    selectedActorId,
    parameters,
    description,
    versions,
    ngrokUrl,
    isNgrokRunning,
    loading,
    setLoading,
    setConsoleLogs,
    setActiveTab,
    setVersions,
    setCurrentTraining,
    setDescription,
    setShowValidationModal,
    setValidationIssue,
    currentTraining,
    selectedActor,
  } = props;

  const addLog = (type: ConsoleLog["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [...prev, { timestamp, type, message }]);
  };

  const clearLogs = () => {
    setConsoleLogs([]);
  };

  async function saveTrainingVersions(newVersions: TrainingVersion[]) {
    if (!selectedActorId) return;
    try {
      await fetch(`/api/actors/${selectedActorId}/training-versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versions: newVersions }),
      });
    } catch (err) {
      console.error("Failed to save training versions:", err);
    }
  }

  async function getCustomizedWorkflow(steps: number) {
    return buildTrainingWorkflow(
      "/workflows/lora_training_workflow_headless.json",
      {
        learning_rate: parameters.learning_rate,
        max_train_steps: steps,
        network_dim: parameters.network_dim,
        network_alpha: parameters.network_alpha,
        class_tokens: parameters.class_tokens,
        batch_size: parameters.batch_size,
        num_repeats: parameters.num_repeats,
        lr_scheduler: parameters.lr_scheduler,
        lr_warmup_steps: parameters.lr_warmup_steps,
        optimizer_type: parameters.optimizer_type,
        gradient_dtype: parameters.gradient_dtype,
      }
    );
  }

  async function validateAndStartTraining() {
    if (!selectedActor || !selectedActor.training_data) {
      toast.error("No training data available for this actor");
      return;
    }

    if (!isNgrokRunning) {
      toast.error("Please start ngrok tunnel first");
      return;
    }

    if (!selectedActor.training_data.synced) {
      toast.error("Training data not synced to S3");
      setValidationIssue({
        type: "missing_s3",
        missingFiles: [],
        missingCaptions: [],
      });
      setShowValidationModal(true);
      return;
    }

    await startTraining();
  }

  async function startTraining() {
    if (!selectedActorId || !selectedActor || !selectedActor.training_data) {
      toast.error("Please select an actor with training data");
      return;
    }

    // Prevent double-submit
    if (loading) {
      console.log(
        "[Training] Already starting training, ignoring duplicate request"
      );
      return;
    }

    // Check if there's already a training running for this actor
    const hasRunningTraining = versions.some(
      (v) =>
        v.status === "pending" &&
        v.timestamp &&
        Date.now() - new Date(v.timestamp).getTime() < 4 * 60 * 60 * 1000
    );

    if (hasRunningTraining) {
      addLog("error", "❌ A training is already running for this actor");
      toast.error(
        "A training is already in progress. Please wait for it to complete."
      );
      return;
    }

    if (currentTraining) {
      addLog("error", "❌ A training session is already active");
      toast.error(
        "A training is already in progress. Please wait for it to complete."
      );
      return;
    }

    try {
      setLoading(true);
      clearLogs();
      setActiveTab("console");

      addLog("info", "🚀 Initiating actor training process...");

      const imageCount = selectedActor.training_data.count;
      const s3Urls = selectedActor.training_data.s3_urls;

      addLog("info", `📋 Actor: ${selectedActor.name}`);
      addLog("info", `📦 Training images: ${imageCount}`);
      addLog("info", `📁 S3 URLs: ${s3Urls.length} files`);

      const recommendedSteps = Math.max(1000, Math.min(3000, imageCount * 100));
      const finalSteps =
        parameters.max_train_steps === 2000
          ? recommendedSteps
          : parameters.max_train_steps;

      const nextVersionNumber = getNextVersionNumber(versions);
      const versionName = `V${nextVersionNumber}`;

      addLog("info", `⚙️ Training steps: ${finalSteps}`);
      addLog("info", `📊 Learning rate: ${parameters.learning_rate}`);
      addLog("info", `🎯 Trigger token: ${parameters.class_tokens}`);

      const trainingRequest = {
        input: {
          workflow: await getCustomizedWorkflow(finalSteps),
          training_data: {
            s3_urls: s3Urls,
          },
          training_config: {
            mode: "custom-actors",
            user_id: "actor_maker_user",
            tenant_id: "actor_maker",
            request_id: `${selectedActorId}_${Date.now()}`,
            model_name: `actor_${selectedActorId}_${versionName}`,
            learning_rate: parameters.learning_rate,
            max_train_steps: finalSteps,
          },
        },
        webhook: `${ngrokUrl}/api/training-webhook`,
      };

      addLog("request", `📤 Sending training request to RunPod...`);

      const response = await fetch("/api/training/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trainingRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      addLog("response", `✅ RunPod accepted job: ${result.job_id}`);
      addLog("success", `🎬 Training started: ${versionName}`);

      const estimatedDuration = calculateEstimatedDuration(finalSteps);
      const estimatedMinutes = Math.ceil(estimatedDuration / 60000);
      addLog("info", `⏱️ Estimated duration: ~${estimatedMinutes} minutes`);
      addLog(
        "info",
        `📡 Webhook will notify when complete (status checks may fail initially)`
      );

      const newVersion: TrainingVersion = {
        id: result.job_id || trainingRequest.input.training_config.request_id,
        name: versionName,
        description: description.trim() || undefined,
        timestamp: new Date().toISOString(),
        parameters: { ...parameters, max_train_steps: finalSteps },
        status: "pending",
        imageCount,
      };

      setVersions((prev) => [newVersion, ...prev]);
      await saveTrainingVersions([newVersion, ...versions]);

      setCurrentTraining({
        jobId: result.job_id,
        startTime: Date.now(),
        estimatedDuration,
        status: "training",
      });

      toast.success(
        `Training started: ${versionName} - Webhook will notify when complete`
      );
      setDescription("");
    } catch (err: any) {
      addLog("error", `❌ Training failed to start: ${err.message}`);
      toast.error(`Failed to start training: ${err.message}`);
      if (currentTraining !== null && currentTraining !== undefined) {
        const training: CurrentTraining = currentTraining;
        setCurrentTraining({
          jobId: training.jobId,
          startTime: training.startTime,
          estimatedDuration: training.estimatedDuration,
          status: "failed" as const,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  function abortTraining() {
    if (!currentTraining) return;

    addLog("error", "⚠️ Training aborted by user");
    toast.info("Training aborted. Note: RunPod job may still be running.");

    setCurrentTraining(null);
    setLoading(false);
  }

  async function checkTrainingStatus() {
    if (!currentTraining) return;

    const timeSinceStart = Date.now() - currentTraining.startTime;
    const secondsSinceStart = Math.floor(timeSinceStart / 1000);
    const hoursElapsed = Math.floor(timeSinceStart / (1000 * 60 * 60));

    if (secondsSinceStart < 5) {
      addLog(
        "info",
        "⏳ Job just submitted, waiting for RunPod to register it..."
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    if (hoursElapsed > 2) {
      addLog(
        "info",
        `⚠️ Recovering training status after ${hoursElapsed}h (computer may have slept)`
      );
      toast.info(`Recovering training status after ${hoursElapsed} hours...`, {
        duration: 4000,
      });
    } else {
      addLog("info", "🔍 Checking training status...");
    }

    try {
      const response = await fetch("/api/training/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentTraining.jobId }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        if (
          (response.status === 404 || errorText.includes("redis err")) &&
          secondsSinceStart < 60
        ) {
          addLog(
            "info",
            "⏳ Job is still being registered by RunPod (this is normal)"
          );
          addLog("info", "💡 Webhook will notify when training completes");
          return;
        }

        if (
          response.status === 404 ||
          errorText.includes("not found") ||
          errorText.includes("redis err")
        ) {
          if (secondsSinceStart > 60) {
            addLog("error", "❌ Job not found in RunPod");
            addLog("info", "💡 This could mean:");
            addLog("info", "   • Job is >24h old (RunPod purged the status)");
            addLog("info", "   • Job ID mismatch");
            addLog(
              "info",
              "📡 Webhook will still update when training completes"
            );
            return;
          } else {
            addLog("info", "⏳ Waiting for job to be registered...");
            return;
          }
        }

        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const data = await response.json();
      addLog("info", `📊 Job status: ${data.status}`);

      if (data.status === "COMPLETED") {
        addLog("success", "✅ Training completed!");
        if (hoursElapsed > 2) {
          addLog("success", "🎉 Training completed while computer was asleep!");
        }

        if (data.loraUrl) {
          addLog("success", `📦 Model available at: ${data.loraUrl}`);

          const updatedVersions = versions.map((v) =>
            v.id === currentTraining.jobId
              ? { ...v, status: "completed" as const, loraUrl: data.loraUrl }
              : v
          );
          setVersions(updatedVersions);
          await saveTrainingVersions(updatedVersions);
        }

        setCurrentTraining({ ...currentTraining, status: "completed" });
        toast.success("Training completed successfully!");
      } else if (data.status === "FAILED") {
        addLog("error", `❌ Training failed: ${data.error || "Unknown error"}`);

        const updatedVersions = versions.map((v) =>
          v.id === currentTraining.jobId
            ? {
                ...v,
                status: "failed" as const,
                error: data.error || "Training failed",
              }
            : v
        );
        setVersions(updatedVersions);
        await saveTrainingVersions(updatedVersions);

        setCurrentTraining({ ...currentTraining, status: "failed" });
        toast.error("Training failed");
      } else if (data.status === "IN_QUEUE" || data.status === "IN_PROGRESS") {
        addLog("info", `⏳ Training still in progress (${data.status})`);
        if (hoursElapsed > 2) {
          addLog("info", "⚠️ Training is taking longer than expected");
        }
      } else if (data.status === "CANCELLED") {
        addLog("info", "⚠️ Training was cancelled");
        setCurrentTraining({ ...currentTraining, status: "failed" });
        toast.warning("Training was cancelled");
      } else {
        addLog("info", `ℹ️ Status: ${data.status}`);
      }
    } catch (err: any) {
      addLog("error", `❌ Status check failed: ${err.message}`);

      if (hoursElapsed > 2) {
        addLog(
          "info",
          "💡 Tip: Check RunPod dashboard directly at https://runpod.io"
        );
        addLog("info", `📋 Job ID: ${currentTraining.jobId}`);
      }

      toast.error(`Failed to check status: ${err.message}`);
    }
  }

  return {
    validateAndStartTraining,
    startTraining,
    abortTraining,
    checkTrainingStatus,
    addLog,
    clearLogs,
  };
}
