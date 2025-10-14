interface TrainingToolbarProps {
  baseImagesCount: number;
  missingCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onSelectMissing: () => void;
  onDeselectAll: () => void;
}

export function TrainingToolbar({
  baseImagesCount,
  missingCount,
  selectedCount,
  onSelectAll,
  onSelectMissing,
  onDeselectAll,
}: TrainingToolbarProps) {
  return (
    <div className="training-toolbar">
      <div className="selection-actions">
        <button 
          className="training-button small"
          onClick={onSelectAll}
          disabled={baseImagesCount === 0}
        >
          Select All
        </button>
        <button 
          className="training-button small"
          onClick={onSelectMissing}
          disabled={missingCount === 0}
        >
          Select Missing ({missingCount})
        </button>
        <button 
          className="training-button small"
          onClick={onDeselectAll}
          disabled={selectedCount === 0}
        >
          Deselect All
        </button>
      </div>
    </div>
  );
}
