import { useState, useEffect } from 'react';
import type { Actor } from '../types';
import './ActorCard.css';

interface ActorCardProps {
  actor: Actor;
  onOpenTrainingData?: (actor: Actor) => void;
}

export function ActorCard({ actor, onOpenTrainingData }: ActorCardProps) {
  const [imageError, setImageError] = useState(false);

  // Build the image path - use the img field from actor data
  const imageSrc = actor.url || `/actors/${actor.img}`;

  const handleImageError = () => {
    console.error(`Image failed for ${actor.name}:`, imageSrc);
    setImageError(true);
  };

  return (
    <div className="actor-card">
      <div className="actor-card-image">
        {!imageError ? (
          <img 
            src={imageSrc}
            alt={actor.name} 
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="actor-card-placeholder">
            <div className="placeholder-text">{actor.name}</div>
          </div>
        )}
        <div className="actor-card-overlay">
          <span className="actor-index">#{actor.id}</span>
          <span className="actor-tag">{actor.sex}</span>
        </div>
      </div>
      
      <div className="actor-card-content">
        <div className="actor-card-header">
          <h3 className="actor-card-title">{actor.name}</h3>
        </div>
        
        <div className="actor-card-info">
          <div className="info-row">
            <span className="info-label">Age</span>
            <span className="info-value">{actor.age}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Ethnicity</span>
            <span className="info-value">{actor.ethnicity}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Description</span>
            <span className="info-value">{actor.face_prompt}</span>
          </div>
        </div>

        {onOpenTrainingData && (
          <div className="actor-card-actions">
            <button
              className="actor-card-button"
              onClick={() => onOpenTrainingData(actor)}
              title="Manage training data"
            >
              📸 Training Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
