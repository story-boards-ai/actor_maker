import { useState, useEffect } from 'react';
import type { Style } from '../types';
import { getLocalStyleImage, getGradientForStyle } from '../utils/imageHelpers';
import { useStyleStatus } from './hooks/useStyleStatus';
import { StyleStatusIndicators } from './StyleStatusIndicators';
import './StyleCard.css';

type AssessmentRating = 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed' | null;

interface StyleCardProps {
  style: Style;
  bestRating?: AssessmentRating;
  onOpenTrainingTab?: (style: Style, version: 'v1' | 'v2') => void;
  onOpenTrainingManager?: (style: Style) => void;
  onOpenS3Manager?: (style: Style) => void;
}

export function StyleCard({ style, bestRating, onOpenTrainingManager, onOpenS3Manager }: StyleCardProps) {
  const [imageError, setImageError] = useState(false);
  const [localImageError, setLocalImageError] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(false);
  
  // Don't fetch status automatically - only when user requests it (performance optimization)
  const { status, loading: statusLoading } = useStyleStatus(style, { 
    enabled: statusEnabled, 
    skipS3: false  // Include S3 when user explicitly requests status
  });
  
  const localImagePath = getLocalStyleImage(style.id, style.lora_name);
  const gradient = getGradientForStyle(style.title);

  // Build the image path from public folder
  const imageSrc = `/public/${style.image_path}`;
  
  // Debug logging
  useEffect(() => {
    console.log(`Style ${style.title} (#${style.client_index}):`, imageSrc);
  }, [style.title, style.client_index, imageSrc]);

  const handleImageError = () => {
    console.error(`Image failed for ${style.title}:`, imageError && localImagePath ? localImagePath : imageSrc);
    if (!imageError && localImagePath) {
      // Try local image first
      setImageError(true);
    } else {
      // Both failed, show placeholder
      setLocalImageError(true);
    }
  };

  return (
    <div className="style-card">
      <div className="style-card-image">
        {!localImageError ? (
          <img 
            src={imageError && localImagePath ? localImagePath : imageSrc}
            alt={style.title} 
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div 
            className="style-card-placeholder"
            style={{ background: gradient }}
          >
            <div className="placeholder-text">{style.title}</div>
          </div>
        )}
        <div className="style-card-overlay">
          <span className="style-index">#{style.client_index}</span>
          {style.monochrome && <span className="style-tag">Mono</span>}
          {bestRating && (
            <span 
              className={`style-rating-badge rating-${bestRating}`} 
              title={`Rated as ${bestRating}`}
            >
              {bestRating === 'excellent' && '⭐'}
              {bestRating === 'good' && '✅'}
              {bestRating === 'acceptable' && '👍'}
              {bestRating === 'poor' && '⚠️'}
              {bestRating === 'failed' && '❌'}
            </span>
          )}
        </div>
      </div>
      
      <div className="style-card-content">
        <div className="style-card-header">
          <h3 className="style-card-title">{style.title}</h3>
        </div>
        
        <div className="style-card-info">
          <div className="info-row">
            <span className="info-label">ID</span>
            <span className="info-value mono">{style.lora_name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Trigger</span>
            <span className="info-value mono">{style.trigger_words}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Weight</span>
            <span className="info-value">{style.lora_weight} <span className="info-subtle">v{style.lora_version}</span></span>
          </div>
        </div>

        <StyleStatusIndicators 
          status={status} 
          loading={statusLoading}
          statusLoaded={statusEnabled}
          onLoadStatus={() => setStatusEnabled(true)}
        />

        {(onOpenS3Manager || onOpenTrainingManager) && (
          <div className="style-card-actions">
            {onOpenS3Manager && (
              <button 
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenS3Manager(style);
                }}
                title="Manage S3 data"
              >
                S3
              </button>
            )}
            {onOpenTrainingManager && (
              <button 
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTrainingManager(style);
                }}
                title="Generate training data"
              >
                Generate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
