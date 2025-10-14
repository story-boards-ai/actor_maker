import { useState } from 'react';

interface SaveSettingsSetModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  currentRating: string | null;
  currentComment: string;
}

export function SaveSettingsSetModal(props: SaveSettingsSetModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this settings set');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await props.onSave(name.trim());
      setName('');
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings set');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setName('');
      setError('');
      props.onClose();
    }
  };

  if (!props.show) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="settings-set-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💾 Save Settings Set</h3>
          <button className="modal-close" onClick={handleClose} disabled={saving}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="setting-item">
            <label htmlFor="settings-set-name">
              Name
            </label>
            <input
              id="settings-set-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Quality Configuration"
              disabled={saving}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleSave();
                }
              }}
            />
          </div>

          <div className="settings-set-preview">
            <p className="preview-label">This will save:</p>
            <ul className="preview-list">
              <li>✅ All generation parameters (seed, steps, cfg, etc.)</li>
              <li>✅ LoRA weights and prompt padding</li>
              <li>✅ Current model and style</li>
              {props.currentRating && <li>✅ Assessment rating: {props.currentRating}</li>}
              {props.currentComment && <li>✅ Notes and comments</li>}
            </ul>
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="modal-button modal-button-close"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="modal-button modal-button-save"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? '⏳ Saving...' : '💾 Save Settings Set'}
          </button>
        </div>

        <style>{`
          .settings-set-modal {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          }

          .settings-set-modal .modal-content {
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .settings-set-modal input[type="text"] {
            width: 100%;
            padding: 12px;
            background: rgba(15, 23, 42, 0.6);
            border: 2px solid rgba(148, 163, 184, 0.2);
            border-radius: 8px;
            color: white;
            font-size: 14px;
            transition: border-color 0.3s;
          }

          .settings-set-modal input[type="text"]:focus {
            outline: none;
            border-color: #10b981;
          }

          .settings-set-modal input[type="text"]:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .settings-set-preview {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 8px;
            padding: 16px;
          }

          .preview-label {
            font-size: 13px;
            font-weight: 600;
            color: #cbd5e1;
            margin: 0 0 12px 0;
          }

          .preview-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .preview-list li {
            font-size: 13px;
            color: #94a3b8;
            padding-left: 24px;
            position: relative;
          }

          .error-message {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 12px;
            color: #f87171;
            font-size: 13px;
          }
        `}</style>
      </div>
    </div>
  );
}
