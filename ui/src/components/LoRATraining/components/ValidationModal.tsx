import type { ValidationIssue } from '../types';

interface ValidationModalProps {
  show: boolean;
  onClose: () => void;
  validationIssue: ValidationIssue;
  selectedStyleId: string | null;
}

export function ValidationModal({ 
  show, 
  onClose, 
  validationIssue, 
  selectedStyleId 
}: ValidationModalProps) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚠️ Training Validation Warning</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {validationIssue.type === 'missing_captions' && (
            <>
              <div className="validation-message">
                <p>
                  <strong>
                    {validationIssue.missingCaptions.length} caption file(s) are missing.
                  </strong>
                </p>
                <p>Training requires a caption file (.txt) for each image.</p>
              </div>
              <div className="missing-files-list">
                <h4>Missing Captions:</h4>
                <ul>
                  {validationIssue.missingCaptions.slice(0, 10).map(file => (
                    <li key={file}>{file}</li>
                  ))}
                  {validationIssue.missingCaptions.length > 10 && (
                    <li>... and {validationIssue.missingCaptions.length - 10} more</li>
                  )}
                </ul>
              </div>
              <div className="validation-actions">
                <button
                  className="modal-button primary"
                  onClick={() => {
                    onClose();
                    window.open(`/caption-editor?styleId=${selectedStyleId}`, '_blank');
                  }}
                >
                  📝 Generate Captions
                </button>
                <button className="modal-button" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}
          {validationIssue.type === 'missing_s3' && (
            <>
              <div className="validation-message">
                <p><strong>Training files are not synced to S3.</strong></p>
                {validationIssue.missingFiles.length > 0 && (
                  <p>{validationIssue.missingFiles.length} image(s) not uploaded</p>
                )}
                {validationIssue.missingCaptions.length > 0 && (
                  <p>{validationIssue.missingCaptions.length} caption(s) not uploaded</p>
                )}
                <p>All training files must be uploaded to S3 before training can start.</p>
              </div>
              <div className="missing-files-list">
                {validationIssue.missingFiles.length > 0 && (
                  <>
                    <h4>Missing Images:</h4>
                    <ul>
                      {validationIssue.missingFiles.slice(0, 5).map(file => (
                        <li key={file}>{file}</li>
                      ))}
                      {validationIssue.missingFiles.length > 5 && (
                        <li>... and {validationIssue.missingFiles.length - 5} more</li>
                      )}
                    </ul>
                  </>
                )}
                {validationIssue.missingCaptions.length > 0 && (
                  <>
                    <h4>Missing Captions:</h4>
                    <ul>
                      {validationIssue.missingCaptions.slice(0, 5).map(file => (
                        <li key={file}>{file}</li>
                      ))}
                      {validationIssue.missingCaptions.length > 5 && (
                        <li>... and {validationIssue.missingCaptions.length - 5} more</li>
                      )}
                    </ul>
                  </>
                )}
              </div>
              <div className="validation-actions">
                <button
                  className="modal-button primary"
                  onClick={() => {
                    onClose();
                    window.open(`/s3-manager?styleId=${selectedStyleId}`, '_blank');
                  }}
                >
                  ☁️ Open S3 Sync Manager
                </button>
                <button className="modal-button" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
