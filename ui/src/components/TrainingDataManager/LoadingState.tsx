import type { Actor } from '../../types';

interface LoadingStateProps {
  actor: Actor;
}

export function LoadingState({ actor }: LoadingStateProps) {
  return (
    <div className="training-data-manager">
      <div className="training-header">
        <div>
          <h2>{actor.name} - Training Data</h2>
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
