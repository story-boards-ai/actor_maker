import { useState } from 'react';
import type { TrainingVersion } from '../types';

interface VersionSelectorProps {
  versions: TrainingVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string | null) => void;
  onNewVersion: () => void;
  disabled?: boolean;
}

export function VersionSelector({ 
  versions, 
  selectedVersionId, 
  onSelectVersion, 
  onNewVersion,
  disabled = false 
}: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'training': return '🔄';
      case 'pending': return '⏳';
      default: return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#30a46c'; // Green
      case 'failed': return '#e5484d'; // Red
      case 'training': return '#f76b15'; // Orange
      case 'pending': return '#0091ff'; // Blue
      default: return '#687076'; // Gray
    }
  };

  return (
    <div className="config-section" style={{
      background: '#f9f9f9',
      border: '1px solid #ddd',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '15px',
          fontWeight: 600,
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '18px' }}>⚙️</span>
          Training Configuration
        </h4>
        <button
          onClick={onNewVersion}
          disabled={disabled}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            fontSize: '13px',
            background: disabled ? '#ccc' : '#f76b15',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
          title="Create new training configuration"
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = '#ff8533';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = '#f76b15';
            }
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
          NEW
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'white',
            border: `2px solid ${isOpen ? '#f76b15' : '#ccc'}`,
            borderRadius: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: 500,
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            if (!disabled && !isOpen) {
              e.currentTarget.style.borderColor = '#999';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && !isOpen) {
              e.currentTarget.style.borderColor = '#ccc';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }
          }}
        >
          {selectedVersion ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={{ fontSize: '18px' }}>{getStatusIcon(selectedVersion.status)}</span>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#000' }}>
                  {selectedVersion.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {selectedVersion.imageCount} images • {selectedVersion.parameters.max_train_steps} steps
                  {selectedVersion.description && ` • ${selectedVersion.description}`}
                </div>
              </div>
              <div style={{ 
                fontSize: '11px', 
                padding: '3px 10px', 
                borderRadius: '6px',
                background: getStatusColor(selectedVersion.status),
                color: 'white',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}>
                {selectedVersion.status.toUpperCase()}
              </div>
            </div>
          ) : (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              Select a training configuration or create new
            </div>
          )}
          <span style={{ marginLeft: '12px', color: '#333', fontSize: '14px', fontWeight: 'bold' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {isOpen && !disabled && (
          <>
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,
              }}
              onClick={() => setIsOpen(false)}
            />
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: 'white',
              border: '2px solid #ccc',
              borderRadius: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}>
              {versions.length === 0 ? (
                <div style={{ 
                  padding: '24px', 
                  textAlign: 'center', 
                  color: '#666',
                  fontSize: '14px',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                  No training configurations yet. Click "NEW" to create one.
                </div>
              ) : (
                versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => {
                      onSelectVersion(version.id);
                      setIsOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: selectedVersionId === version.id 
                        ? '#fff3e0' 
                        : 'white',
                      border: 'none',
                      borderBottom: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedVersionId !== version.id) {
                        e.currentTarget.style.background = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedVersionId !== version.id) {
                        e.currentTarget.style.background = 'white';
                      }
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{getStatusIcon(version.status)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        color: '#000',
                        marginBottom: '4px',
                        fontSize: '14px',
                      }}>
                        {version.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(version.timestamp).toLocaleDateString()} • 
                        {version.imageCount} images • {version.parameters.max_train_steps} steps
                      </div>
                      {version.description && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#888',
                          marginTop: '4px',
                          fontStyle: 'italic',
                        }}>
                          {version.description}
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      padding: '3px 8px', 
                      borderRadius: '5px',
                      background: getStatusColor(version.status),
                      color: 'white',
                      fontWeight: 600,
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}>
                      {version.status.toUpperCase()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {selectedVersion && (
        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          background: '#f9f9f9',
          border: '1px solid #ddd',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666',
        }}>
          <div style={{ marginBottom: '6px' }}>
            <strong style={{ color: '#000' }}>Created:</strong>{' '}
            {new Date(selectedVersion.timestamp).toLocaleString()}
          </div>
          {selectedVersion.completedAt && (
            <div style={{ marginBottom: '6px' }}>
              <strong style={{ color: '#000' }}>Completed:</strong>{' '}
              {new Date(selectedVersion.completedAt).toLocaleString()}
            </div>
          )}
          {selectedVersion.loraUrl && (
            <div style={{ 
              marginTop: '10px',
              padding: '10px 12px',
              background: '#e5f8ed',
              border: '1px solid #30a46c',
              borderRadius: '8px',
              wordBreak: 'break-all',
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                marginBottom: '6px',
                fontWeight: 600,
                color: '#18794e',
                fontSize: '13px',
              }}>
                <span style={{ fontSize: '16px' }}>✅</span>
                Model Available
              </div>
              <a 
                href={selectedVersion.loraUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#18794e', 
                  fontSize: '11px',
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                  display: 'block',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0d5f3c'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#18794e'}
              >
                {selectedVersion.loraUrl}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
