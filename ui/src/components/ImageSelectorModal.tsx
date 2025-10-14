import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import './ImageSelectorModal.css';

interface InputImage {
  filename: string;
  path: string;
  hasPrompt: boolean;
}

interface ImageSelectorModalProps {
  images: InputImage[];
  selectedImage: string;
  onSelect: (filename: string) => void;
}

export function ImageSelectorModal({ images, selectedImage, onSelect }: ImageSelectorModalProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredImages = images.filter(img =>
    img.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (path: string) => {
    onSelect(path);
    setOpen(false);
  };

  // selectedImage can be either a path or a filename, check both
  const selectedImageData = images.find(img => 
    img.path === selectedImage || img.filename === selectedImage
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="selector-trigger">
          {selectedImageData ? (
            <div className="selected-preview">
              <img src={selectedImageData.path} alt={selectedImageData.filename} />
              <span className="selected-name">{selectedImageData.filename}</span>
            </div>
          ) : (
            <div className="selector-placeholder">
              <span className="placeholder-icon">🖼️</span>
              <span>Select Source Image</span>
            </div>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content large">
          <div className="modal-header">
            <Dialog.Title className="modal-title">
              Select Source Image
            </Dialog.Title>
            <Dialog.Close className="modal-close">
              ×
            </Dialog.Close>
          </div>

          <div className="modal-search">
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="search-info">
              {filteredImages.length} of {images.length} images
            </div>
          </div>

          <div className="modal-body">
            <div className="image-grid">
              {filteredImages.map((image) => (
                <div
                  key={image.filename}
                  className={`image-grid-item ${selectedImage === image.path || selectedImage === image.filename ? 'selected' : ''}`}
                  onClick={() => handleSelect(image.path)}
                >
                  <div className="image-grid-preview">
                    <img src={image.path} alt={image.filename} loading="lazy" />
                    {image.hasPrompt && (
                      <div className="prompt-indicator">📝</div>
                    )}
                  </div>
                  <div className="image-grid-label">
                    {image.filename}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
