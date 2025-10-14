import { useState } from 'react';
import { toast } from 'sonner';

export function ExportToBackendButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsExporting(true);
    toast.info('Exporting validated settings...');

    try {
      const response = await fetch('/api/export/validated-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minRating: 'good' }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Export failed');
      }

      toast.success(`✅ Exported ${result.exportedCount} styles!`);
      
      // Copy to clipboard automatically
      if (result.validatedStyles && result.validatedStyles.length > 0) {
        const jsonData = JSON.stringify(result.validatedStyles, null, 2);
        await navigator.clipboard.writeText(jsonData);
        toast.success('📋 Copied to clipboard!');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isExporting}
        className="export-header-button"
        title="Export all validated settings to backend"
      >
        {isExporting ? (
          <>
            <span className="button-spinner">⏳</span>
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <span>📦</span>
            <span>Export to Backend</span>
          </>
        )}
      </button>

      {showConfirm && (
        <div className="export-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="export-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="export-modal-header">
              <h3>Export Validated Settings?</h3>
              <button className="export-modal-close" onClick={() => setShowConfirm(false)}>×</button>
            </div>
            
            <div className="export-modal-content">
              <p>This will export all validated style settings (Good+ rated) and copy them to your clipboard.</p>
            </div>

            <div className="export-modal-actions">
              <button onClick={() => setShowConfirm(false)} className="button-secondary">
                Cancel
              </button>
              <button onClick={handleConfirm} className="button-primary">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
