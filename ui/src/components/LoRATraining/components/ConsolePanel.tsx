import type { ConsoleLog, CurrentTraining } from '../types';
import { CountdownTimer } from './CountdownTimer';

interface ConsolePanelProps {
  consoleLogs: ConsoleLog[];
  currentTraining: CurrentTraining | null;
  onCheckStatus: () => void;
  onAbort: () => void;
}

export function ConsolePanel({ 
  consoleLogs, 
  currentTraining, 
  onCheckStatus, 
  onAbort 
}: ConsolePanelProps) {
  return (
    <div className="console-panel">
      {currentTraining && (
        <div className="training-status">
          <div className="status-header">
            <div className="status-info">
              <span className={`status-indicator ${currentTraining.status}`}>
                {currentTraining.status === 'training' ? '🔄' : 
                 currentTraining.status === 'completed' ? '✅' : 
                 currentTraining.status === 'failed' ? '❌' : '⏳'}
              </span>
              <span className="status-text">
                {currentTraining.status === 'training' ? 'Training in progress' :
                 currentTraining.status === 'completed' ? 'Training completed' :
                 currentTraining.status === 'failed' ? 'Training failed' :
                 'Starting training...'}
              </span>
            </div>
            {(currentTraining.status === 'training' || currentTraining.status === 'starting') && (
              <div className="training-actions">
                <button 
                  className="check-status-btn"
                  onClick={onCheckStatus}
                  title="Manually check training status"
                >
                  🔍 Check Status
                </button>
                <button 
                  className="abort-training-btn"
                  onClick={onAbort}
                  title="Abort training and reset state"
                >
                  ⏹ Abort
                </button>
              </div>
            )}
          </div>
          {currentTraining.status === 'training' && (
            <div className="countdown-timer">
              <CountdownTimer 
                startTime={currentTraining.startTime}
                estimatedDuration={currentTraining.estimatedDuration}
              />
            </div>
          )}
        </div>
      )}

      <div className="console-logs">
        {consoleLogs.length === 0 ? (
          <div className="console-empty">
            <p>No training activity yet</p>
            <p>Start a training to see real-time logs</p>
          </div>
        ) : (
          consoleLogs.map((log, index) => (
            <div key={index} className={`console-log ${log.type}`}>
              <span className="log-timestamp">[{log.timestamp}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
