import { useState } from "react";
import type { TestSuiteResult } from "../types/test-suite";

interface TestSuiteResultsModalProps {
  show: boolean;
  result: TestSuiteResult | null;
  onClose: () => void;
}

export function TestSuiteResultsModal({
  show,
  result,
  onClose,
}: TestSuiteResultsModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  if (!show || !result) return null;

  const hasImages = result.images && result.images.length > 0;
  const currentImage = hasImages ? result.images[selectedImageIndex] : null;

  const handlePrevious = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : result.images.length - 1));
  };

  const handleNext = () => {
    setSelectedImageIndex((prev) => (prev < result.images.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="test-results-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="test-results-header">
          <div className="test-results-title">
            <h2>🎬 Test Suite Results</h2>
            <p className="test-results-subtitle">
              {result.suiteName} • {result.styleName} • {result.modelName}
            </p>
          </div>
          <div className="test-results-header-buttons">
            <button 
              className="settings-gear-button" 
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
              aria-label="View generation settings"
              title="View generation settings"
            >
              ⚙️
            </button>
            <button className="close-button" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Settings Popover */}
        {showSettingsPopover && (
          <div className="settings-popover-overlay" onClick={() => setShowSettingsPopover(false)}>
            <div className="settings-popover" onClick={(e) => e.stopPropagation()}>
              <div className="settings-popover-header">
                <h3>⚙️ Generation Settings</h3>
                <button 
                  className="settings-popover-close" 
                  onClick={() => setShowSettingsPopover(false)}
                  aria-label="Close settings"
                >
                  ✕
                </button>
              </div>
              <div className="settings-popover-content">
                <div className="settings-grid">
                  <div className="setting-item">
                    <span className="setting-label">Steps:</span>
                    <span className="setting-value">{result.settings.steps}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">CFG Scale:</span>
                    <span className="setting-value">{result.settings.cfg}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Denoise:</span>
                    <span className="setting-value">{result.settings.denoise}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Guidance:</span>
                    <span className="setting-value">{result.settings.guidance}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Resolution:</span>
                    <span className="setting-value">
                      {result.settings.width} × {result.settings.height}
                    </span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Sampler:</span>
                    <span className="setting-value">{result.settings.samplerName}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Scheduler:</span>
                    <span className="setting-value">{result.settings.schedulerName}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">LoRA Weight:</span>
                    <span className="setting-value">{result.settings.loraWeight}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Seed:</span>
                    <span className="setting-value monospace">{result.settings.seed}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="test-results-body">
          {/* Main Image Display - Full Size, Scaled to Fit */}
          <div className="test-results-main">
            <div className="test-image-container">
              {!hasImages ? (
                <div className="no-image">
                  <div className="loading-spinner">⏳</div>
                  <p>Generating images...</p>
                  <p className="loading-hint">Images will appear here as they complete</p>
                </div>
              ) : currentImage ? (
                <>
                  <img
                    src={currentImage.imageUrl}
                    alt={currentImage.description}
                    className="test-result-image"
                  />
                  
                  {/* Navigation Arrows */}
                  <button
                    className="nav-arrow nav-arrow-left"
                    onClick={handlePrevious}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    className="nav-arrow nav-arrow-right"
                    onClick={handleNext}
                    aria-label="Next image"
                  >
                    ›
                  </button>

                  {/* Image Counter */}
                  <div className="image-counter">
                    {selectedImageIndex + 1} / {result.images.length}
                  </div>
                </>
              ) : (
                <div className="no-image">No image available</div>
              )}
            </div>

            {/* Simplified Prompt Details */}
            {currentImage && (
              <div className="test-image-details">
                <div className="prompt-section">
                  <div className="prompt-label">Frontpad</div>
                  <div className="prompt-content">{currentImage.frontpad || "(none)"}</div>
                </div>
                
                <div className="prompt-section">
                  <div className="prompt-label">Prompt</div>
                  <div className="prompt-content prompt-main">{currentImage.prompt}</div>
                </div>
                
                <div className="prompt-section">
                  <div className="prompt-label">Backpad</div>
                  <div className="prompt-content">{currentImage.backpad || "(none)"}</div>
                </div>

                <details className="full-prompt-details">
                  <summary className="full-prompt-summary">Full Prompt Sent for Generation</summary>
                  <div className="full-prompt-content">
                    {currentImage.fullPrompt}
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Thumbnail Grid */}
          <div className="test-results-thumbnails">
            <h3>All Results ({hasImages ? result.images.length : 0})</h3>
            <div className="thumbnail-grid">
              {!hasImages ? (
                <div className="thumbnails-loading">
                  <p>⏳ Waiting for images...</p>
                </div>
              ) : (
                result.images.map((image, index) => (
                  <div
                    key={image.promptId}
                    className={`thumbnail-item ${
                      index === selectedImageIndex ? "thumbnail-item-active" : ""
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedImageIndex(index);
                      }
                    }}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.description}
                      className="thumbnail-image"
                    />
                    <div className="thumbnail-label">
                      <span className="thumbnail-id">{image.promptId}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
