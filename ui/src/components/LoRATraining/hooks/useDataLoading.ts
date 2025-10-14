import { useEffect } from "react";
import { toast } from "sonner";
import type {
  SelectionSet,
  TrainingVersion,
  S3SyncStatus,
  ConsoleLog,
} from "../types";
import { loadFromStorage } from "../utils/storage";

interface UseDataLoadingProps {
  selectedStyleId: string | null;
  selectedSetId: number | null;
  selectionSets: SelectionSet[];
  setSelectionSets: (sets: SelectionSet[]) => void;
  setVersions: (versions: TrainingVersion[]) => void;
  setS3SyncStatus: (status: S3SyncStatus) => void;
  checkNgrokStatus: () => Promise<void>;
  addLog: (type: ConsoleLog["type"], message: string) => void;
  setLoadingStates: (states: any) => void;
}

export function useDataLoading(props: UseDataLoadingProps) {
  const {
    selectedStyleId,
    selectedSetId,
    selectionSets,
    setSelectionSets,
    setVersions,
    setS3SyncStatus,
    checkNgrokStatus,
    addLog,
    setLoadingStates,
  } = props;

  async function loadSelectionSets() {
    if (!selectedStyleId) return;
    setLoadingStates((prev: any) => ({ ...prev, selectionSets: true }));
    try {
      const response = await fetch(
        `/api/styles/${selectedStyleId}/selection-sets`
      );
      if (response.ok) {
        const data = await response.json();
        setSelectionSets(data.sets || []);
      }
    } catch (err) {
      console.error("Failed to load selection sets:", err);
    } finally {
      setLoadingStates((prev: any) => ({ ...prev, selectionSets: false }));
    }
  }

  async function loadTrainingVersions() {
    if (!selectedStyleId) return;
    setLoadingStates((prev: any) => ({ ...prev, versions: true }));
    try {
      const response = await fetch(
        `/api/styles/${selectedStyleId}/training-versions`
      );
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error("Failed to load training versions:", err);
    } finally {
      setLoadingStates((prev: any) => ({ ...prev, versions: false }));
    }
  }

  async function checkS3SyncStatus() {
    if (!selectedSetId) return;

    setLoadingStates((prev: any) => ({ ...prev, s3Sync: true }));
    setS3SyncStatus({
      synced: false,
      missingCount: 0,
      checking: true,
      missingFiles: [],
      missingCaptions: [],
    });

    try {
      const selectedSet = selectionSets.find((s) => s.id === selectedSetId);
      if (!selectedSet) {
        console.warn("[S3-SYNC] Selection set not found:", selectedSetId);
        setS3SyncStatus({
          synced: false,
          missingCount: 0,
          checking: false,
          missingFiles: [],
          missingCaptions: [],
        });
        return;
      }

      if (!selectedStyleId) return;
      const manifestResponse = await fetch(
        `/api/s3/manifest?styleId=${selectedStyleId}`
      );
      if (!manifestResponse.ok) {
        setS3SyncStatus({
          synced: false,
          missingCount: selectedSet.filenames.length * 2,
          checking: false,
          missingFiles: selectedSet.filenames,
          missingCaptions: selectedSet.filenames.map((f) =>
            f.replace(/\.(jpg|jpeg|png|webp)$/i, ".txt")
          ),
        });
        return;
      }

      const manifest = await manifestResponse.json();

      const missingFiles: string[] = [];
      const missingCaptions: string[] = [];

      const manifestFilenames = new Set(
        manifest.files.map((f: any) => f.filename)
      );

      for (const filename of selectedSet.filenames) {
        if (!manifestFilenames.has(filename)) {
          missingFiles.push(filename);
        }

        const captionFilename = filename.replace(
          /\.(jpg|jpeg|png|webp)$/i,
          ".txt"
        );
        if (!manifestFilenames.has(captionFilename)) {
          missingCaptions.push(captionFilename);
        }
      }

      const missingCount = missingFiles.length + missingCaptions.length;

      setS3SyncStatus({
        synced: missingCount === 0,
        missingCount,
        checking: false,
        missingFiles,
        missingCaptions,
      });
    } catch (err) {
      console.error("Failed to check S3 sync status:", err);
      setS3SyncStatus({
        synced: false,
        missingCount: 0,
        checking: false,
        missingFiles: [],
        missingCaptions: [],
      });
    } finally {
      setLoadingStates((prev: any) => ({ ...prev, s3Sync: false }));
    }
  }

  // Load data when style is selected - PARALLELIZED FOR PERFORMANCE
  useEffect(() => {
    if (selectedStyleId) {
      // Run all API calls in parallel instead of sequential
      Promise.all([
        loadSelectionSets(),
        loadTrainingVersions(),
        checkNgrokStatus(),
      ])
        .then(() => {
          console.log("[DataLoading] All data loaded successfully");
        })
        .catch((err) => {
          console.error("[DataLoading] Error loading data:", err);
        });

      // Show notification if training was restored from storage
      const restoredTraining = loadFromStorage<{
        jobId: string;
        startTime: number;
        estimatedDuration: number;
        status: "starting" | "training" | "completed" | "failed";
      } | null>(selectedStyleId, "currentTraining", null);
      if (restoredTraining && restoredTraining.status === "training") {
        toast.info("🔄 Restored active training session", { duration: 3000 });
        addLog("info", "🔄 Training session restored from storage");
        addLog("info", `Job ID: ${restoredTraining.jobId}`);
        addLog(
          "warning",
          '💡 Click "Check Status" to recover training progress'
        );
      }
    }
  }, [selectedStyleId]);

  // Check S3 sync status when selection set changes - DEBOUNCED
  useEffect(() => {
    if (selectedSetId && selectionSets.length > 0) {
      // Debounce S3 sync check to avoid blocking UI on rapid changes
      const timeoutId = setTimeout(() => {
        checkS3SyncStatus();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setS3SyncStatus({
        synced: false,
        missingCount: 0,
        checking: false,
        missingFiles: [],
        missingCaptions: [],
      });
    }
  }, [selectedSetId, selectionSets]);

  return {
    loadSelectionSets,
    loadTrainingVersions,
    checkS3SyncStatus,
  };
}
