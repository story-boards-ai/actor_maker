import type { BaseImage } from './types';

interface BaseImageCardProps {
  baseImage: BaseImage;
  isSelected: boolean;
  onToggleSelection: () => void;
}

export function BaseImageCard({ baseImage, isSelected, onToggleSelection }: BaseImageCardProps) {
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
        {baseImage.hasPrompt && (
          <div className="prompt-indicator">📝</div>
        )}
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
