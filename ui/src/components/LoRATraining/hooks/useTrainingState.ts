import { useState, useEffect } from 'react';
import type { 
  TrainingParameters, 
  SelectionSet, 
  TrainingVersion, 
  CurrentTraining, 
  ConsoleLog,
  S3SyncStatus,
  ValidationIssue 
} from '../types';
import { DEFAULT_PARAMETERS } from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import type { Style } from '../../../types';

export function useTrainingState(selectedStyleId: string | null, selectedStyle: Style | undefined) {
  const [selectionSets, setSelectionSets] = useState<SelectionSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<number | null>(() => 
    selectedStyleId ? loadFromStorage(selectedStyleId, 'selectedSetId', null) : null
  );
  const [parameters, setParameters] = useState<TrainingParameters>(() => 
    selectedStyleId ? loadFromStorage(selectedStyleId, 'parameters', {
      ...DEFAULT_PARAMETERS,
      class_tokens: selectedStyle?.trigger_words || `style SBai_style_${selectedStyleId}`,
    }) : DEFAULT_PARAMETERS
  );
  const [versions, setVersions] = useState<TrainingVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(() => 
    selectedStyleId ? loadFromStorage(selectedStyleId, 'showAdvanced', false) : false
  );
  const [description, setDescription] = useState(() => 
    selectedStyleId ? loadFromStorage(selectedStyleId, 'description', '') : ''
  );
  const [activeTab, setActiveTab] = useState<'console' | 'versions'>(() => 
    selectedStyleId ? loadFromStorage(selectedStyleId, 'activeTab', 'console') : 'console'
  );
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>(() => 
    selectedStyleId ? loadFromStorage(selectedStyleId, 'consoleLogs', []) : []
  );
  const [currentTraining, setCurrentTraining] = useState<CurrentTraining | null>(() => 
    selectedStyleId ? loadFromStorage(selectedStyleId, 'currentTraining', null) : null
  );
  const [s3SyncStatus, setS3SyncStatus] = useState<S3SyncStatus>({ 
    synced: false, 
    missingCount: 0, 
    checking: false, 
    missingFiles: [], 
    missingCaptions: [] 
  });
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationIssue, setValidationIssue] = useState<ValidationIssue>({ 
    type: null, 
    missingFiles: [], 
    missingCaptions: [] 
  });
  
  // Granular loading states for better UX
  const [loadingStates, setLoadingStates] = useState({
    selectionSets: false,
    versions: false,
    s3Sync: false,
    ngrok: false,
  });
  
  // Version management - track which training configuration is active
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() => 
    selectedStyleId ? loadFromStorage(selectedStyleId, 'selectedVersionId', null) : null
  );

  // Persist state changes to localStorage
  useEffect(() => {
    if (selectedStyleId) {
      saveToStorage(selectedStyleId, 'selectedSetId', selectedSetId);
    }
  }, [selectedSetId, selectedStyleId]);

  useEffect(() => {
    if (selectedStyleId) {
      saveToStorage(selectedStyleId, 'parameters', parameters);
    }
  }, [parameters, selectedStyleId]);

  useEffect(() => {
    if (selectedStyleId) {
      saveToStorage(selectedStyleId, 'showAdvanced', showAdvanced);
    }
  }, [showAdvanced, selectedStyleId]);

  useEffect(() => {
    if (selectedStyleId) {
      saveToStorage(selectedStyleId, 'description', description);
    }
  }, [description, selectedStyleId]);

  useEffect(() => {
    if (selectedStyleId) {
      saveToStorage(selectedStyleId, 'activeTab', activeTab);
    }
  }, [activeTab, selectedStyleId]);

  useEffect(() => {
    if (selectedStyleId) {
      saveToStorage(selectedStyleId, 'consoleLogs', consoleLogs);
    }
  }, [consoleLogs, selectedStyleId]);

  useEffect(() => {
    if (selectedStyleId) {
      saveToStorage(selectedStyleId, 'currentTraining', currentTraining);
    }
  }, [currentTraining, selectedStyleId]);

  useEffect(() => {
    if (selectedStyleId) {
      saveToStorage(selectedStyleId, 'selectedVersionId', selectedVersionId);
    }
  }, [selectedVersionId, selectedStyleId]);

  // Load version configuration when version is selected
  useEffect(() => {
    if (selectedVersionId && versions.length > 0) {
      const version = versions.find(v => v.id === selectedVersionId);
      if (version) {
        // Load parameters from selected version
        setParameters(version.parameters);
        if (version.selectionSetId) {
          setSelectedSetId(version.selectionSetId);
        }
        if (version.description) {
          setDescription(version.description);
        }
        
        // If this version has an active training, restore it
        if (version.status === 'training' || version.status === 'pending') {
          const restoredTraining = loadFromStorage<{
            jobId: string;
            startTime: number;
            estimatedDuration: number;
            status: 'starting' | 'training' | 'completed' | 'failed';
          } | null>(selectedStyleId!, 'currentTraining', null);
          
          if (restoredTraining && restoredTraining.jobId === version.id) {
            setCurrentTraining(restoredTraining);
          }
        }
      }
    }
  }, [selectedVersionId, versions]);

  return {
    selectionSets,
    setSelectionSets,
    selectedSetId,
    setSelectedSetId,
    parameters,
    setParameters,
    versions,
    setVersions,
    loading,
    setLoading,
    showAdvanced,
    setShowAdvanced,
    description,
    setDescription,
    activeTab,
    setActiveTab,
    consoleLogs,
    setConsoleLogs,
    currentTraining,
    setCurrentTraining,
    s3SyncStatus,
    setS3SyncStatus,
    showValidationModal,
    setShowValidationModal,
    validationIssue,
    setValidationIssue,
    loadingStates,
    setLoadingStates,
    selectedVersionId,
    setSelectedVersionId,
  };
}
