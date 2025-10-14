import type { TrainingVersion } from '../types';

interface VersionsPanelProps {
  versions: TrainingVersion[];
  onCheckStatus?: (jobId: string) => void;
  onMarkAsGood?: (versionId: string) => void;
  styleId?: string;
}

export function VersionsPanel({ versions, onCheckStatus, onMarkAsGood, styleId }: VersionsPanelProps) {
  console.log('[VersionsPanel] Rendering with:', { 
    versionsCount: versions.length, 
    hasOnMarkAsGood: !!onMarkAsGood, 
    styleId,
    versions: versions.map(v => ({ 
      id: v.id, 
      name: v.name, 
      status: v.status, 
      hasLoraUrl: !!v.loraUrl,
      isGood: v.isGood 
    }))
  });

  if (versions.length === 0) {
    return (
      <div className="no-versions">
        <p>No training versions yet</p>
        <p>Configure and start your first training</p>
      </div>
    );
  }

  const hasPendingOrTraining = versions.some(v => v.status === 'pending' || v.status === 'training');

  return (
    <div className="versions-list">
      {hasPendingOrTraining && (
        <div style={{
          padding: '12px 16px',
          margin: '0 16px 16px 16px',
          background: '#fff3e0',
          border: '1px solid #ffb74d',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#e65100',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            💡 Status Updates Available
          </div>
          <div style={{ fontSize: '12px', color: '#f57c00' }}>
            RunPod keeps job status for ~24 hours. Click "Check Status" to get the latest updates from RunPod.
          </div>
        </div>
      )}
      <div className="versions-list-inner">
        {versions.map(version => (
          <div key={version.id} className={`version-card ${version.status}`}>
            <div className="version-header">
              <h4>{version.name}</h4>
              <span className={`status-badge ${version.status}`}>
                {version.status}
              </span>
            </div>
            {version.description && (
              <div className="version-description">
                {version.description}
              </div>
            )}
            <div className="version-info">
              <div className="info-row">
                <span>Dataset:</span>
                <span>Set {version.selectionSetId} ({version.imageCount} images)</span>
              </div>
              <div className="info-row">
                <span>Steps:</span>
                <span>{version.parameters.max_train_steps}</span>
              </div>
              <div className="info-row">
                <span>LR:</span>
                <span>{version.parameters.learning_rate}</span>
              </div>
              <div className="info-row">
                <span>Dim:</span>
                <span>{version.parameters.network_dim} / {version.parameters.network_alpha}</span>
              </div>
              <div className="info-row">
                <span>Started:</span>
                <span>{new Date(version.timestamp).toLocaleString()}</span>
              </div>
              <div className="version-actions">
                {version.loraUrl && (
                  <a href={version.loraUrl} download className="download-btn">
                    Download Model
                  </a>
                )}
                {(version.status === 'pending' || version.status === 'training') && onCheckStatus && (
                  <button
                    onClick={() => onCheckStatus(version.id)}
                    className="check-status-btn"
                    style={{
                      padding: '8px 16px',
                      background: '#f76b15',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#ff8533'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f76b15'}
                  >
                    🔍 Check Status
                  </button>
                )}
                {version.status === 'completed' && version.loraUrl && onMarkAsGood && styleId && (
                  <button
                    onClick={() => {
                      console.log('[VersionsPanel] Mark as Good button clicked!', { versionId: version.id, styleId });
                      onMarkAsGood(version.id);
                    }}
                    className="mark-good-btn"
                    style={{
                      padding: '8px 16px',
                      background: version.isGood ? '#10b981' : '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = version.isGood ? '#059669' : '#4b5563'}
                    onMouseLeave={(e) => e.currentTarget.style.background = version.isGood ? '#10b981' : '#6b7280'}
                  >
                    {version.isGood ? '✅ Marked as Good' : '⭐ Mark as Good'}
                  </button>
                )}
              </div>
              {version.error && (
                <div className="error-message">{version.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
