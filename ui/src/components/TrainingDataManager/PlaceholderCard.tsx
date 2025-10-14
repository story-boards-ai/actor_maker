import type { BaseImage } from './types';

interface PlaceholderCardProps {
  baseImage: BaseImage;
  onGenerate: (baseImage: BaseImage) => void;
}

export function PlaceholderCard({ baseImage, onGenerate }: PlaceholderCardProps) {
  return (
    <div className="training-placeholder">
      {baseImage.isGenerating ? (
        <>
          <div className="spinner"></div>
          <p>Generating training image...</p>
        </>
      ) : (
        <>
          <div className="placeholder-icon">📸</div>
          <p>No training image</p>
          <button
            className="training-button small primary"
            onClick={() => onGenerate(baseImage)}
            title="Generate training image"
          >
            ✨ Generate
          </button>
        </>
      )}
    </div>
  );
}
