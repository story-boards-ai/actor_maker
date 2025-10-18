import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Actor } from "../types";
import { fetchTrainingDataInfo, type TrainingDataInfo } from "../utils/trainingDataUtils";
import "./ActorCard.css";

interface ActorCardProps {
  actor: Actor;
  onOpenTrainingData?: (actor: Actor) => void;
  onRegeneratePosterFrame?: (actor: Actor) => void;
  onActorUpdated?: () => void;
}

export function ActorCard({ actor, onOpenTrainingData, onRegeneratePosterFrame, onActorUpdated }: ActorCardProps) {
  const [imageError, setImageError] = useState(false);
  const [trainingInfo, setTrainingInfo] = useState<TrainingDataInfo | null>(null);
  const [isGood, setIsGood] = useState(actor.good || false);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Build the image path - use the img field from actor data
  const imageSrc =
    actor.poster_frames?.accelerated?.webp_md ||
    actor.poster_frames?.standard?.webp_md;

  const handleImageError = () => {
    console.error(`Image failed for ${actor.name}:`, imageSrc);
    setImageError(true);
  };

  useEffect(() => {
    // Fetch training data info
    fetchTrainingDataInfo(actor.id).then(setTrainingInfo);
    // Update good status if actor prop changes
    setIsGood(actor.good || false);
  }, [actor.id, actor.good]);

  const toggleGood = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggling) return;

    setToggling(true);
    try {
      const response = await fetch(`/api/actors/${actor.id}/toggle-good`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to toggle good status');

      const data = await response.json();
      setIsGood(data.good);
      
      // Notify parent to reload actors data
      if (onActorUpdated) {
        onActorUpdated();
      }
    } catch (error) {
      console.error('Error toggling good status:', error);
    } finally {
      setToggling(false);
    }
  };

  const handleRegeneratePosterFrame = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (regenerating || !onRegeneratePosterFrame) return;

    setRegenerating(true);
    toast.info(`Regenerating poster frame for ${actor.name}...`);
    
    try {
      await onRegeneratePosterFrame(actor);
    } catch (error) {
      console.error('Error regenerating poster frame:', error);
      toast.error('Failed to regenerate poster frame');
    } finally {
      setRegenerating(false);
    }
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
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
            <span className="actor-index">#{actor.id}</span>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              {/* Training Data Status Icon */}
              {trainingInfo !== null && (
                <div
                  className="status-badge"
                  style={{
                    background: actor.training_data_good 
                      ? 'rgba(16, 185, 129, 0.95)' // Green - marked good
                      : trainingInfo.count === 0
                      ? 'rgba(148, 163, 184, 0.95)' // Gray - no training data
                      : 'rgba(59, 130, 246, 0.95)', // Blue - has data but not marked good
                    color: 'white',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                  }}
                  title={
                    actor.training_data_good
                      ? `Training data marked good (${trainingInfo.count} images)`
                      : trainingInfo.count === 0
                      ? 'No training data'
                      : `${trainingInfo.count} training images (not marked good)`
                  }
                >
                  {actor.training_data_good ? '✓' : trainingInfo.count === 0 ? '∅' : trainingInfo.count}
                  <span style={{ fontSize: '11px' }}>📸</span>
                </div>
              )}
              
              {/* Model Status Icon */}
              <div
                className="status-badge"
                style={{
                  background: actor.production_synced
                    ? 'rgba(147, 51, 234, 0.95)' // Purple - synced to production
                    : actor.custom_models_good
                    ? 'rgba(16, 185, 129, 0.95)' // Green - has good model
                    : (actor.custom_models_count || 0) > 0
                    ? 'rgba(59, 130, 246, 0.95)' // Blue - has models but not marked good
                    : 'rgba(148, 163, 184, 0.95)', // Gray - no custom models
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
                title={
                  actor.production_synced
                    ? 'Model synced to production'
                    : actor.custom_models_good
                    ? `Good model available (${actor.custom_models_count || 0} total)`
                    : (actor.custom_models_count || 0) > 0
                    ? `${actor.custom_models_count} custom models (none marked good)`
                    : 'No custom models'
                }
              >
                {actor.production_synced ? '🚀' : actor.custom_models_good ? '✓' : (actor.custom_models_count || 0) > 0 ? actor.custom_models_count : '∅'}
                <span style={{ fontSize: '11px' }}>🎯</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="actor-card-content">
        <div className="actor-card-header">
          <h3 className="actor-card-title">{actor.name}</h3>
        </div>

        <div className="actor-card-info">
          {actor.model_created_at && (
            <div className="info-row">
              <span className="info-label">LoRA Created</span>
              <span className="info-value">
                {new Date(actor.model_created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>

        {(onOpenTrainingData || onRegeneratePosterFrame) && (
          <div className="actor-card-actions">
            {onOpenTrainingData && (
              <button
                className="actor-card-button"
                onClick={() => onOpenTrainingData(actor)}
                title="Manage training data"
              >
                📸 Training Data
              </button>
            )}
            {onRegeneratePosterFrame && (
              <button
                className="actor-card-button-small"
                onClick={handleRegeneratePosterFrame}
                disabled={regenerating}
                title="Regenerate poster frame"
                style={{
                  opacity: regenerating ? 0.5 : 1,
                  cursor: regenerating ? 'not-allowed' : 'pointer'
                }}
              >
                {regenerating ? '⏳' : '🎨'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
