// Helper functions for localStorage persistence
export const getStorageKey = (styleId: string | number, key: string) => 
  `training_${styleId}_${key}`;

export const loadFromStorage = <T,>(
  styleId: string | number, 
  key: string, 
  defaultValue: T
): T => {
  try {
    const stored = localStorage.getItem(getStorageKey(styleId, key));
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (err) {
    console.warn(`Failed to load ${key} from storage:`, err);
    return defaultValue;
  }
};

export const saveToStorage = (
  styleId: string | number, 
  key: string, 
  value: any
) => {
  try {
    localStorage.setItem(getStorageKey(styleId, key), JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save ${key} to storage:`, err);
  }
};

export const clearAllStoredState = (styleId: string | number) => {
  const keys = [
    'selectedSetId', 
    'parameters', 
    'showAdvanced', 
    'description', 
    'activeTab', 
    'consoleLogs', 
    'currentTraining'
  ];
  keys.forEach(key => {
    localStorage.removeItem(getStorageKey(styleId, key));
  });
};
