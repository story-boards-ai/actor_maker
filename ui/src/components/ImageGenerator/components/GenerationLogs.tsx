interface GenerationLogsProps {
  logs: string[];
  onClear: () => void;
}

export function GenerationLogs({ logs, onClear }: GenerationLogsProps) {
  return (
    <div className="sidebar-logs">
      <div className="logs-header">
        <h4>Generation Log</h4>
        <button
          className="clear-logs-button"
          onClick={onClear}
          title="Clear logs"
        >
          ✕
        </button>
      </div>
      <div className="logs-content">
        {logs.length === 0 ? (
          <div className="log-entry" style={{color: '#666'}}>No logs yet</div>
        ) : (
          logs.slice(-10).map((log, index) => (
            <div key={index} className="log-entry">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
