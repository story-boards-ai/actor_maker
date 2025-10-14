import type { Style } from '../../types';

interface LoadingStateProps {
  style: Style;
}

export function LoadingState({ style }: LoadingStateProps) {
  return (
    <div className="training-data-manager">
      <div className="training-header">
        <div>
          <h2>{style.title} - Training Data</h2>
          <p className="training-subtitle">Loading...</p>
        </div>
      </div>
      <div className="training-loading">
        <div className="spinner"></div>
        <p>Loading training data...</p>
      </div>
    </div>
  );
}
