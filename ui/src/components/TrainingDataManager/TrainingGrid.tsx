import type { BaseImage, TrainingImage } from './types';
import { TrainingImagePair } from './TrainingImagePair';
import { getBasename } from '../../utils/trainingDataManager/imageMapping';

interface TrainingGridProps {
  baseImages: BaseImage[];
  imageMap: Map<string, TrainingImage | null>;
  imageRefreshKey: number;
  onToggleSelection: (index: number) => void;
  onSendToImageGen: (baseImage: BaseImage, trainingImage?: TrainingImage) => void;
  onRecreate: (baseImage: BaseImage) => void;
  onDelete: (trainingFilename: string) => void;
  onGenerate: (baseImage: BaseImage) => void;
  actorId: string;
  onGoodToggled?: () => void;
}

export function TrainingGrid({
  baseImages,
  imageMap,
  imageRefreshKey,
  onToggleSelection,
  onSendToImageGen,
  onRecreate,
  onDelete,
  onGenerate,
  actorId,
  onGoodToggled,
}: TrainingGridProps) {
  return (
    <div className="training-grid">
      {baseImages.map((baseImage, index) => {
        const basename = getBasename(baseImage.filename);
        const trainingImage = imageMap.get(basename) ?? null;

        return (
          <TrainingImagePair
            key={baseImage.filename}
            baseImage={baseImage}
            trainingImage={trainingImage}
            imageRefreshKey={imageRefreshKey}
            onToggleSelection={() => onToggleSelection(index)}
            onSendToImageGen={onSendToImageGen}
            onRecreate={onRecreate}
            onDelete={onDelete}
            onGenerate={onGenerate}
            actorId={actorId}
            onGoodToggled={onGoodToggled}
          />
        );
      })}
    </div>
  );
}
