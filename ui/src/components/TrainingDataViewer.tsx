import { useEffect, useState } from 'react';
import type { Style } from '../types';
import './TrainingDataViewer.css';

interface TrainingDataViewerProps {
  style: Style;
  version: 'v1' | 'v2';
  onClose: () => void;
}

interface TrainingImage {
  filename: string;
  path: string;
  hasPrompt?: boolean;
  isBaseline?: boolean;
}

interface TrainingDataResponse {
  images: TrainingImage[];
  count: number;
  isBaseline?: boolean;
  message?: string;
}

export function TrainingDataViewer({ style, version, onClose }: TrainingDataViewerProps) {
  const [images, setImages] = useState<TrainingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBaseline, setIsBaseline] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrainingImages() {
      try {
        setLoading(true);
        setError(null);

        // Fetch training images for this style
        const response = await fetch(`/api/styles/${style.id}/training-images?version=${version}`);
        
        // Handle 404 gracefully - it just means no training images exist yet
        if (response.status === 404) {
          console.log('No training images found for style', style.id, 'version', version);
          setImages([]);
          setIsBaseline(version === 'v2');
          setResponseMessage(version === 'v2' ? 'Baseline input images - will be replaced with styled versions' : null);
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to load training images: ${response.status} ${response.statusText}`);
        }

        const data: TrainingDataResponse = await response.json();
        setImages(data.images || []);
        setIsBaseline(data.isBaseline || false);
        setResponseMessage(data.message || null);
      } catch (err) {
        console.error('Error loading training images:', err);
        setError(err instanceof Error ? err.message : 'Failed to load training images');
      } finally {
        setLoading(false);
      }
    }

    loadTrainingImages();
  }, [style.id, version]);

  if (loading) {
    return (
      <div className="training-data-viewer">
        <div className="training-header">
          <div>
            <h2>{style.title} {version.toUpperCase()}</h2>
            <p className="training-subtitle">Loading training images...</p>
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
      <div className="training-data-viewer">
        <div className="training-header">
          <div>
            <h2>{style.title} {version.toUpperCase()}</h2>
            <p className="training-subtitle">Error loading training data</p>
          </div>
        </div>
        <div className="training-error">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Training Images</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="training-data-viewer">
        <div className="training-header">
          <div>
            <h2>{style.title} {version.toUpperCase()}</h2>
            <p className="training-subtitle">No training images found</p>
          </div>
        </div>
        <div className="training-empty">
          <div className="empty-icon">📸</div>
          <h3>No Training Data Available</h3>
          <p>
            {version === 'v2' 
              ? 'Baseline input images not found.'
              : 'No Version 1 training images found for this style.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="training-data-viewer">
      <div className="training-header">
        <div>
          <h2>{style.title} {version.toUpperCase()}</h2>
          <p className="training-subtitle">
            {isBaseline ? (
              <span>
                <strong>{images.length}</strong> baseline {images.length === 1 ? 'image' : 'images'}
                {' '}• Will be replaced with styled versions
              </span>
            ) : (
              <span>{images.length} training {images.length === 1 ? 'image' : 'images'}</span>
            )}
          </p>
        </div>
      </div>

      <div className="training-images-grid">
        {images.map((image, index) => (
          <div key={image.filename} className={`training-image-item ${isBaseline ? 'baseline' : ''}`}>
            <div className="training-image-wrapper">
              <img 
                src={image.path} 
                alt={`Training image ${index + 1}`}
                loading="lazy"
              />
              {isBaseline && (
                <div className="baseline-badge">
                  <span>Baseline</span>
                </div>
              )}
              {image.hasPrompt && (
                <div className="prompt-badge">
                  <span>📝</span>
                </div>
              )}
            </div>
            <div className="training-image-info">
              <span className="training-image-filename">{image.filename}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
