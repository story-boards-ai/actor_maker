import { useState, useEffect } from 'react';
import type { Actor } from '../../types';
import './ActorTrainingDataManager.css';

interface ActorTrainingDataManagerProps {
  actor: Actor;
  onClose: () => void;
}

interface TrainingImage {
  index: number;
  filename: string;
  s3_url: string;
  local_exists: boolean;
  local_path: string | null;
  local_hash: string | null;
  s3_hash: string | null;
  hash_match: boolean | null;
  status: 's3_only' | 'local_only' | 'synced' | 'mismatch';
}

interface SyncStatus {
  syncing: boolean;
  progress: { current: number; total: number };
  message: string;
}

export function ActorTrainingDataManager({ actor, onClose }: ActorTrainingDataManagerProps) {
  const [trainingImages, setTrainingImages] = useState<TrainingImage[]>([]);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBaseImageModal, setShowBaseImageModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    progress: { current: 0, total: 0 },
    message: ''
  });

  useEffect(() => {
    loadTrainingData();
  }, [actor.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showBaseImageModal) {
        setShowBaseImageModal(false);
      }
    };

    if (showBaseImageModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showBaseImageModal]);

  async function loadTrainingData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch training data info from backend
      const response = await fetch(`/api/actors/${actor.id}/training-data`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load training data');
      }
      
      const data = await response.json();
      
      // Set base image
      setBaseImage(data.base_image_path || null);
      
      // Set training images from new API structure
      setTrainingImages(data.training_images || []);
    } catch (err) {
      console.error('Error loading training data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  }

  async function syncFromS3() {
    try {
      setSyncStatus({
        syncing: true,
        progress: { current: 0, total: trainingImages.length },
        message: 'Starting sync from S3...'
      });

      const response = await fetch(`/api/actors/${actor.id}/training-data/sync-from-s3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: actor.id,
          actor_name: actor.name,
          s3_urls: trainingImages.map(img => img.s3_url)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      
      setSyncStatus({
        syncing: false,
        progress: { current: result.downloaded, total: trainingImages.length },
        message: `✅ Synced ${result.downloaded} images from S3`
      });

      // Reload to update local status
      await loadTrainingData();
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, message: '' }));
      }, 3000);

    } catch (err) {
      console.error('Sync from S3 failed:', err);
      setSyncStatus({
        syncing: false,
        progress: { current: 0, total: 0 },
        message: `❌ Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  }

  async function syncToS3() {
    try {
      setSyncStatus({
        syncing: true,
        progress: { current: 0, total: trainingImages.length },
        message: 'Starting sync to S3...'
      });

      const response = await fetch(`/api/actors/${actor.id}/training-data/sync-to-s3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: actor.id,
          actor_name: actor.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      
      setSyncStatus({
        syncing: false,
        progress: { current: result.uploaded, total: trainingImages.length },
        message: `✅ Synced ${result.uploaded} images to S3`
      });

      // Reload to update status
      await loadTrainingData();
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, message: '' }));
      }, 3000);

    } catch (err) {
      console.error('Sync to S3 failed:', err);
      setSyncStatus({
        syncing: false,
        progress: { current: 0, total: 0 },
        message: `❌ Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  }

  async function generateTrainingImages() {
    try {
      setSyncStatus({
        syncing: true,
        progress: { current: 0, total: 20 },
        message: 'Generating training images...'
      });

      const response = await fetch(`/api/actors/${actor.id}/training-data/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: actor.id,
          actor_name: actor.name,
          base_image_path: baseImage,
          count: 20
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      
      setSyncStatus({
        syncing: false,
        progress: { current: result.generated, total: 20 },
        message: `✅ Generated ${result.generated} training images`
      });

      // Reload to show new images
      await loadTrainingData();
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, message: '' }));
      }, 3000);

    } catch (err) {
      console.error('Generation failed:', err);
      setSyncStatus({
        syncing: false,
        progress: { current: 0, total: 0 },
        message: `❌ Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  }

  async function deleteTrainingImage(image: TrainingImage) {
    if (!confirm(`Delete ${image.filename}? This will remove it from both local storage and S3.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/actors/${actor.id}/training-data/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: actor.id,
          actor_name: actor.name,
          filename: image.filename,
          s3_url: image.s3_url
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const result = await response.json();
      
      setSyncStatus({
        syncing: false,
        progress: { current: 0, total: 0 },
        message: `✅ Deleted ${image.filename}`
      });

      // Reload to update list
      await loadTrainingData();
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, message: '' }));
      }, 3000);

    } catch (err) {
      console.error('Delete failed:', err);
      setSyncStatus({
        syncing: false,
        progress: { current: 0, total: 0 },
        message: `❌ Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  }

  if (loading) {
    return (
      <div className="actor-training-manager">
        <div className="training-header">
          <div>
            <h2>{actor.name} - Training Data</h2>
            <p className="training-subtitle">Loading...</p>
          </div>
        </div>
        <div className="training-loading">
          <div className="spinner"></div>
          <p>Loading training data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="actor-training-manager">
        <div className="training-header">
          <div>
            <h2>{actor.name} - Training Data</h2>
            <p className="training-subtitle">Error loading data</p>
          </div>
        </div>
        <div className="training-error">
          <div className="error-icon">⚠️</div>
          <h3>Error</h3>
          <p>{error}</p>
          <button className="training-button" onClick={() => loadTrainingData()}>Retry</button>
        </div>
      </div>
    );
  }

  const localCount = trainingImages.filter(img => img.local_exists).length;
  const s3Count = trainingImages.length;
  const syncedCount = trainingImages.filter(img => img.status === 'synced').length;
  const mismatchCount = trainingImages.filter(img => img.status === 'mismatch').length;

  return (
    <div className="actor-training-manager">
      <div className="training-header">
        <div className="training-header-content">
          {baseImage && (
            <div className="base-image-thumbnail" onClick={() => setShowBaseImageModal(true)} title="Click to view full size">
              <img src={baseImage} alt={`${actor.name} base`} />
            </div>
          )}
          <div>
            <h2>{actor.name} - Training Data Manager</h2>
            <p className="training-subtitle">
              {s3Count} total • {localCount} local • {syncedCount} synced • {mismatchCount > 0 ? `${mismatchCount} mismatch • ` : ''}{actor.age}y {actor.sex} {actor.ethnicity}
            </p>
          </div>
        </div>

        <div className="training-actions">
          {syncStatus.syncing ? (
            <div className="sync-progress">
              <div className="spinner-small"></div>
              <span>{syncStatus.message}</span>
            </div>
          ) : (
            <>
              <button 
                className="training-button primary"
                onClick={syncFromS3}
                disabled={s3Count === 0}
                title="Download training images from S3 to local storage"
              >
                ⬇️ Sync from S3
              </button>
              
              <button 
                className="training-button"
                onClick={syncToS3}
                disabled={localCount === 0}
                title="Upload local training images to S3"
              >
                ⬆️ Sync to S3
              </button>

              <button 
                className="training-button"
                onClick={generateTrainingImages}
                disabled={!baseImage}
                title="Generate new training images from base image"
              >
                ✨ Generate Images
              </button>

              <button
                className="training-button"
                onClick={onClose}
                title="Close and return to actor library"
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>

      {syncStatus.message && !syncStatus.syncing && (
        <div className="sync-message">
          {syncStatus.message}
        </div>
      )}

      {syncStatus.syncing && syncStatus.progress.total > 0 && (
        <div className="training-progress-bar">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(syncStatus.progress.current / syncStatus.progress.total) * 100}%` }}
            />
          </div>
          <div className="progress-bar-text">
            {syncStatus.message}: {syncStatus.progress.current} / {syncStatus.progress.total}
          </div>
        </div>
      )}

      {/* Base Image Modal */}
      {showBaseImageModal && baseImage && (
        <div className="modal-overlay" onClick={() => setShowBaseImageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowBaseImageModal(false)}>
              ✕
            </button>
            <div className="modal-image-container">
              <img src={baseImage} alt={`${actor.name} base`} />
            </div>
            <div className="modal-info">
              <h3>{actor.name}</h3>
              <p><strong>Age:</strong> {actor.age} • <strong>Sex:</strong> {actor.sex} • <strong>Ethnicity:</strong> {actor.ethnicity}</p>
              {actor.description && <p><strong>Description:</strong> {actor.description}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="training-content">

        {/* Training Images Grid */}
        <div className="training-images-section">
          <h3>Training Images ({trainingImages.length})</h3>
          <div className="training-images-grid">
            {trainingImages.map((img) => (
              <div key={img.index} className={`training-image-card status-${img.status}`}>
                <div className="training-image-wrapper">
                  <img 
                    src={img.local_exists ? img.local_path! : img.s3_url} 
                    alt={img.filename}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to S3 URL if local fails
                      if (img.local_exists && e.currentTarget.src !== img.s3_url) {
                        e.currentTarget.src = img.s3_url;
                      }
                    }}
                  />
                  <div className="training-image-badges">
                    {img.local_exists && (
                      <div className="training-image-badge local" title="Exists locally">
                        💾
                      </div>
                    )}
                    {img.s3_url && (
                      <div className="training-image-badge s3" title="Exists in S3">
                        ☁️
                      </div>
                    )}
                    {img.status === 'synced' && (
                      <div className="training-image-badge synced" title="Hashes match - fully synced">
                        ✓
                      </div>
                    )}
                    {img.status === 'mismatch' && (
                      <div className="training-image-badge mismatch" title="Hash mismatch - files differ">
                        ⚠️
                      </div>
                    )}
                  </div>
                  <button
                    className="training-image-delete"
                    onClick={() => deleteTrainingImage(img)}
                    title="Delete from local and S3"
                  >
                    🗑️
                  </button>
                </div>
                <div className="training-image-info">
                  <span className="training-image-filename" title={img.filename}>{img.filename}</span>
                  <span className="training-image-index">#{img.index}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {trainingImages.length === 0 && (
          <div className="training-empty">
            <div className="empty-icon">📸</div>
            <h3>No Training Images</h3>
            <p>Generate training images from the base image to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
