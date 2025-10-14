import { useState, useEffect } from "react";
import type { TestSuiteResult } from "../types/test-suite";

interface TestResultsBrowserProps {
  show: boolean;
  onClose: () => void;
  onLoadResult: (result: TestSuiteResult) => void;
  selectedStyle: string | null;
}

interface TestResultSummary {
  id: string;
  suiteName: string;
  styleName: string;
  modelName: string;
  timestamp: string;
  imageCount: number;
}

export function TestResultsBrowser({
  show,
  onClose,
  onLoadResult,
  selectedStyle,
}: TestResultsBrowserProps) {
  const [results, setResults] = useState<TestResultSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (show && selectedStyle) {
      loadTestResults();
    }
  }, [show, selectedStyle]);

  const loadTestResults = async () => {
    if (!selectedStyle) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/list-test-results/${selectedStyle}`);
      const data = await response.json();
      
      setResults(data.results.map((r: any) => ({
        id: r.id,
        suiteName: r.suiteName,
        styleName: r.styleName,
        modelName: r.modelName,
        timestamp: r.timestamp,
        imageCount: r.images?.length || 0,
      })));
    } catch (error) {
      console.error('Error loading test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadResult = async (resultSummary: TestResultSummary) => {
    if (!selectedStyle) return;

    setLoadingId(resultSummary.id);
    try {
      const response = await fetch(
        `/api/load-test-result?styleId=${selectedStyle}&resultId=${resultSummary.id}`
      );
      const result = await response.json();
      
      onLoadResult(result);
      onClose();
    } catch (error) {
      console.error('Error loading test result:', error);
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="test-browser-modal" onClick={(e) => e.stopPropagation()}>
        <div className="test-browser-header">
          <h2>📂 Previous Test Results</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="test-browser-content">
          {loading ? (
            <div className="test-browser-loading">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="test-browser-empty">
              <p>No previous test results found for this style.</p>
              <p className="test-browser-hint">
                Run a test suite to create your first result!
              </p>
            </div>
          ) : (
            <div className="test-results-list">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="test-result-card"
                  onClick={() => handleLoadResult(result)}
                >
                  <div className="test-result-card-header">
                    <h3>{result.suiteName}</h3>
                    <span className="test-result-badge">{result.imageCount} images</span>
                  </div>
                  <div className="test-result-card-details">
                    <div className="test-result-detail">
                      <span className="detail-icon">🎨</span>
                      <span>{result.styleName}</span>
                    </div>
                    <div className="test-result-detail">
                      <span className="detail-icon">🤖</span>
                      <span>{result.modelName}</span>
                    </div>
                    <div className="test-result-detail">
                      <span className="detail-icon">📅</span>
                      <span>{formatDate(result.timestamp)}</span>
                    </div>
                  </div>
                  {loadingId === result.id && (
                    <div className="test-result-loading-overlay">
                      <div className="spinner"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
