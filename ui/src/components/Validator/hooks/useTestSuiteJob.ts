import { useState, useCallback, useEffect, useRef } from "react";
import type { TestSuite, TestSuiteResult } from "../types/test-suite";
import type { Style } from "../../../types";
import type { TrainedModel } from "./useValidatorState";
import type { ValidatorCharacter } from "../types/character";

interface UseTestSuiteJobProps {
  selectedStyle: string;
  selectedModel: string;
  trainedModels: TrainedModel[];
  styles: Style[];
  seed: number;
  seedLocked: boolean;
  steps: number;
  cfg: number;
  denoise: number;
  guidance: number;
  width: number;
  height: number;
  samplerName: string;
  schedulerName: string;
  loraWeight: number;
  characterLoraWeight: number;
  cineLoraWeight: number;
  monochromeContrast: number;
  monochromeBrightness: number;
  frontpad: string;
  backpad: string;
  selectedCharacters: ValidatorCharacter[];
  useCameraLora: boolean;
  addLog: (message: string) => void;
}

interface JobStatus {
  id: string;
  styleId: string;
  suiteId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  progress: { current: number; total: number };
  startedAt: string;
  completedAt?: string;
  error?: string;
  resultId?: string;
}

export function useTestSuiteJob(props: UseTestSuiteJobProps) {
  const [availableSuites, setAvailableSuites] = useState<TestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const modalOpenedRef = useRef(false);

  // Load available test suites
  const loadTestSuites = useCallback(async () => {
    try {
      // Load all available test suites
      const suiteFiles = [
        "/test-suites/cinematic-scenes.json",
        "/test-suites/user-prompts.json",
        "/test-suites/movie-time-periods.json",
        "/test-suites/cinematography-techniques.json",
      ];

      const suites = await Promise.all(
        suiteFiles.map(async (file) => {
          const response = await fetch(file);
          return response.json();
        })
      );

      setAvailableSuites(suites);
      const totalPrompts = suites.reduce(
        (sum, suite) => sum + suite.prompts.length,
        0
      );
      props.addLog(
        `✓ Loaded ${suites.length} test suites with ${totalPrompts} total prompts`
      );
      suites.forEach((suite) => {
        props.addLog(`  - ${suite.name}: ${suite.prompts.length} prompts`);
      });
    } catch (error) {
      console.error("Failed to load test suites:", error);
      props.addLog("ERROR: Failed to load test suites");
    }
  }, [props.addLog]);

  // Load job results (partial or complete)
  const loadJobResults = useCallback(
    async (styleId: string, resultId: string, silent = false) => {
      try {
        const url = `/api/load-test-result?styleId=${styleId}&resultId=${resultId}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to load results");
        }

        const result = await response.json();

        setTestResults(result);

        // Only log and open modal if not already opened (first load)
        if (!modalOpenedRef.current) {
          modalOpenedRef.current = true;
          setShowResultsModal(true);
          props.addLog(
            `✓ Results modal opened - ${
              result.images?.length || 0
            } images loaded`
          );
        } else {
          // Just update the count silently for progressive updates
        }
      } catch (error) {
        if (!silent) {
          props.addLog(`ERROR: Failed to load results`);
        }
      }
    },
    [props]
  );

  // Fallback polling mechanism when SSE fails
  const startPollingFallback = useCallback(
    (jobId: string) => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/test-suite/job/${jobId}`);
          if (!response.ok) {
            return;
          }

          const status: JobStatus = await response.json();
          setJobStatus(status);

          // Log progress and update results in real-time
          if (status.status === "running") {
            props.addLog(
              `Progress: ${status.progress.current}/${status.progress.total}`
            );

            // Load partial results to show images as they come in
            if (status.resultId) {
              loadJobResults(props.selectedStyle, status.resultId);
            } else {
              console.warn(
                "[TEST-SUITE-JOB] ⚠️ No resultId in polling status update - backend must include resultId!"
              );
            }
          } else if (status.status === "completed") {
            clearInterval(pollInterval);
            props.addLog("=".repeat(60));
            props.addLog(`🎬 TEST SUITE COMPLETE`);
            props.addLog(`Job ID: ${status.id}`);

            if (status.resultId) {
              loadJobResults(props.selectedStyle, status.resultId);
            }
          } else if (
            status.status === "failed" ||
            status.status === "cancelled"
          ) {
            clearInterval(pollInterval);
            if (status.status === "failed") {
              props.addLog(
                `ERROR: Job failed - ${status.error || "Unknown error"}`
              );
            } else {
              props.addLog(`Job cancelled`);
            }
          }
        } catch (error) {
          console.error("[TEST-SUITE-JOB] Polling error:", error);
        }
      }, 2000); // Poll every 2 seconds

      // Store interval for cleanup
      (eventSourceRef.current as any) = {
        type: "polling",
        interval: pollInterval,
      };
    },
    [props, loadJobResults]
  );

  // Connect to job progress via SSE
  const connectToJobProgress = useCallback(
    (jobId: string) => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        if ((eventSourceRef.current as any).type === "polling") {
          clearInterval((eventSourceRef.current as any).interval);
        } else if (eventSourceRef.current instanceof EventSource) {
          eventSourceRef.current.close();
        }
      }

      const eventSource = new EventSource(
        `/api/test-suite/job/${jobId}/progress`
      );
      eventSourceRef.current = eventSource;

      let sseConnected = false;

      eventSource.onopen = () => {
        sseConnected = true;
      };

      eventSource.onmessage = (event) => {
        const status: JobStatus = JSON.parse(event.data);
        setJobStatus(status);

        // Log progress and update results in real-time
        if (status.status === "running") {
          props.addLog(
            `Progress: ${status.progress.current}/${status.progress.total}`
          );

          // Load partial results to show images as they come in
          if (status.resultId) {
            loadJobResults(props.selectedStyle, status.resultId);
          } else {
            console.warn(
              "[TEST-SUITE-JOB] ⚠️ No resultId in running status update"
            );
          }
        } else if (status.status === "completed") {
          props.addLog("=".repeat(60));
          props.addLog(`🎬 TEST SUITE COMPLETE`);
          props.addLog(`Job ID: ${status.id}`);

          // Load the final results
          if (status.resultId) {
            loadJobResults(props.selectedStyle, status.resultId);
          }
        } else if (status.status === "failed") {
          props.addLog(
            `ERROR: Job failed - ${status.error || "Unknown error"}`
          );
        } else if (status.status === "cancelled") {
          props.addLog(`Job cancelled`);
        }
      };

      eventSource.onerror = (error) => {
        eventSource.close();

        // Fallback: Start polling instead
        if (!sseConnected) {
          props.addLog(
            "⚠️ Real-time updates unavailable, using polling fallback"
          );
          startPollingFallback(jobId);
        }
      };

      // Timeout check: If SSE doesn't connect in 5 seconds, fall back to polling
      const connectionTimeout = setTimeout(() => {
        if (!sseConnected) {
          props.addLog("⚠️ Real-time connection timeout, switching to polling");
          eventSource.close();
          startPollingFallback(jobId);
        }
      }, 5000);

      // Clear timeout if connection succeeds
      const originalOnOpen = eventSource.onopen;
      eventSource.onopen = (e) => {
        clearTimeout(connectionTimeout);
        if (originalOnOpen) originalOnOpen.call(eventSource, e);
      };
    },
    [props, startPollingFallback]
  );

  // Start test suite job
  const runTestSuite = useCallback(async () => {
    if (!selectedSuite) {
      props.addLog("ERROR: No test suite selected");
      return;
    }

    const suite = availableSuites.find((s) => s.id === selectedSuite);
    if (!suite) {
      props.addLog("ERROR: Selected test suite not found");
      return;
    }

    if (!props.selectedStyle || !props.selectedModel) {
      props.addLog("ERROR: Please select a style and model");
      return;
    }

    const trainedModel = props.trainedModels.find(
      (m) => m.id === props.selectedModel
    );
    if (!trainedModel) {
      props.addLog("ERROR: Selected model not found");
      return;
    }

    const styleData = props.styles.find((s) => s.id === props.selectedStyle);
    if (!styleData) {
      props.addLog("ERROR: Selected style not found");
      return;
    }

    try {
      props.addLog("=".repeat(60));
      props.addLog(`🎬 STARTING TEST SUITE: ${suite.name}`);
      props.addLog(`Style: ${styleData.title}`);
      props.addLog(`Model: ${trainedModel.name}`);
      props.addLog(`Prompts: ${suite.prompts.length}`);
      props.addLog(`⚡ Running in background with 2 parallel generations`);
      props.addLog("=".repeat(60));

      // Start background job
      const response = await fetch("/api/test-suite/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: props.selectedStyle,
          suiteId: suite.id,
          suite,
          settings: {
            styleId: props.selectedStyle,
            styleName: styleData.title,
            seed: props.seed,
            seedLocked: props.seedLocked,
            steps: props.steps,
            cfg: props.cfg,
            denoise: props.denoise,
            guidance: props.guidance,
            width: props.width,
            height: props.height,
            samplerName: props.samplerName,
            schedulerName: props.schedulerName,
            loraWeight: props.loraWeight,
            characterLoraWeight: props.characterLoraWeight,
            cineLoraWeight: props.cineLoraWeight,
            monochromeContrast: props.monochromeContrast,
            monochromeBrightness: props.monochromeBrightness,
            selectedCharacters: props.selectedCharacters,
            useCameraLora: props.useCameraLora,
            frontpad: props.frontpad,
            backpad: props.backpad,
          },
          trainedModel: {
            id: trainedModel.id,
            name: trainedModel.name,
            loraUrl: trainedModel.loraUrl,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start job: ${response.statusText}`);
      }

      const { jobId } = await response.json();
      setCurrentJobId(jobId);

      // Reset modal opened flag for new job
      modalOpenedRef.current = true; // Mark as opened since we're opening it now

      // Set initial running state immediately
      setJobStatus({
        id: jobId,
        styleId: props.selectedStyle,
        suiteId: suite.id,
        status: "running",
        progress: { current: 0, total: suite.prompts.length },
        startedAt: new Date().toISOString(),
      });

      // Initialize empty results and open modal immediately
      setTestResults({
        styleId: props.selectedStyle,
        styleName: styleData.title,
        modelId: trainedModel.id,
        modelName: trainedModel.name,
        suiteId: suite.id,
        suiteName: suite.name,
        timestamp: new Date().toISOString(),
        settings: {
          seed: props.seed,
          steps: props.steps,
          cfg: props.cfg,
          denoise: props.denoise,
          guidance: props.guidance,
          width: props.width,
          height: props.height,
          samplerName: props.samplerName,
          schedulerName: props.schedulerName,
          loraWeight: props.loraWeight,
        },
        images: [], // Start with empty array, will be populated as images come in
      });
      setShowResultsModal(true);

      props.addLog(`✓ Job started: ${jobId}`);
      props.addLog(
        `📺 Results modal opened - images will appear as they generate`
      );
      props.addLog(`You can now navigate away - job runs in background`);

      // Start listening for progress updates
      connectToJobProgress(jobId);
    } catch (error) {
      console.error("Failed to start test suite:", error);
      props.addLog(
        `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, [selectedSuite, availableSuites, props, connectToJobProgress]);

  // Cancel running job
  const cancelJob = useCallback(async () => {
    if (!currentJobId) return;

    try {
      const response = await fetch(
        `/api/test-suite/job/${currentJobId}/cancel`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        props.addLog(`Cancelled job: ${currentJobId}`);
      }
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  }, [currentJobId, props]);

  // Clean up SSE connection or polling on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        // Check if it's a polling interval or SSE connection
        if ((eventSourceRef.current as any).type === "polling") {
          clearInterval((eventSourceRef.current as any).interval);
        } else if (eventSourceRef.current instanceof EventSource) {
          eventSourceRef.current.close();
        }
      }
    };
  }, []);

  const isRunning = jobStatus?.status === "running";
  const currentProgress = jobStatus?.progress || { current: 0, total: 0 };

  return {
    availableSuites,
    selectedSuite,
    setSelectedSuite,
    loadTestSuites,
    runTestSuite,
    cancelJob,
    isRunning,
    currentProgress,
    currentJobId,
    jobStatus,
    testResults,
    showResultsModal,
    setTestResults,
    setShowResultsModal,
  };
}
