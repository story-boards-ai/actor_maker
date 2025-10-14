import { useEffect, useState } from 'react';
import type { Style } from '../types';
import { getStyleFolderName } from '../utils/trainingImagesHelper';
import './TrainingImagesModal.css';

interface TrainingImagesModalProps {
  style: Style;
  version?: string;
  onClose: () => void;
}

export function TrainingImagesModal({ style, version = '1.0', onClose }: TrainingImagesModalProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrainingImages() {
      setLoading(true);
      setError(null);

      const folderName = getStyleFolderName(style.id);
      
      if (!folderName) {
        setError('No training images folder found for this style');
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/training-images/${folderName}`);
        
        if (!response.ok) {
          throw new Error('Failed to load training images');
        }

        const data = await response.json();
        setImages(data.images || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load training images');
      } finally {
        setLoading(false);
      }
    }

    loadTrainingImages();
  }, [style.id, version]);

  return (
    <div className="training-modal-overlay" onClick={onClose}>
      <div className="training-modal" onClick={(e) => e.stopPropagation()}>
        <div className="training-modal-header">
          <div>
            <h2>Training Images</h2>
            <p className="training-modal-subtitle">
              {style.title} (v{version})
            </p>
          </div>
          <button className="training-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="training-modal-content">
          {loading && (
            <div className="training-modal-loading">
              <div className="spinner"></div>
              <p>Loading training images...</p>
            </div>
          )}

          {error && (
            <div className="training-modal-error">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && images.length === 0 && (
            <div className="training-modal-empty">
              <div className="empty-icon">📁</div>
              <h3>No Training Images Found</h3>
              <p>This style doesn't have training images in the resources folder yet.</p>
            </div>
          )}

          {!loading && !error && images.length > 0 && (
            <>
              <div className="training-modal-info">
                <span className="training-count">
                  <strong>{images.length}</strong> training images
                </span>
                <span className="training-version">Version {version}</span>
              </div>

              <div className="training-images-grid">
                {images.map((imagePath, index) => (
                  <div key={index} className="training-image-card">
                    <img 
                      src={imagePath} 
                      alt={`Training image ${index + 1}`}
                      loading="lazy"
                    />
                    <div className="training-image-overlay">
                      <span>Image {index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
