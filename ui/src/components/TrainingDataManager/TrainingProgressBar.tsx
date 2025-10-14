import type { ProcessingState } from './types';

interface TrainingProgressBarProps {
  processingState: ProcessingState;
}

export function TrainingProgressBar({ processingState }: TrainingProgressBarProps) {
  if (!processingState.isGenerating || processingState.progress.total === 0) {
    return null;
  }

  const percentage = Math.round((processingState.progress.current / processingState.progress.total) * 100);

  return (
    <div className="training-progress-bar">
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="progress-bar-text">
        Generating training images: {processingState.progress.current} / {processingState.progress.total} 
        ({percentage}%)
      </div>
    </div>
  );
}
