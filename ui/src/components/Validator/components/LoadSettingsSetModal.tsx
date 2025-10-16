import { toast } from 'sonner';
import type { SettingsSetSummary, AssessmentRating } from '../types/settings-set';

interface LoadSettingsSetModalProps {
  show: boolean;
  settingsSets: SettingsSetSummary[];
  onClose: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

const RATING_EMOJI: Record<string, string> = {
  excellent: '⭐',
  good: '✅',
  acceptable: '👍',
  poor: '⚠️',
  failed: '❌',
};

const RATING_COLOR: Record<string, string> = {
  excellent: '#10b981',
  good: '#3b82f6',
  acceptable: '#8b5cf6',
  poor: '#f59e0b',
  failed: '#ef4444',
};

export function LoadSettingsSetModal(props: LoadSettingsSetModalProps) {
  if (!props.show) return null;

  const handleLoad = (id: string) => {
    props.onLoad(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const settingsSet = props.settingsSets.find(s => s.id === id);
    toast.warning(`Delete "${settingsSet?.name || 'this settings set'}"?`, {
      action: {
        label: 'Delete',
        onClick: () => props.onDelete(id)
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="settings-set-modal load-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📂 Load Settings Set</h3>
          <button className="modal-close" onClick={props.onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          {props.settingsSets.length === 0 ? (
            <div className="no-sets-message">
              <p className="empty-icon">📦</p>
              <p>No saved settings sets for this style yet.</p>
              <p className="hint">Save your first configuration to see it here.</p>
            </div>
          ) : (
            <div className="settings-sets-list">
              {props.settingsSets.map((set) => (
                <div
                  key={set.id}
                  className="settings-set-item"
                  onClick={() => handleLoad(set.id)}
                >
                  <div className="set-header">
                    <div className="set-name">{set.name}</div>
                    {set.rating && (
                      <div
                        className="set-rating"
                        style={{
                          color: RATING_COLOR[set.rating] || '#94a3b8',
                        }}
                      >
                        {RATING_EMOJI[set.rating] || ''}
                      </div>
                    )}
                  </div>
                  <div className="set-details">
                    <span className="set-model">{set.modelName}</span>
                    <span className="set-date">
                      {new Date(set.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="set-delete-btn"
                    onClick={(e) => handleDelete(set.id, e)}
                    title="Delete this settings set"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="modal-button modal-button-close"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>

        <style>{`
          .load-modal {
            max-width: 600px;
          }

          .load-modal .modal-content {
            padding: 24px;
            max-height: 500px;
            overflow-y: auto;
          }

          .no-sets-message {
            text-align: center;
            padding: 40px 20px;
          }

          .no-sets-message .empty-icon {
            font-size: 64px;
            margin: 0 0 16px 0;
            opacity: 0.8;
          }

          .no-sets-message p {
            color: #cbd5e1;
            margin: 8px 0;
            font-size: 15px;
          }

          .no-sets-message .hint {
            color: #94a3b8;
            font-size: 13px;
            font-style: italic;
          }

          .settings-sets-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .settings-set-item {
            background: rgba(15, 23, 42, 0.6);
            border: 2px solid rgba(148, 163, 184, 0.2);
            border-radius: 12px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
          }

          .settings-set-item:hover {
            border-color: #3b82f6;
            background: rgba(15, 23, 42, 0.8);
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
          }

          .set-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .set-name {
            font-size: 16px;
            font-weight: 600;
            color: #e2e8f0;
          }

          .set-rating {
            font-size: 20px;
          }

          .set-details {
            display: flex;
            gap: 16px;
            align-items: center;
            font-size: 13px;
            color: #94a3b8;
          }

          .set-model {
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          }

          .set-date {
            color: #64748b;
          }

          .set-delete-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 14px;
            cursor: pointer;
            opacity: 0;
            transition: all 0.2s;
          }

          .settings-set-item:hover .set-delete-btn {
            opacity: 1;
          }

          .set-delete-btn:hover {
            background: rgba(239, 68, 68, 0.2);
            border-color: #ef4444;
            transform: scale(1.1);
          }
        `}</style>
      </div>
    </div>
  );
}
