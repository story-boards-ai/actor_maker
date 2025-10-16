import { useState, useEffect } from 'react';
import type { BaseImage } from './types';

interface BaseImageCardProps {
  baseImage: BaseImage;
  isSelected: boolean;
  onToggleSelection: () => void;
  actorId: string;
  onGoodToggled?: () => void;
}

export function BaseImageCard({ baseImage, isSelected, onToggleSelection, actorId, onGoodToggled }: BaseImageCardProps) {
  const [isGood, setIsGood] = useState(baseImage.good || false);
  const [toggling, setToggling] = useState(false);

  // Update good status if baseImage prop changes
  useEffect(() => {
    setIsGood(baseImage.good || false);
  }, [baseImage.good]);

  const toggleGood = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggling) return;

    setToggling(true);
    try {
      const response = await fetch(`/api/actors/${actorId}/training-data/${encodeURIComponent(baseImage.filename)}/toggle-good`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to toggle good status');

      const data = await response.json();
      setIsGood(data.good);
      
      // Notify parent to reload data if needed
      if (onGoodToggled) {
        onGoodToggled();
      }
    } catch (error) {
      console.error('Error toggling good status:', error);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="training-item base">
      <div className="training-item-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          title="Select for batch processing"
        />
      </div>
      
      <div className="training-item-image">
        <img src={baseImage.path} alt={baseImage.filename} loading="lazy" />
        <div className="training-badge base-badge">
          Base Image
        </div>
        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {baseImage.hasPrompt && (
            <div className="prompt-indicator">📝</div>
          )}
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

      <div className="training-item-info">
        <span className="training-filename">{baseImage.filename}</span>
        {baseImage.prompt && (
          <p className="training-prompt">{baseImage.prompt.substring(0, 80)}...</p>
        )}
      </div>
    </div>
  );
}
