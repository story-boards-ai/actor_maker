import { toast } from "sonner";
import type {
  TrainingVersion,
  TrainingParameters,
  SelectionSet,
  ConsoleLog,
  CurrentTraining,
  ValidationIssue,
} from "../types";
import { buildTrainingWorkflow } from "../../../utils/workflowBuilder";
import {
  calculateEstimatedDuration,
  getNextVersionNumber,
} from "../utils/calculations";

interface UseTrainingOperationsProps {
  selectedStyleId: string | null;
  selectedSetId: number | null;
  selectionSets: SelectionSet[];
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
}

export function useTrainingOperations(props: UseTrainingOperationsProps) {
  const {
    selectedStyleId,
    selectedSetId,
    selectionSets,
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
  } = props;

  const addLog = (type: ConsoleLog["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [...prev, { timestamp, type, message }]);
  };

  const clearLogs = () => {
    setConsoleLogs([]);
  };

  async function saveTrainingVersions(newVersions: TrainingVersion[]) {
    if (!selectedStyleId) return;
    try {
      await fetch(`/api/styles/${selectedStyleId}/training-versions`, {
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
    if (!selectedSetId) {
      toast.error("Please select a training dataset (selection set)");
      return;
    }

    if (!isNgrokRunning) {
      toast.error("Please start ngrok tunnel first");
      return;
    }

    const selectedSet = selectionSets.find((s) => s.id === selectedSetId);
    if (!selectedSet) {
      toast.error("Selection set not found");
      return;
    }

    try {
      // Check for missing captions locally
      if (!selectedStyleId) return;
      const imagesResponse = await fetch(
        `/api/styles/${selectedStyleId}/training-images-with-captions`
      );
      if (imagesResponse.ok) {
        const data = await imagesResponse.json();
        const selectedImages = data.images.filter((img: any) =>
          selectedSet.filenames.includes(img.filename)
        );
        const missingCaptions = selectedImages
          .filter((img: any) => !img.hasCaption)
          .map((img: any) => img.captionFile);

        if (missingCaptions.length > 0) {
          setValidationIssue({
            type: "missing_captions",
            missingFiles: [],
            missingCaptions,
          });
          setShowValidationModal(true);
          return;
        }
      }

      // Check S3 sync status
      const manifestResponse = await fetch(
        `/api/s3/manifest?styleId=${selectedStyleId}`
      );
      if (!manifestResponse.ok) {
        setValidationIssue({
          type: "missing_s3",
          missingFiles: selectedSet.filenames,
          missingCaptions: selectedSet.filenames.map((f) =>
            f.replace(/\.(jpg|jpeg|png|webp)$/i, ".txt")
          ),
        });
        setShowValidationModal(true);
        return;
      }

      const manifest = await manifestResponse.json();
      const missingFiles: string[] = [];
      const missingCaptions: string[] = [];

      for (const filename of selectedSet.filenames) {
        const imageFile = manifest.files.find(
          (f: any) => f.filename === filename
        );
        if (!imageFile) missingFiles.push(filename);

        const captionFilename = filename.replace(
          /\.(jpg|jpeg|png|webp)$/i,
          ".txt"
        );
        const captionFile = manifest.files.find(
          (f: any) => f.filename === captionFilename
        );
        if (!captionFile) missingCaptions.push(captionFilename);
      }

      if (missingFiles.length > 0 || missingCaptions.length > 0) {
        setValidationIssue({
          type: "missing_s3",
          missingFiles,
          missingCaptions,
        });
        setShowValidationModal(true);
        return;
      }

      await startTraining();
    } catch (err: any) {
      toast.error(`Validation failed: ${err.message}`);
    }
  }

  async function startTraining() {
    if (!selectedSetId || !selectedStyleId) {
      toast.error("Please select a training dataset");
      return;
    }

    // Prevent double-submit
    if (loading) {
      console.log(
        "[Training] Already starting training, ignoring duplicate request"
      );
      return;
    }

    // Check if there's already a training running for this style
    const hasRunningTraining = versions.some(
      (v) =>
        v.status === "pending" &&
        v.timestamp &&
        Date.now() - new Date(v.timestamp).getTime() < 4 * 60 * 60 * 1000 // Less than 4 hours old
    );

    if (hasRunningTraining) {
      addLog("error", "❌ A training is already running for this style");
      toast.error(
        "A training is already in progress. Please wait for it to complete."
      );
      return;
    }

    // Also check if currentTraining exists (in-memory state)
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

      addLog("info", "🚀 Initiating training process...");

      const selectedSet = selectionSets.find((s) => s.id === selectedSetId);
      if (!selectedSet) throw new Error("Selection set not found");

      addLog("info", `📋 Loading S3 manifest for style ${selectedStyleId}...`);
      const manifestResponse = await fetch(
        `/api/s3/manifest?styleId=${selectedStyleId}`
      );
      if (!manifestResponse.ok) {
        const errorData = await manifestResponse.json();
        throw new Error(errorData.message || "Failed to load S3 manifest");
      }
      const manifest = await manifestResponse.json();

      const s3Urls: string[] = [];
      const missingFiles: string[] = [];
      const missingCaptions: string[] = [];

      for (const filename of selectedSet.filenames) {
        const imageFile = manifest.files.find(
          (f: any) => f.filename === filename
        );
        if (imageFile) {
          s3Urls.push(`s3://${manifest.s3_bucket}/${imageFile.s3_key}`);
        } else {
          missingFiles.push(filename);
        }

        const captionFilename = filename.replace(
          /\.(jpg|jpeg|png|webp)$/i,
          ".txt"
        );
        const captionFile = manifest.files.find(
          (f: any) => f.filename === captionFilename
        );
        if (captionFile) {
          s3Urls.push(`s3://${manifest.s3_bucket}/${captionFile.s3_key}`);
        } else {
          missingCaptions.push(captionFilename);
        }
      }

      if (missingFiles.length > 0 || missingCaptions.length > 0) {
        addLog("error", `❌ Missing files in S3:`);
        if (missingFiles.length > 0) {
          addLog("error", `   Images: ${missingFiles.join(", ")}`);
        }
        if (missingCaptions.length > 0) {
          addLog("error", `   Captions: ${missingCaptions.join(", ")}`);
        }
        throw new Error(
          `Missing ${missingFiles.length} image(s) and ${missingCaptions.length} caption(s) in S3`
        );
      }

      addLog("success", `✅ All training files verified in S3`);
      addLog(
        "info",
        `📦 Dataset: Set ${selectedSetId} (${selectedSet.filenames.length} images)`
      );

      const imageCount = selectedSet.filenames.length;
      const recommendedSteps = Math.max(500, Math.min(2000, imageCount * 40));
      const finalSteps =
        parameters.max_train_steps === 1000
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
            mode: "custom-styles",
            user_id: "actor_maker_user",
            tenant_id: "actor_maker",
            request_id: `${selectedStyleId}_${Date.now()}`,
            model_name: `style_${selectedStyleId}_v${versionName}`,
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
        selectionSetId: selectedSetId,
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
      // If training was already set (error occurred after line 380), mark it as failed
      // Otherwise, currentTraining is still null and we don't need to do anything
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

    // Check if this is a recovery after long sleep
    const timeSinceStart = Date.now() - currentTraining.startTime;
    const secondsSinceStart = Math.floor(timeSinceStart / 1000);
    const hoursElapsed = Math.floor(timeSinceStart / (1000 * 60 * 60));

    // If job was just submitted (< 5 seconds ago), wait a bit for RunPod to register it
    if (secondsSinceStart < 5) {
      addLog(
        "info",
        "⏳ Job just submitted, waiting for RunPod to register it..."
      );
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds
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

        // Check if job is too new (just submitted, not yet in Redis)
        if (
          (response.status === 404 || errorText.includes("redis err")) &&
          secondsSinceStart < 60
        ) {
          addLog(
            "info",
            "⏳ Job is still being registered by RunPod (this is normal)"
          );
          addLog("info", "💡 Webhook will notify when training completes");
          // Don't show error toast for new jobs, just log it
          return;
        }

        // Check if job is too old (RunPod typically keeps status for 24-48h)
        if (
          response.status === 404 ||
          errorText.includes("not found") ||
          errorText.includes("redis err")
        ) {
          // Only show error if job is old enough that it should be in the system
          if (secondsSinceStart > 60) {
            addLog("error", "❌ Job not found in RunPod");
            addLog("info", "💡 This could mean:");
            addLog("info", "   • Job is >24h old (RunPod purged the status)");
            addLog("info", "   • Job ID mismatch");
            addLog(
              "info",
              "📡 Webhook will still update when training completes"
            );

            // Don't show toast error for status check failures - webhook is the source of truth
            // Just log it and continue
            return;
          } else {
            // Job is new, just not ready yet
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

      // Provide helpful recovery guidance
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
