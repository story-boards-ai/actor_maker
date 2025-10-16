import { useEffect } from "react";
import type { TrainingVersion, ConsoleLog } from "../types";

interface UseDataLoadingProps {
  selectedActorId: string | null;
  setVersions: (
    versions:
      | TrainingVersion[]
      | ((prev: TrainingVersion[]) => TrainingVersion[])
  ) => void;
  checkNgrokStatus: () => Promise<void>;
  addLog: (type: ConsoleLog["type"], message: string) => void;
  setLoadingStates: (states: any) => void;
}

export function useDataLoading(props: UseDataLoadingProps) {
  const {
    selectedActorId,
    setVersions,
    checkNgrokStatus,
    addLog,
    setLoadingStates,
  } = props;

  // Load training versions when actor is selected
  useEffect(() => {
    if (!selectedActorId) {
      setVersions([]);
      return;
    }

    async function loadVersions() {
      setLoadingStates((prev: any) => ({ ...prev, versions: true }));

      try {
        const response = await fetch(
          `/api/actors/${selectedActorId}/training-versions`
        );

        if (response.ok) {
          const data = await response.json();
          setVersions(data.versions || []);

          if (data.versions && data.versions.length > 0) {
            addLog(
              "info",
              `📚 Loaded ${data.versions.length} training version(s)`
            );
          }
        } else {
          // No versions yet, that's okay
          setVersions([]);
        }
      } catch (err) {
        console.error("Failed to load training versions:", err);
        setVersions([]);
      } finally {
        setLoadingStates((prev: any) => ({ ...prev, versions: false }));
      }
    }

    loadVersions();
  }, [selectedActorId]);

  // Check ngrok status on mount
  useEffect(() => {
    checkNgrokStatus();
  }, []);

  return {};
}
