import React, { useEffect, useState } from 'react';
import { StyleCard } from './StyleCard';
import type { Style, StyleRegistry } from '../types';
import { useStyleAssessments } from './hooks/useStyleAssessments';
import './StylesGrid.css';
import { toast } from 'sonner';

interface StylesGridProps {
  onOpenTrainingTab: (style: Style, version: 'v1' | 'v2') => void;
  onOpenTrainingManager: (style: Style) => void;
  onOpenS3Manager: (style: Style) => void;
}

export function StylesGrid({ onOpenTrainingTab, onOpenTrainingManager, onOpenS3Manager }: StylesGridProps) {
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  
  // Fetch assessment ratings for all styles
  const { assessments, loading: assessmentsLoading } = useStyleAssessments(styles);

  useEffect(() => {
    async function loadStyles() {
      try {
        // In production, this would be an API call
        // For now, we'll fetch the JSON file from the data directory (served via Vite publicDir)
        const response = await fetch('/styles_registry.json');
        if (!response.ok) {
          throw new Error('Failed to load styles registry');
        }
        const registry: StyleRegistry = await response.json();
        setStyles(registry.styles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load styles');
      } finally {
        setLoading(false);
      }
    }

    loadStyles();
  }, []);

  const handleSyncS3LoRAs = async () => {
    setSyncing(true);
    toast.info('Syncing LoRA files from S3...');
    
    try {
      const response = await fetch('/api/training/sync-s3-loras', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync LoRA files');
      }

      const result = await response.json();
      
      toast.success(
        `✅ Synced ${result.versionsUpdated} training versions from ${result.filesFound} S3 files`,
        {
          duration: 5000,
        }
      );

      // Show details if there were updates
      if (result.updates && result.updates.length > 0) {
        console.log('[S3 Sync] Updates:', result.updates);
      }
    } catch (err: any) {
      console.error('[S3 Sync] Error:', err);
      toast.error(`Failed to sync: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="styles-grid-loading">
        <div className="spinner"></div>
        <p>Loading styles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="styles-grid-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Styles</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (styles.length === 0) {
    return (
      <div className="styles-grid-empty">
        <div className="empty-icon">🎨</div>
        <h3>No Styles Found</h3>
        <p>Start by creating your first style model</p>
      </div>
    );
  }

  return (
    <div className="styles-container">
      <div className="styles-header">
        <div className="styles-header-left">
          <h2>Style Library</h2>
          <p className="styles-count">
            {styles.length} {styles.length === 1 ? 'style' : 'styles'} available
          </p>
        </div>
        <button 
          className="sync-s3-button"
          onClick={handleSyncS3LoRAs}
          disabled={syncing}
          title="Sync LoRA files from S3 and update training versions"
        >
          {syncing ? (
            <>
              <span className="spinner-small"></span>
              Syncing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.65 2.35C12.2 0.9 10.21 0 8 0C3.58 0 0.01 3.58 0.01 8C0.01 12.42 3.58 16 8 16C11.73 16 14.84 13.45 15.73 10H13.65C12.83 12.33 10.61 14 8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C9.66 2 11.14 2.69 12.22 3.78L9 7H16V0L13.65 2.35Z" fill="currentColor"/>
              </svg>
              Sync S3 LoRAs
            </>
          )}
        </button>
      </div>
      <div className="styles-grid">
        {styles.map((style) => (
          <StyleCard 
            key={style.id} 
            style={style}
            bestRating={assessments[style.id]}
            onOpenTrainingTab={onOpenTrainingTab}
            onOpenTrainingManager={onOpenTrainingManager}
            onOpenS3Manager={onOpenS3Manager}
          />
        ))}
      </div>
    </div>
  );
}
