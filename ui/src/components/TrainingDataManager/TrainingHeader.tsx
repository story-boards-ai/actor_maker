import type { Actor } from '../../types';
import type { ProcessingState } from './types';

interface TrainingHeaderProps {
  actor: Actor;
  baseImagesCount: number;
  totalTrainingImages: number;
  missingCount: number;
  selectedCount: number;
  processingState: ProcessingState;
  onGenerateMissing: () => void;
  onGenerateSelected: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  onAbort: () => void;
}

export function TrainingHeader({
  actor,
  baseImagesCount,
  totalTrainingImages,
  missingCount,
  selectedCount,
  processingState,
  onGenerateMissing,
  onGenerateSelected,
  onOpenSettings,
  onClose,
  onAbort,
}: TrainingHeaderProps) {
  return (
    <div className="training-header">
      <div>
        <h2>{actor.name} - Training Data Manager</h2>
        <p className="training-subtitle">
          {baseImagesCount} base images • {totalTrainingImages} training images • {missingCount} missing
          {selectedCount > 0 && ` • ${selectedCount} selected`}
        </p>
      </div>

      <div className="training-actions">
        {processingState.isGenerating ? (
          <button 
            className="training-button abort"
            onClick={onAbort}
            title="Stop generation"
          >
            🛑 Abort ({processingState.progress.current}/{processingState.progress.total})
          </button>
        ) : (
          <>
            <button 
              className="training-button primary"
              onClick={onGenerateMissing}
              disabled={missingCount === 0}
              title="Generate training images for all base images without training data"
            >
              ✨ Generate Missing ({missingCount})
            </button>
            
            <button 
              className="training-button"
              onClick={onGenerateSelected}
              disabled={selectedCount === 0}
              title="Generate training images for selected base images"
            >
              Generate Selected ({selectedCount})
            </button>

            <button
              className="training-button"
              onClick={onOpenSettings}
              title="Configure expert settings"
            >
              ⚙️ Expert Settings
            </button>

            <button
              className="training-button"
              onClick={onClose}
              title="Close and return to actor library"
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
