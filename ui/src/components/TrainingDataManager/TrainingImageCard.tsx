import type { BaseImage, TrainingImage } from './types';

interface TrainingImageCardProps {
  baseImage: BaseImage;
  trainingImage: TrainingImage;
  imageRefreshKey: number;
  onSendToImageGen: (baseImage: BaseImage, trainingImage: TrainingImage) => void;
  onRecreate: (baseImage: BaseImage) => void;
  onDelete: (trainingFilename: string) => void;
}

export function TrainingImageCard({
  baseImage,
  trainingImage,
  imageRefreshKey,
  onSendToImageGen,
  onRecreate,
  onDelete,
}: TrainingImageCardProps) {
  return (
    <>
      <div className="training-item-image">
        <img 
          key={`${trainingImage.filename}-${imageRefreshKey}`}
          src={`${trainingImage.path}?v=${imageRefreshKey}`}
          alt={trainingImage.filename} 
          loading="lazy"
          onError={(e) => {
            console.error('❌ Training image FAILED to load:', trainingImage.filename);
            console.error('   Path:', trainingImage.path);
            console.error('   Full URL:', `${trainingImage.path}?v=${imageRefreshKey}`);
            console.error('   Error:', e);
          }}
        />
        <div className="training-badge training-badge">
          Training Image
        </div>
        {baseImage.isGenerating && (
          <div className="training-generating-overlay">
            <div className="spinner-small"></div>
            <span>Regenerating...</span>
          </div>
        )}
      </div>

      <div className="training-item-info">
        <span className="training-filename">{trainingImage.filename}</span>
      </div>

      <div className="training-actions-buttons">
        <button
          className="training-button small"
          onClick={() => onSendToImageGen(baseImage, trainingImage)}
          title="Send to Image Generation tab"
          disabled={baseImage.isGenerating}
        >
          🎨 Edit
        </button>
        <button
          className="training-button small"
          onClick={() => onRecreate(baseImage)}
          title="Recreate training image"
          disabled={baseImage.isGenerating}
        >
          🔄 Recreate
        </button>
        <button
          className="training-button small danger"
          onClick={() => onDelete(trainingImage.filename)}
          title="Delete training image"
          disabled={baseImage.isGenerating}
        >
          🗑️ Delete
        </button>
      </div>
    </>
  );
}
