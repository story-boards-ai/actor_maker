import type { SelectionSet, S3SyncStatus } from '../types';

interface DatasetSelectorProps {
  selectionSets: SelectionSet[];
  selectedSetId: number | null;
  onSelectSet: (setId: number | null) => void;
  s3SyncStatus: S3SyncStatus;
  recommendedSteps: number;
  loading: boolean;
  onAutoAdjust: () => void;
}

export function DatasetSelector({
  selectionSets,
  selectedSetId,
  onSelectSet,
  s3SyncStatus,
  recommendedSteps,
  loading,
  onAutoAdjust
}: DatasetSelectorProps) {
  const selectedSet = selectionSets.find(s => s.id === selectedSetId);
  const imageCount = selectedSet?.filenames.length || 0;

  return (
    <div className="config-section">
      <h4>Training Dataset</h4>
      <select 
        value={selectedSetId || ''} 
        onChange={(e) => onSelectSet(e.target.value ? Number(e.target.value) : null)}
        disabled={loading}
      >
        <option value="">Select a dataset...</option>
        {selectionSets.map(set => (
          <option key={set.id} value={set.id}>
            Set {set.id} ({set.filenames.length} images)
          </option>
        ))}
      </select>
      {selectedSet && (
        <>
          <div className="dataset-info">
            <p className="help-text">
              ✓ {imageCount} images selected<br/>
              Recommended steps: {recommendedSteps}
            </p>
            
            {/* S3 Sync Status */}
            {s3SyncStatus.checking ? (
              <div className="s3-status checking">
                <span>🔄 Checking S3 sync status...</span>
              </div>
            ) : s3SyncStatus.synced ? (
              <div className="s3-status synced">
                <span>✅ All files synced to S3</span>
              </div>
            ) : s3SyncStatus.missingCount > 0 ? (
              <div className="s3-status not-synced">
                <span>⚠️ {s3SyncStatus.missingCount} file(s) not in S3</span>
                <span className="help-text">
                  {s3SyncStatus.missingFiles.length > 0 && `${s3SyncStatus.missingFiles.length} images`}
                  {s3SyncStatus.missingFiles.length > 0 && s3SyncStatus.missingCaptions.length > 0 && ', '}
                  {s3SyncStatus.missingCaptions.length > 0 && `${s3SyncStatus.missingCaptions.length} captions`}
                </span>
              </div>
            ) : null}
          </div>
          
          <button 
            className="auto-adjust-btn"
            onClick={onAutoAdjust}
            disabled={loading}
            title="Automatically adjust all parameters based on dataset size"
          >
            ⚡ Auto-Adjust Parameters
          </button>
        </>
      )}
    </div>
  );
}
