import type { Style } from '../../../types';

interface PromptPreviewProps {
  fullPrompt: string;
  promptBreakdown: {
    triggerWords: string;
    frontpad: string;
    prompt: string;
    backpad: string;
  } | null;
  showPromptPreview: boolean;
  selectedStyle: string;
  styles: Style[];
  onToggle: () => void;
  onCopy: () => void;
}

export function PromptPreview({
  fullPrompt,
  promptBreakdown,
  showPromptPreview,
  selectedStyle,
  styles,
  onToggle,
  onCopy
}: PromptPreviewProps) {
  if (!fullPrompt) return null;

  const isMonochrome = styles.find(s => s.id === selectedStyle)?.monochrome;

  return (
    <div className="control-group">
      <button
        className="prompt-preview-toggle"
        onClick={onToggle}
        type="button"
      >
        {showPromptPreview ? '▼' : '▶'} Prompt Preview
        {isMonochrome && <span style={{marginLeft: '0.5rem'}}>⚫</span>}
      </button>
      {showPromptPreview && (
        <div className="prompt-preview-content">
          <div className="prompt-stats">
            {fullPrompt.length} chars
            <button
              className="copy-prompt-mini"
              onClick={onCopy}
              title="Copy"
            >
              📋
            </button>
          </div>
          <div className="prompt-text">{fullPrompt}</div>
          {promptBreakdown && (
            <div className="prompt-parts">
              {promptBreakdown.triggerWords && <div><strong>Trigger:</strong> {promptBreakdown.triggerWords}</div>}
              {promptBreakdown.frontpad && <div><strong>Frontpad:</strong> {promptBreakdown.frontpad.substring(0, 50)}...</div>}
              {promptBreakdown.prompt && <div><strong>Caption:</strong> {promptBreakdown.prompt}</div>}
              {promptBreakdown.backpad && <div><strong>Backpad:</strong> {promptBreakdown.backpad.substring(0, 50)}...</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
