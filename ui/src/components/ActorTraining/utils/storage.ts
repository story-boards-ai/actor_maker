import type { TrainingParameters } from "../types";

const STORAGE_PREFIX = "actor_training_";

export function loadStoredParameters(
  actorId: string
): TrainingParameters | null {
  try {
    const key = `${STORAGE_PREFIX}params_${actorId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.error("Failed to load stored parameters:", err);
    return null;
  }
}

export function saveStoredParameters(
  actorId: string,
  parameters: TrainingParameters
): void {
  try {
    const key = `${STORAGE_PREFIX}params_${actorId}`;
    localStorage.setItem(key, JSON.stringify(parameters));
  } catch (err) {
    console.error("Failed to save parameters:", err);
  }
}

export function loadStoredDescription(actorId: string): string {
  try {
    const key = `${STORAGE_PREFIX}desc_${actorId}`;
    return localStorage.getItem(key) || "";
  } catch (err) {
    console.error("Failed to load stored description:", err);
    return "";
  }
}

export function saveStoredDescription(
  actorId: string,
  description: string
): void {
  try {
    const key = `${STORAGE_PREFIX}desc_${actorId}`;
    localStorage.setItem(key, description);
  } catch (err) {
    console.error("Failed to save description:", err);
  }
}

export function clearAllStoredState(actorId: string): void {
  try {
    const paramsKey = `${STORAGE_PREFIX}params_${actorId}`;
    const descKey = `${STORAGE_PREFIX}desc_${actorId}`;
    localStorage.removeItem(paramsKey);
    localStorage.removeItem(descKey);
  } catch (err) {
    console.error("Failed to clear stored state:", err);
  }
}
