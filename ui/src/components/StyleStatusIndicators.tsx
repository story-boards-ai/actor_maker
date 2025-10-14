import type { StyleStatus } from './hooks/useStyleStatus';
import './StyleStatusIndicators.css';

interface StyleStatusIndicatorsProps {
  status: StyleStatus;
  loading?: boolean;
  onLoadStatus?: () => void;
  statusLoaded?: boolean;
}

export function StyleStatusIndicators({ status, loading, onLoadStatus, statusLoaded = true }: StyleStatusIndicatorsProps) {
  if (loading) {
    return (
      <div className="status-grid loading">
        <span className="status-loading">Loading status...</span>
      </div>
    );
  }
  
  // Show load button if status hasn't been loaded yet
  if (!statusLoaded && onLoadStatus) {
    return (
      <div className="status-grid">
        <button 
          className="load-status-btn"
          onClick={(e) => {
            e.stopPropagation();
            onLoadStatus();
          }}
          title="Load training data status"
        >
          📊 Load Status
        </button>
      </div>
    );
  }

  const captionProgress = status.captionsTotal > 0 
    ? (status.captionsGenerated / status.captionsTotal) * 100 
    : 0;
  
  const s3Progress = status.s3Total > 0 
    ? (status.s3Synced / status.s3Total) * 100 
    : 0;
  
  const captionComplete = captionProgress === 100;
  const s3Complete = s3Progress === 100;

  return (
    <div className="status-grid">
      <div className="status-row">
        <span className="status-key">Captions</span>
        <span className={`status-val ${captionComplete ? 'complete' : 'incomplete'}`}>
          {status.captionsGenerated}/{status.captionsTotal}
        </span>
      </div>
      
      <div className="status-row">
        <span className="status-key">S3 Files</span>
        <span className={`status-val ${s3Complete ? 'complete' : 'incomplete'}`}>
          {status.s3Synced}/{status.s3Total}
        </span>
      </div>
      
      <div className="status-row">
        <span className="status-key">Models</span>
        <span className="status-val">{status.loraModels}</span>
      </div>
      
      <div className="status-row">
        <span className="status-key">Validation</span>
        <span className={`status-val ${status.validationPassed ? 'validated' : 'unvalidated'}`}>
          {status.validationPassed ? (
            status.validationRating ? `${status.validationRating}★` : 'Pass'
          ) : (
            '—'
          )}
        </span>
      </div>
    </div>
  );
}
