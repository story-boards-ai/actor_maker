import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Style } from '../types';
import { getGradientForStyle } from '../utils/imageHelpers';
import './StyleSelectorModal.css';

type AssessmentRating = 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed' | null;

interface StyleSelectorModalProps {
  styles: Style[];
  selectedStyle: string;
  onSelect: (styleId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  assessments?: Record<string, AssessmentRating>;
}

export function StyleSelectorModal({ styles, selectedStyle, onSelect, open: controlledOpen, onOpenChange, assessments = {} }: StyleSelectorModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStyles = styles.filter(style =>
    style.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    style.lora_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (styleId: string) => {
    onSelect(styleId);
    setOpen(false);
  };

  const selectedStyleData = styles.find(s => s.id === selectedStyle);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <Dialog.Trigger asChild>
          <button className="selector-trigger">
          {selectedStyleData ? (
            <div className="selected-preview">
              <div className="style-preview-image">
                <img src={`/public/${selectedStyleData.image_path}`} alt={selectedStyleData.title} />
              </div>
              <div className="style-preview-info">
                <span className="selected-name">{selectedStyleData.title}</span>
                <span className="selected-meta">{selectedStyleData.lora_name}</span>
              </div>
            </div>
          ) : (
            <div className="selector-placeholder">
              <span className="placeholder-icon">🎨</span>
              <span>Select Style</span>
            </div>
          )}
          </button>
        </Dialog.Trigger>
      )}

      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content large">
          <div className="modal-header">
            <Dialog.Title className="modal-title">
              Select Style
            </Dialog.Title>
            <Dialog.Close className="modal-close">
              ×
            </Dialog.Close>
          </div>

          <div className="modal-search">
            <input
              type="text"
              placeholder="Search styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="search-info">
              {filteredStyles.length} of {styles.length} styles
            </div>
          </div>

          <div className="modal-body">
            <div className="style-grid">
              {filteredStyles.map((style) => {
                const gradient = getGradientForStyle(style.title);
                const rating = assessments[style.id];
                
                return (
                  <div
                    key={style.id}
                    className={`style-grid-item ${selectedStyle === style.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(style.id)}
                  >
                    <div className="style-grid-preview">
                      <img 
                        src={`/public/${style.image_path}`} 
                        alt={style.title}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLDivElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="style-placeholder"
                        style={{ background: gradient, display: 'none' }}
                      >
                        🎨
                      </div>
                      <div className="style-badges">
                        {style.monochrome && (
                          <div className="style-badge">Mono</div>
                        )}
                        {rating && (
                          <div className={`style-badge rating-${rating}`} title={`Rated as ${rating}`}>
                            {rating === 'excellent' && '⭐'}
                            {rating === 'good' && '✅'}
                            {rating === 'acceptable' && '👍'}
                            {rating === 'poor' && '⚠️'}
                            {rating === 'failed' && '❌'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="style-grid-info">
                      <div className="style-grid-title">{style.title}</div>
                      <div className="style-grid-meta">
                        {style.lora_name}
                      </div>
                      <div className="style-grid-weight">
                        Weight: {style.lora_weight}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
