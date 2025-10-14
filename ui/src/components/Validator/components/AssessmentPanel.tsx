import type { AssessmentRating } from '../types/settings-set';

interface AssessmentPanelProps {
  rating: AssessmentRating;
  comment: string;
  onRatingChange: (rating: AssessmentRating) => void;
  onCommentChange: (comment: string) => void;
  onCommentBlur?: () => void;
  disabled?: boolean;
}

const RATING_OPTIONS: Array<{ value: AssessmentRating; label: string; emoji: string; color: string }> = [
  { value: 'excellent', label: 'Excellent', emoji: '⭐', color: '#10b981' },
  { value: 'good', label: 'Good', emoji: '✅', color: '#3b82f6' },
  { value: 'acceptable', label: 'Acceptable', emoji: '👍', color: '#8b5cf6' },
  { value: 'poor', label: 'Poor', emoji: '⚠️', color: '#f59e0b' },
  { value: 'failed', label: 'Failed', emoji: '❌', color: '#ef4444' },
];

export function AssessmentPanel(props: AssessmentPanelProps) {
  const { rating, comment, onRatingChange, onCommentChange, onCommentBlur, disabled = false } = props;

  return (
    <div className="control-section assessment-panel">
      <label className="control-label">
        📊 Assessment
      </label>
      
      <div className="assessment-rating-buttons">
        {RATING_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onRatingChange(option.value)}
            disabled={disabled}
            className={`assessment-rating-button ${rating === option.value ? 'active' : ''}`}
            style={{
              borderColor: rating === option.value ? option.color : 'rgba(255, 255, 255, 0.2)',
              backgroundColor: rating === option.value ? `${option.color}22` : 'transparent',
            }}
            title={option.label}
          >
            <span className="rating-emoji">{option.emoji}</span>
            <span className="rating-label">{option.label}</span>
          </button>
        ))}
        
        <button
          onClick={() => onRatingChange(null)}
          disabled={disabled}
          className={`assessment-rating-button clear ${!rating ? 'active' : ''}`}
          title="Clear rating"
        >
          <span className="rating-emoji">🔄</span>
          <span className="rating-label">Clear</span>
        </button>
      </div>

      <div className="assessment-comment">
        <label htmlFor="assessment-comment" className="assessment-comment-label">
          💬 Notes & Comments
        </label>
        <textarea
          id="assessment-comment"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          onBlur={onCommentBlur}
          disabled={disabled}
          placeholder="Add notes about this configuration, what worked well, what needs improvement..."
          className="assessment-comment-textarea"
          rows={3}
        />
      </div>

      <style>{`
        .assessment-panel {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-top: 8px;
        }

        .assessment-rating-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .assessment-rating-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          background: transparent;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
        }

        .assessment-rating-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .assessment-rating-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .assessment-rating-button.active {
          font-weight: 600;
        }

        .assessment-rating-button.clear {
          border-color: rgba(156, 163, 175, 0.3);
        }

        .assessment-rating-button.clear.active {
          background: rgba(156, 163, 175, 0.2);
          border-color: rgba(156, 163, 175, 0.5);
        }

        .rating-emoji {
          font-size: 16px;
        }

        .rating-label {
          font-size: 12px;
        }

        .assessment-comment {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .assessment-comment-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .assessment-comment-textarea {
          width: 100%;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: white;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .assessment-comment-textarea:focus {
          outline: none;
          border-color: rgba(59, 130, 246, 0.5);
        }

        .assessment-comment-textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .assessment-comment-textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
