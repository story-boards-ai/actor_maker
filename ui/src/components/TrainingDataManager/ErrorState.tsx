import type { Actor } from '../../types';

interface ErrorStateProps {
  actor: Actor;
  error: string;
  onRetry: () => void;
}

export function ErrorState({ actor, error, onRetry }: ErrorStateProps) {
  return (
    <div className="training-data-manager">
      <div className="training-header">
        <div>
          <h2>{actor.name} - Training Data</h2>
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
