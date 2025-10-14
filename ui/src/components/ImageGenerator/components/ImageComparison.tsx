import type { Style } from '../../../types';

interface InputImage {
  filename: string;
  path: string;
  hasPrompt: boolean;
}

interface ImageComparisonProps {
  selectedImage: string;
  selectedStyle: string;
  inputImages: InputImage[];
  styles: Style[];
  generatedImage: string | null;
  loading: boolean;
  error: string | null;
  monochromeContrast: number;
  monochromeBrightness: number;
  onGenerate: () => void;
  onSaveAsTrainingImage?: () => void;
  savingTrainingImage?: boolean;
}

export function ImageComparison({
  selectedImage,
  selectedStyle,
  inputImages,
  styles,
  generatedImage,
  loading,
  error,
  monochromeContrast,
  monochromeBrightness,
  onGenerate,
  onSaveAsTrainingImage,
  savingTrainingImage = false,
}: ImageComparisonProps) {
  const isMonochrome = selectedStyle && styles.find(s => s.id === selectedStyle)?.monochrome;
  // selectedImage can be either a path or a filename, check both
  const sourceImageData = inputImages.find(img => img.path === selectedImage || img.filename === selectedImage);
  const sourceImagePath = sourceImageData?.path || selectedImage;

  return (
    <div className="generator-main">
      <div className="comparison-container">
        {/* Source Image */}
        <div className="comparison-image">
          <div className="image-label">
            Source Image
            {isMonochrome && (
              <span className="monochrome-badge" title="Monochrome style - showing B&W preview">⚫</span>
            )}
          </div>
          {selectedImage ? (
            <div className="image-wrapper">
              <img
                src={sourceImagePath}
                alt="Source"
                style={
                  isMonochrome
                    ? {
                        filter: `grayscale(100%) contrast(${monochromeContrast}) brightness(${monochromeBrightness})`,
                        transition: 'filter 0.3s ease'
                      }
                    : undefined
                }
              />
              {isMonochrome && (
                <div className="preview-overlay">
                  <span className="preview-badge">B&W Preview</span>
                </div>
              )}
            </div>
          ) : (
            <div className="image-placeholder">
              <span className="placeholder-icon">📷</span>
              <p>Select a source image</p>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="generate-section">
          <button
            className="generate-button-main"
            onClick={onGenerate}
            disabled={loading || !selectedImage || !selectedStyle}
            title={!selectedImage ? 'Select source image' : !selectedStyle ? 'Select style' : 'Generate image'}
          >
            {loading ? (
              <>
                <span className="loading-spinner">⏳</span>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span className="generate-icon">✨</span>
                <span>Generate</span>
              </>
            )}
          </button>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        {/* Generated Image */}
        <div className="comparison-image">
          <div className="image-label">
            Generated Image
            {generatedImage && onSaveAsTrainingImage && (
              <button
                className="save-training-button"
                onClick={onSaveAsTrainingImage}
                disabled={savingTrainingImage || loading}
                title="Save as training image for this base image"
              >
                {savingTrainingImage ? '⏳ Saving...' : '💾 Save as Training Image'}
              </button>
            )}
          </div>
          {generatedImage ? (
            <div className="image-wrapper">
              <img src={generatedImage} alt="Generated" />
            </div>
          ) : (
            <div className="image-placeholder">
              {loading ? (
                <>
                  <div className="spinner-container">
                    <div className="radix-spinner" />
                  </div>
                  <p style={{marginTop: '1rem', color: '#3b82f6'}}>Generating image...</p>
                </>
              ) : (
                <>
                  <span className="placeholder-icon">🖼️</span>
                  <p>Generated image will appear here</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
