import type { Style } from '../../types';

interface ErrorStateProps {
  style: Style;
  error: string;
  onRetry: () => void;
}

export function ErrorState({ style, error, onRetry }: ErrorStateProps) {
  return (
    <div className="training-data-manager">
      <div className="training-header">
        <div>
          <h2>{style.title} - Training Data</h2>
          <p className="training-subtitle">Error loading data</p>
        </div>
      </div>
      <div className="training-error">
        <div className="error-icon">⚠️</div>
        <h3>Error</h3>
        <p>{error}</p>
        <button className="training-button" onClick={onRetry}>Retry</button>
      </div>
    </div>
  );
}
