import type { TrainingParameters } from '../types';

interface ParametersFormProps {
  parameters: TrainingParameters;
  onUpdate: (params: TrainingParameters) => void;
  recommendedSteps: number;
  loading: boolean;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onShowInfo: () => void;
}

export function ParametersForm({
  parameters,
  onUpdate,
  recommendedSteps,
  loading,
  showAdvanced,
  onToggleAdvanced,
  onShowInfo
}: ParametersFormProps) {
  return (
    <>
      {/* Core Parameters */}
      <div className="config-section">
        <div className="section-header">
          <h4>Core Parameters</h4>
          <button 
            className="info-button"
            onClick={onShowInfo}
            title="Training guidelines"
          >
            ℹ️
          </button>
        </div>
        
        <div className="param-row">
          <label>Network Dimension</label>
          <input
            type="number"
            value={parameters.network_dim}
            onChange={(e) => onUpdate({...parameters, network_dim: Number(e.target.value)})}
            min={8}
            max={128}
            disabled={loading}
          />
          <span className="param-hint">16 or 32 recommended</span>
        </div>

        <div className="param-row">
          <label>Network Alpha</label>
          <input
            type="number"
            value={parameters.network_alpha}
            onChange={(e) => onUpdate({...parameters, network_alpha: Number(e.target.value)})}
            min={8}
            max={128}
            disabled={loading}
          />
          <span className="param-hint">Usually same as dim</span>
        </div>

        <div className="param-row">
          <label>Learning Rate</label>
          <input
            type="number"
            step="0.00001"
            value={parameters.learning_rate}
            onChange={(e) => onUpdate({...parameters, learning_rate: Number(e.target.value)})}
            min={0.00001}
            max={0.001}
            disabled={loading}
          />
          <span className="param-hint">0.0001 safe, 0.0004 faster</span>
        </div>

        <div className="param-row">
          <label>Max Training Steps</label>
          <input
            type="number"
            value={parameters.max_train_steps}
            onChange={(e) => onUpdate({...parameters, max_train_steps: Number(e.target.value)})}
            min={100}
            max={5000}
            disabled={loading}
          />
          <span className="param-hint">Recommended: {recommendedSteps}</span>
        </div>

        <div className="param-row">
          <label>Trigger Token</label>
          <input
            type="text"
            value={parameters.class_tokens}
            onChange={(e) => onUpdate({...parameters, class_tokens: e.target.value})}
            placeholder="e.g., style SBai_style_16"
            disabled={loading}
          />
          <span className="param-hint">Auto-filled, editable (format: style SBai_style_XX)</span>
        </div>
      </div>

      {/* Advanced Parameters */}
      <div className="config-section">
        <h4 onClick={onToggleAdvanced} style={{cursor: 'pointer'}}>
          Advanced Parameters {showAdvanced ? '▼' : '▶'}
        </h4>
        
        {showAdvanced && (
          <>
            <div className="param-row">
              <label>LR Scheduler</label>
              <select
                value={parameters.lr_scheduler}
                onChange={(e) => onUpdate({...parameters, lr_scheduler: e.target.value as any})}
                disabled={loading}
              >
                <option value="cosine_with_restarts">Cosine with Restarts</option>
                <option value="cosine">Cosine</option>
                <option value="linear">Linear</option>
              </select>
            </div>

            <div className="param-row">
              <label>Optimizer</label>
              <select
                value={parameters.optimizer_type}
                onChange={(e) => onUpdate({...parameters, optimizer_type: e.target.value as any})}
                disabled={loading}
              >
                <option value="adamw8bit">AdamW 8-bit</option>
                <option value="adafactor">Adafactor</option>
              </select>
            </div>

            <div className="param-row">
              <label>Batch Size</label>
              <input
                type="number"
                value={parameters.batch_size}
                onChange={(e) => onUpdate({...parameters, batch_size: Number(e.target.value)})}
                min={1}
                max={8}
                disabled={loading}
              />
            </div>

            <div className="param-row">
              <label>Num Repeats</label>
              <input
                type="number"
                value={parameters.num_repeats}
                onChange={(e) => onUpdate({...parameters, num_repeats: Number(e.target.value)})}
                min={1}
                max={50}
                disabled={loading}
              />
            </div>

            <div className="param-row">
              <label>Gradient Dtype</label>
              <select
                value={parameters.gradient_dtype}
                onChange={(e) => onUpdate({...parameters, gradient_dtype: e.target.value as any})}
                disabled={loading}
              >
                <option value="bf16">BF16</option>
                <option value="fp16">FP16</option>
              </select>
            </div>
          </>
        )}
      </div>
    </>
  );
}
