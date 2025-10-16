import { useEffect } from "react";
import { toast } from "sonner";
import type { Style, Actor } from "../../../types";
import "./SettingsModalRedesigned.css";

interface SettingsModalProps {
  show: boolean;
  selectedStyle: string;
  styles: (Style | Actor)[];
  seed: number;
  seedLocked: boolean;
  steps: number;
  cfg: number;
  denoise: number;
  guidance: number;
  width: number;
  height: number;
  samplerName: string;
  schedulerName: string;
  loraStrengthModel: number;
  loraStrengthClip: number;
  monochromeContrast: number;
  monochromeBrightness: number;
  frontpad: string;
  backpad: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  loading: boolean;
  onOpen?: () => void;
  onClose: () => void;
  onSave: () => void;
  onSaveToRegistry?: () => void;
  onReset: () => void;
  onResetLoraToDefault: () => void;
  onRandomizeSeed: () => void;
  setSeed: (val: number) => void;
  setSeedLocked: (val: boolean) => void;
  setSteps: (val: number) => void;
  setCfg: (val: number) => void;
  setDenoise: (val: number) => void;
  setGuidance: (val: number) => void;
  setWidth: (val: number) => void;
  setHeight: (val: number) => void;
  setSamplerName: (val: string) => void;
  setSchedulerName: (val: string) => void;
  setLoraStrengthModel: (val: number) => void;
  setLoraStrengthClip: (val: number) => void;
  setMonochromeContrast: (val: number) => void;
  setMonochromeBrightness: (val: number) => void;
  setFrontpad: (val: string) => void;
  setBackpad: (val: string) => void;
  setRandomizeSeedPerImage?: (val: boolean) => void;
}

// Helper functions for inverse exponential denoise slider
function sliderToDenoise(sliderValue: number): number {
  const normalized = sliderValue / 1000;
  const denoise = 1 - Math.pow(1 - normalized, 3);
  return Math.max(0, Math.min(1, denoise));
}

function denoiseToSlider(denoise: number): number {
  const slider = 1000 * (1 - Math.pow(1 - denoise, 1 / 3));
  return Math.round(Math.max(0, Math.min(1000, slider)));
}

export function SettingsModalRedesigned(props: SettingsModalProps) {
  const {
    show,
    selectedStyle,
    styles,
    seed,
    seedLocked,
    steps,
    cfg,
    denoise,
    guidance,
    width,
    height,
    samplerName,
    schedulerName,
    loraStrengthModel,
    loraStrengthClip,
    monochromeContrast,
    monochromeBrightness,
    frontpad,
    backpad,
    saveStatus,
    loading,
    onOpen,
    onClose,
    onSave,
    onSaveToRegistry,
    onReset,
    onResetLoraToDefault,
    onRandomizeSeed,
    setSeed,
    setSeedLocked,
    setSteps,
    setCfg,
    setDenoise,
    setGuidance,
    setWidth,
    setHeight,
    setSamplerName,
    setSchedulerName,
    setLoraStrengthModel,
    setLoraStrengthClip,
    setMonochromeContrast,
    setMonochromeBrightness,
    setFrontpad,
    setBackpad,
  } = props;

  useEffect(() => {
    if (show) {
      onOpen?.();
    }
  }, [show]);

  if (!show) return null;

  const selectedItem =
    selectedStyle &&
    styles.find((s) => {
      // Handle both Style (string id) and Actor (number id)
      return String(s.id) === String(selectedStyle);
    });
  const isMonochrome =
    selectedItem && "monochrome" in selectedItem
      ? selectedItem.monochrome
      : false;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div
        className="settings-modal-redesigned"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="settings-modal-header">
          <h2>Expert Settings</h2>
          <button
            className="settings-modal-close"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className="settings-modal-body">
          {/* SECTION 1: GENERATION PARAMETERS */}
          <section className="settings-section">
            <h3 className="section-heading">Generation Parameters</h3>

            <div className="settings-row">
              <div className="setting-control full-width">
                <div className="control-header">
                  <label className="control-label">Seed</label>
                  <button
                    className={`toggle-button ${seedLocked ? "active" : ""}`}
                    onClick={() => setSeedLocked(!seedLocked)}
                    type="button"
                  >
                    {seedLocked ? "🔒 Locked" : "🔓 Random"}
                  </button>
                </div>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value))}
                  disabled={loading || !seedLocked}
                  className="number-input"
                />
                <p className="control-hint">
                  {seedLocked
                    ? "Fixed seed produces consistent results"
                    : "Random seed generates different results each time"}
                </p>
              </div>
            </div>

            <div className="settings-row">
              <div className="setting-control">
                <label className="control-label">Steps</label>
                <div className="slider-value">{steps}</div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value))}
                  disabled={loading}
                  className="range-input"
                />
                <div className="range-labels">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>

              <div className="setting-control">
                <label className="control-label">CFG Scale</label>
                <div className="slider-value">{cfg}</div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={cfg}
                  onChange={(e) => setCfg(parseFloat(e.target.value))}
                  disabled={loading}
                  className="range-input"
                />
                <div className="range-labels">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>
            </div>

            <div className="settings-row">
              <div className="setting-control">
                <label className="control-label">Guidance</label>
                <div className="slider-value">{guidance}</div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={guidance}
                  onChange={(e) => setGuidance(parseFloat(e.target.value))}
                  disabled={loading}
                  className="range-input"
                />
                <div className="range-labels">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>

              <div className="setting-control">
                <label className="control-label">Denoise</label>
                <div className="slider-value">{denoise.toFixed(4)}</div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="1"
                  value={denoiseToSlider(denoise)}
                  onChange={(e) => {
                    const sliderValue = parseInt(e.target.value);
                    const denoiseValue = sliderToDenoise(sliderValue);
                    setDenoise(denoiseValue);
                  }}
                  disabled={loading}
                  className="range-input"
                />
                <p className="control-hint">Fine-grained control near 1.0</p>
              </div>
            </div>
          </section>

          {/* SECTION 2: IMAGE DIMENSIONS */}
          <section className="settings-section">
            <h3 className="section-heading">Image Dimensions</h3>

            <div className="settings-row">
              <div className="setting-control">
                <label className="control-label">Width</label>
                <div className="slider-value">{width}px</div>
                <input
                  type="range"
                  min="512"
                  max="2048"
                  step="64"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  disabled={loading}
                  className="range-input"
                />
                <div className="range-labels">
                  <span>512</span>
                  <span>2048</span>
                </div>
              </div>

              <div className="setting-control">
                <label className="control-label">Height</label>
                <div className="slider-value">{height}px</div>
                <input
                  type="range"
                  min="512"
                  max="2048"
                  step="64"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  disabled={loading}
                  className="range-input"
                />
                <div className="range-labels">
                  <span>512</span>
                  <span>2048</span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: SAMPLING */}
          <section className="settings-section">
            <h3 className="section-heading">Sampling Configuration</h3>

            <div className="settings-row">
              <div className="setting-control">
                <label className="control-label">Sampler</label>
                <select
                  value={samplerName}
                  onChange={(e) => setSamplerName(e.target.value)}
                  disabled={loading}
                  className="select-input"
                >
                  <option value="euler">Euler</option>
                  <option value="euler_ancestral">Euler Ancestral</option>
                  <option value="heun">Heun</option>
                  <option value="dpm_2">DPM 2</option>
                  <option value="dpm_2_ancestral">DPM 2 Ancestral</option>
                  <option value="lms">LMS</option>
                  <option value="dpm_fast">DPM Fast</option>
                  <option value="dpm_adaptive">DPM Adaptive</option>
                  <option value="dpmpp_2s_ancestral">DPM++ 2S Ancestral</option>
                  <option value="dpmpp_sde">DPM++ SDE</option>
                  <option value="dpmpp_2m">DPM++ 2M</option>
                </select>
              </div>

              <div className="setting-control">
                <label className="control-label">Scheduler</label>
                <select
                  value={schedulerName}
                  onChange={(e) => setSchedulerName(e.target.value)}
                  disabled={loading}
                  className="select-input"
                >
                  <option value="normal">Normal</option>
                  <option value="karras">Karras</option>
                  <option value="exponential">Exponential</option>
                  <option value="sgm_uniform">SGM Uniform</option>
                  <option value="simple">Simple</option>
                  <option value="ddim_uniform">DDIM Uniform</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECTION 4: LORA STRENGTH (conditional) */}
          {selectedStyle && (
            <section className="settings-section">
              <div className="section-heading-with-action">
                <h3 className="section-heading">LoRA Strength</h3>
                <button
                  className="action-button"
                  onClick={onResetLoraToDefault}
                  type="button"
                  title="Reset to style default"
                >
                  ↺ Reset to Default
                </button>
              </div>

              <div className="settings-row">
                <div className="setting-control">
                  <label className="control-label">Model Strength</label>
                  <div className="slider-value">
                    {loraStrengthModel.toFixed(2)}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={loraStrengthModel}
                    onChange={(e) =>
                      setLoraStrengthModel(parseFloat(e.target.value))
                    }
                    disabled={loading}
                    className="range-input"
                  />
                  <div className="range-labels">
                    <span>0</span>
                    <span>2</span>
                  </div>
                </div>

                <div className="setting-control">
                  <label className="control-label">CLIP Strength</label>
                  <div className="slider-value">
                    {loraStrengthClip.toFixed(2)}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={loraStrengthClip}
                    onChange={(e) =>
                      setLoraStrengthClip(parseFloat(e.target.value))
                    }
                    disabled={loading}
                    className="range-input"
                  />
                  <div className="range-labels">
                    <span>0</span>
                    <span>2</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 5: MONOCHROME PROCESSING (conditional) */}
          {isMonochrome && (
            <section className="settings-section">
              <h3 className="section-heading">Monochrome Processing</h3>

              <div className="settings-row">
                <div className="setting-control">
                  <label className="control-label">Contrast</label>
                  <div className="slider-value">
                    {monochromeContrast.toFixed(2)}x
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.05"
                    value={monochromeContrast}
                    onChange={(e) =>
                      setMonochromeContrast(parseFloat(e.target.value))
                    }
                    disabled={loading}
                    className="range-input"
                  />
                  <div className="range-labels">
                    <span>0.5</span>
                    <span>2</span>
                  </div>
                </div>

                <div className="setting-control">
                  <label className="control-label">Brightness</label>
                  <div className="slider-value">
                    {monochromeBrightness.toFixed(2)}x
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={monochromeBrightness}
                    onChange={(e) =>
                      setMonochromeBrightness(parseFloat(e.target.value))
                    }
                    disabled={loading}
                    className="range-input"
                  />
                  <div className="range-labels">
                    <span>0.5</span>
                    <span>1.5</span>
                  </div>
                  <p className="control-hint">
                    Adjust overall brightness of B&W conversion
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 6: STYLE PROMPTS (conditional) */}
          {selectedStyle && (
            <section className="settings-section">
              <h3 className="section-heading">Style Prompts</h3>

              <div className="setting-control full-width">
                <label className="control-label">Front Pad</label>
                <textarea
                  value={frontpad}
                  onChange={(e) => setFrontpad(e.target.value)}
                  disabled={loading}
                  rows={3}
                  placeholder="Text added before the main prompt..."
                  className="textarea-input"
                />
                <p className="control-hint">
                  Text prepended to the beginning of the prompt
                </p>
              </div>

              <div className="setting-control full-width">
                <label className="control-label">Back Pad</label>
                <textarea
                  value={backpad}
                  onChange={(e) => setBackpad(e.target.value)}
                  disabled={loading}
                  rows={3}
                  placeholder="Text added after the main prompt..."
                  className="textarea-input"
                />
                <p className="control-hint">
                  Text appended to the end of the prompt
                </p>
              </div>
            </section>
          )}
        </div>

        {/* FOOTER */}
        <div className="settings-modal-footer">
          <button
            className={`footer-button primary ${
              saveStatus !== "idle" ? `status-${saveStatus}` : ""
            }`}
            onClick={onSave}
            type="button"
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving"
              ? "⏳ Saving..."
              : saveStatus === "saved"
              ? "✅ Saved!"
              : saveStatus === "error"
              ? "❌ Error"
              : "💾 Save Settings"}
          </button>
          {onSaveToRegistry && selectedStyle && (
            <button
              className="footer-button secondary"
              onClick={async () => {
                try {
                  await onSaveToRegistry();
                  toast.success(
                    "Frontpad and Backpad saved to registry successfully!"
                  );
                } catch (error) {
                  toast.error(
                    "Failed to save to registry. Check console for details."
                  );
                  console.error("Registry save error:", error);
                }
              }}
              type="button"
              title="Save Front Pad and Back Pad prompts to the styles registry file"
            >
              📝 Save Prompts to Registry
            </button>
          )}
          <button
            className="footer-button warning"
            onClick={onReset}
            type="button"
          >
            ↺ Reset to Defaults
          </button>
          <button
            className="footer-button neutral"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
