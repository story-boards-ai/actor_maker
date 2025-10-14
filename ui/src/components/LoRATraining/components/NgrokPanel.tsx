import { toast } from 'sonner';

interface NgrokPanelProps {
  isRunning: boolean;
  url: string;
  port?: string;
  loading: boolean;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
}

export function NgrokPanel({ isRunning, url, port, loading, onStart, onStop }: NgrokPanelProps) {
  return (
    <div className="config-section">
      <div className="section-header">
        <h4>Webhook Tunnel (ngrok)</h4>
        <div className={`ngrok-status-badge ${isRunning ? 'running' : 'stopped'}`}>
          {isRunning ? '● Running' : '○ Stopped'}
        </div>
      </div>
      
      {isRunning ? (
        <div className="ngrok-active">
          <div className="ngrok-info-grid">
            <div className="ngrok-info-item">
              <label>Public URL</label>
              <div className="ngrok-url-display">
                <input 
                  type="text" 
                  value={url} 
                  readOnly 
                  className="ngrok-url-input"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  className="ngrok-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast.success('URL copied!');
                  }}
                  title="Copy URL"
                >
                  📋
                </button>
              </div>
            </div>
            
            <div className="ngrok-info-item">
              <label>Forwarding to</label>
              <div className="ngrok-port-display">
                <span className="ngrok-localhost">localhost:{port || '?'}</span>
                {port && (
                  <span className="ngrok-port-badge">Port {port}</span>
                )}
              </div>
            </div>
          </div>

          <div className="ngrok-actions">
            <button 
              className="ngrok-btn secondary"
              onClick={() => window.open('http://127.0.0.1:4040', '_blank')}
              title="Open ngrok web interface to inspect webhook requests"
            >
              <span className="btn-icon">📊</span>
              <span>Inspect Requests</span>
            </button>
            <button 
              className="ngrok-btn danger"
              onClick={onStop} 
              disabled={loading}
            >
              <span className="btn-icon">⏹</span>
              <span>Stop Tunnel</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="ngrok-inactive">
          <p className="ngrok-help-text">
            Start an ngrok tunnel to receive webhook callbacks from the training server.
          </p>
          <button 
            onClick={onStart} 
            disabled={loading} 
            className="ngrok-btn primary large"
          >
            <span className="btn-icon">🚀</span>
            <span>{loading ? 'Starting...' : 'Start Tunnel'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
