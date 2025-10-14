import type { BaseImage, TrainingImage } from './types';
import { BaseImageCard } from './BaseImageCard';
import { TrainingImageCard } from './TrainingImageCard';
import { PlaceholderCard } from './PlaceholderCard';
import { getBasename } from '../../utils/trainingDataManager/imageMapping';

interface TrainingImagePairProps {
  baseImage: BaseImage;
  trainingImage: TrainingImage | null;
  imageRefreshKey: number;
  onToggleSelection: () => void;
  onSendToImageGen: (baseImage: BaseImage, trainingImage?: TrainingImage) => void;
  onRecreate: (baseImage: BaseImage) => void;
  onDelete: (trainingFilename: string) => void;
  onGenerate: (baseImage: BaseImage) => void;
}

export function TrainingImagePair({
  baseImage,
  trainingImage,
  imageRefreshKey,
  onToggleSelection,
  onSendToImageGen,
  onRecreate,
  onDelete,
  onGenerate,
}: TrainingImagePairProps) {
  const hasTraining = trainingImage !== null;

  return (
    <div className={`training-pair ${baseImage.isSelected ? 'selected' : ''}`}>
      {/* Base Image */}
      <BaseImageCard
        baseImage={baseImage}
        isSelected={baseImage.isSelected}
        onToggleSelection={onToggleSelection}
      />

      {/* Training Image or Placeholder */}
      <div className="training-item result">
        {hasTraining && trainingImage ? (
          <TrainingImageCard
            baseImage={baseImage}
            trainingImage={trainingImage}
            imageRefreshKey={imageRefreshKey}
            onSendToImageGen={onSendToImageGen}
            onRecreate={onRecreate}
            onDelete={onDelete}
          />
        ) : (
          <PlaceholderCard
            baseImage={baseImage}
            onGenerate={onGenerate}
          />
        )}
      </div>
    </div>
  );
}
