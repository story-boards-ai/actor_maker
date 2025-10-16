interface BaseImageThumbnailProps {
  baseImage: string | null;
  actorName: string;
  onClick: () => void;
}

export function BaseImageThumbnail({ baseImage, actorName, onClick }: BaseImageThumbnailProps) {
  if (!baseImage) {
    return (
      <div
        onClick={onClick}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '8px',
          cursor: 'pointer',
          border: '2px dashed rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        }}
        title="No base image - Click to create one"
      >
        ❓
      </div>
    );
  }

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
