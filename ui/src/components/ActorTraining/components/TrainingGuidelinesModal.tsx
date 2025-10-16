interface TrainingGuidelinesModalProps {
  show: boolean;
  onClose: () => void;
}

export function TrainingGuidelinesModal({ show, onClose }: TrainingGuidelinesModalProps) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Training Guidelines</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="guideline-section">
            <h4>📊 Dataset Size Recommendations</h4>
            <table className="guidelines-table">
              <thead>
                <tr>
                  <th>Images</th>
                  <th>Steps</th>
                  <th>Learning Rate</th>
                  <th>Use Case</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>8-15</td>
                  <td>500-1000</td>
                  <td>0.0001</td>
                  <td>Very high quality, on-style</td>
                </tr>
                <tr className="recommended">
                  <td>20-30</td>
                  <td>800-1200</td>
                  <td>0.0001-0.0004</td>
                  <td>⭐ Sweet spot</td>
                </tr>
                <tr>
                  <td>50-200</td>
                  <td>2000-8000</td>
                  <td>0.0001</td>
                  <td>Large dataset (risk averaging)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="guideline-section">
            <h4>⚙️ How Settings Change with Image Count</h4>
            <ul className="guidelines-list">
              <li>
                <strong>Training Steps:</strong> Use ~40 steps per image
                <br />
                <span className="example">Example: 30 images = 1200 steps</span>
              </li>
              <li>
                <strong>Learning Rate:</strong> Keep at 0.0001 (safe) or 0.0004 (faster convergence)
                <br />
                <span className="example">Don't increase LR with more images</span>
              </li>
              <li>
                <strong>Network Dim:</strong> Use 16 for simple styles, 32 for complex styles
                <br />
                <span className="example">More images don't require higher dim</span>
              </li>
              <li>
                <strong>Batch Size:</strong> Keep at 2 (VRAM-safe)
                <br />
                <span className="example">Can increase to 4 if you have 48GB+ VRAM</span>
              </li>
            </ul>
          </div>

          <div className="guideline-section">
            <h4>💡 Quick Tips</h4>
            <ul className="guidelines-list">
              <li>
                <strong>Trigger Token:</strong> Use a unique identifier (e.g., "style_59")
              </li>
              <li>
                <strong>Caption Files:</strong> Each image needs a .txt file with scene description + trigger token
              </li>
              <li>
                <strong>Scheduler:</strong> cosine_with_restarts is recommended for most cases
              </li>
              <li>
                <strong>Save Checkpoints:</strong> Every 250 steps to compare results
              </li>
              <li>
                <strong>Test First:</strong> Start with 15-20 images before full dataset
              </li>
            </ul>
          </div>

          <div className="guideline-section warning">
            <h4>⚠️ Common Mistakes</h4>
            <ul className="guidelines-list">
              <li>Too many steps on small datasets → loses prompt-following</li>
              <li>Learning rate too high → unstable training</li>
              <li>Missing caption files → training will fail</li>
              <li>Inconsistent style in images → model learns average</li>
            </ul>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-button" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
