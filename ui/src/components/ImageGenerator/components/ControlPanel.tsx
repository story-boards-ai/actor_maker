import { ImageSelectorModal } from '../../ImageSelectorModal';
import { StyleSelectorModal } from '../../StyleSelectorModal';
import { PromptPreview } from './PromptPreview';
import { GenerationLogs } from './GenerationLogs';
import type { Style } from '../../../types';

interface InputImage {
  filename: string;
  path: string;
  hasPrompt: boolean;
}

interface ControlPanelProps {
  inputImages: InputImage[];
  styles: Style[];
  selectedImage: string;
  selectedStyle: string;
  prompt: string;
  loading: boolean;
  loadingPrompt: boolean;
  fullPrompt: string;
  promptBreakdown: any;
  showPromptPreview: boolean;
  logs: string[];
  onSelectImage: (image: string) => void;
  onSelectStyle: (style: string) => void;
  onPromptChange: (prompt: string) => void;
  onTogglePromptPreview: () => void;
  onCopyPrompt: () => void;
  onOpenSettings: () => void;
  onClearLogs: () => void;
}

export function ControlPanel({
  inputImages,
  styles,
  selectedImage,
  selectedStyle,
  prompt,
  loading,
  loadingPrompt,
  fullPrompt,
  promptBreakdown,
  showPromptPreview,
  logs,
  onSelectImage,
  onSelectStyle,
  onPromptChange,
  onTogglePromptPreview,
  onCopyPrompt,
  onOpenSettings,
  onClearLogs,
}: ControlPanelProps) {
  return (
    <div className="generator-sidebar">
      <div className="control-group">
        <label>Source Image</label>
        <ImageSelectorModal
          images={inputImages}
          selectedImage={selectedImage}
          onSelect={onSelectImage}
        />
      </div>

      <div className="control-group">
        <label>Style</label>
        <StyleSelectorModal
          styles={styles}
          selectedStyle={selectedStyle}
          onSelect={onSelectStyle}
        />
      </div>

      <div className="control-group">
        <label htmlFor="prompt-input">
          Prompt
          <span className="hint">
            {loadingPrompt ? 'Loading...' : 
             prompt ? 'Editable' : 
             'Select image'}
          </span>
        </label>
        <textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Select an image to load its prompt..."
          rows={3}
          disabled={loading || loadingPrompt}
        />
      </div>

      <PromptPreview
        fullPrompt={fullPrompt}
        promptBreakdown={promptBreakdown}
        showPromptPreview={showPromptPreview}
        selectedStyle={selectedStyle}
        styles={styles}
        onToggle={onTogglePromptPreview}
        onCopy={onCopyPrompt}
      />

      <div className="control-group">
        <button
          className="settings-button"
          onClick={onOpenSettings}
          type="button"
        >
          ⚙️ Expert Settings
        </button>
      </div>

      <GenerationLogs logs={logs} onClear={onClearLogs} />
    </div>
  );
}
