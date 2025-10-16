interface BaseImageThumbnailProps {
  baseImage: string;
  actorName: string;
  onClick: () => void;
}

export function BaseImageThumbnail({ baseImage, actorName, onClick }: BaseImageThumbnailProps) {
  return (
    <img 
      src={baseImage} 
      alt={`${actorName} base`}
      onClick={onClick}
      style={{ 
        width: '60px', 
        height: '60px', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        border: '2px solid rgba(255,255,255,0.3)', 
        objectFit: 'cover',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
      }}
      title="Click to view full size"
    />
  );
}
