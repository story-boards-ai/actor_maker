import { useState, useEffect } from "react";
import type { Actor } from "../types";
import { fetchTrainingImageCount } from "../utils/trainingDataUtils";
import "./ActorCard.css";

interface ActorCardProps {
  actor: Actor;
  onOpenTrainingData?: (actor: Actor) => void;
}

export function ActorCard({ actor, onOpenTrainingData }: ActorCardProps) {
  const [imageError, setImageError] = useState(false);
  const [trainingCount, setTrainingCount] = useState<number | null>(null);

  // Build the image path - use the img field from actor data
  const imageSrc =
    actor.poster_frames?.accelerated?.webp_md ||
    actor.poster_frames?.standard?.webp_md;

  const handleImageError = () => {
    console.error(`Image failed for ${actor.name}:`, imageSrc);
    setImageError(true);
  };

  useEffect(() => {
    // Fetch training image count
    fetchTrainingImageCount(actor.id).then(setTrainingCount);
  }, [actor.id]);

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
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="actor-index">#{actor.id}</span>
            {trainingCount !== null && (
              <span 
                className="actor-tag" 
                style={{ background: trainingCount > 0 ? '#10b981' : '#94a3b8' }}
                title={`${trainingCount} training images`}
              >
                📸 {trainingCount}
              </span>
            )}
          </div>
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
