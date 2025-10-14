import type { Style } from "../../../types";

interface GeneratedImageDisplayProps {
  selectedStyle: string;
  styles: Style[];
  generatedImage: string | null;
  loading: boolean;
  error: string | null;
  monochromeContrast: number;
  monochromeBrightness: number;
}

export function GeneratedImageDisplay(props: GeneratedImageDisplayProps) {
  const {
    selectedStyle,
    styles,
    generatedImage,
    loading,
    error,
    monochromeContrast,
    monochromeBrightness,
  } = props;

  const selectedStyleData = styles.find((s) => s.id === selectedStyle);

  return (
    <div className="validator-image-display">
      <div className="image-display-header">
        <h3>Generated Image</h3>
        {selectedStyleData && (
          <div className="image-display-info">
            Style: <strong>{selectedStyleData.title}</strong>
          </div>
        )}
      </div>

      <div className="image-display-container">
        {loading && (
          <div className="image-display-loading">
            <div className="spinner"></div>
            <p>Generating image...</p>
          </div>
        )}

        {error && !loading && (
          <div className="image-display-error">
            <div className="error-icon">❌</div>
            <p className="error-message">{error}</p>
          </div>
        )}

        {!loading && !error && !generatedImage && (
          <div className="image-display-empty">
            <div className="empty-icon">🖼️</div>
            <p>No image generated yet</p>
            <p className="empty-hint">
              Select a style, enter a prompt, and click Generate Image
            </p>
          </div>
        )}

        {!loading && !error && generatedImage && (
          <div className="image-display-result">
            <img
              src={generatedImage}
              alt="Generated result"
              className="generated-image"
              style={{
                filter: selectedStyleData?.monochrome
                  ? `contrast(${monochromeContrast}) brightness(${monochromeBrightness})`
                  : undefined,
              }}
            />
            <div className="image-display-actions">
              <a
                href={generatedImage}
                download="generated-image.png"
                className="btn-download"
              >
                💾 Download
              </a>
              <button
                onClick={() => window.open(generatedImage, '_blank')}
                className="btn-view-full"
              >
                🔍 View Full Size
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
