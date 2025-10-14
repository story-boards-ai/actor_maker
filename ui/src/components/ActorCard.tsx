import { useState, useEffect } from 'react';
import type { Actor } from '../types';
import './StyleCard.css';

interface ActorCardProps {
  actor: Actor;
}

export function ActorCard({ actor }: ActorCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // Use the poster frame images from the actor data
  const imageSrc = actor.poster_frames.accelerated.webp_md;
  
  // Debug logging
  useEffect(() => {
    console.log(`Actor ${actor.name} (#${actor.id}):`, imageSrc);
  }, [actor.name, actor.id, imageSrc]);

  const handleImageError = () => {
    console.error(`Image failed for ${actor.name}:`, imageSrc);
    setImageError(true);
  };

  // Generate a gradient based on ethnicity for placeholder
  const getGradientForActor = (ethnicity: string) => {
    const gradients: Record<string, string> = {
      european: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      asian: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      african: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      latino: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'middle-eastern': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    };
    return gradients[ethnicity.toLowerCase()] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  };

  return (
    <div className="style-card">
      <div className="style-card-image">
        {!imageError ? (
          <img 
            src={imageSrc}
            alt={actor.name} 
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div 
            className="style-card-placeholder"
            style={{ background: getGradientForActor(actor.ethnicity) }}
          >
            <div className="placeholder-text">{actor.name}</div>
          </div>
        )}
        <div className="style-card-overlay">
          <span className="style-index">#{actor.id}</span>
          <span className="style-tag">{actor.ethnicity}</span>
        </div>
      </div>
      
      <div className="style-card-content">
        <div className="style-card-header">
          <h3 className="style-card-title">{actor.name}</h3>
        </div>
        
        <div className="style-card-info">
          <div className="info-row">
            <span className="info-label">Age</span>
            <span className="info-value">{actor.age}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Sex</span>
            <span className="info-value">{actor.sex}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Ethnicity</span>
            <span className="info-value">{actor.ethnicity}</span>
          </div>
        </div>

        <div className="style-card-description">
          <p>{actor.description}</p>
        </div>
      </div>
    </div>
  );
}
