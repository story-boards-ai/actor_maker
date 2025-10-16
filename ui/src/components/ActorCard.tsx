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
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="actor-index">#{actor.id}</span>
              {trainingInfo !== null && (
                <>
                  <span 
                    className="actor-tag" 
                    style={{ background: trainingInfo.count > 0 ? '#10b981' : '#94a3b8' }}
                    title={`${trainingInfo.count} training images`}
                  >
                    📸 {trainingInfo.count}
                  </span>
                  {/* Indicators for missing training images 0 and 1 */}
                  {trainingInfo.count > 0 && (!trainingInfo.hasImage0 || !trainingInfo.hasImage1) && (
                    <span
                      className="actor-tag"
                      style={{ 
                        background: '#ef4444',
                        fontSize: '11px',
                        padding: '2px 6px'
                      }}
                      title={`Missing: ${!trainingInfo.hasImage0 ? 'image_0' : ''}${!trainingInfo.hasImage0 && !trainingInfo.hasImage1 ? ', ' : ''}${!trainingInfo.hasImage1 ? 'image_1' : ''}`}
                    >
                      ⚠️ {!trainingInfo.hasImage0 && '0'}{!trainingInfo.hasImage0 && !trainingInfo.hasImage1 && ','}{!trainingInfo.hasImage1 && '1'}
                    </span>
                  )}
                </>
              )}
            </div>
            <button
              onClick={toggleGood}
              disabled={toggling}
              style={{
                background: isGood ? '#10b981' : 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: toggling ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'all 0.2s ease',
                opacity: toggling ? 0.5 : 1
              }}
              title={isGood ? 'Mark as not good' : 'Mark as good'}
            >
              {isGood ? '✓' : '○'}
            </button>
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
