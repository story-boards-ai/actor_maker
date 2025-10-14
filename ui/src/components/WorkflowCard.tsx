import React from 'react';
import './WorkflowCard.css';

interface WorkflowCardProps {
  name: string;
  nodeCount: number;
  description?: string;
  lastModified?: string;
  onView?: () => void;
  onExecute?: () => void;
}

export function WorkflowCard({ 
  name, 
  nodeCount, 
  description, 
  lastModified,
  onView,
  onExecute 
}: WorkflowCardProps) {
  // Extract readable name from filename
  const displayName = name
    .replace('.json', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="workflow-card">
      <div className="workflow-card-header">
        <div className="workflow-icon">⚙️</div>
        <div className="workflow-info">
          <h3 className="workflow-title">{displayName}</h3>
          {description && <p className="workflow-description">{description}</p>}
        </div>
      </div>
      
      <div className="workflow-meta">
        <div className="workflow-stat">
          <span className="stat-label">Nodes:</span>
          <span className="stat-value">{nodeCount}</span>
        </div>
        {lastModified && (
          <div className="workflow-stat">
            <span className="stat-label">Modified:</span>
            <span className="stat-value">{new Date(lastModified).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="workflow-actions">
        <button className="workflow-button secondary" onClick={onView}>
          View Details
        </button>
        <button className="workflow-button primary" onClick={onExecute}>
          Execute
        </button>
      </div>
    </div>
  );
}
