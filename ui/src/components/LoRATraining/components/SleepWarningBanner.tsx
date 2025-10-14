import { useEffect, useState } from 'react';
import type { CurrentTraining } from '../types';

interface SleepWarningBannerProps {
  currentTraining: CurrentTraining | null;
  ngrokUrl: string;
}

export function SleepWarningBanner({ currentTraining, ngrokUrl }: SleepWarningBannerProps) {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Only show warning if training is active
    if (currentTraining && (currentTraining.status === 'training' || currentTraining.status === 'starting')) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [currentTraining]);

  if (!showWarning) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 87, 34, 0.15) 100%)',
      border: '1px solid var(--orange-7)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
      <div style={{ flex: 1, fontSize: '14px', lineHeight: '1.5' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--orange-11)' }}>
          Keep Computer Awake During Training
        </div>
        <div style={{ color: 'var(--gray-11)' }}>
          <strong>Training runs on RunPod</strong> (will complete even if computer sleeps), but:
        </div>
        <ul style={{ 
          margin: '8px 0 0 0', 
          paddingLeft: '20px', 
          color: 'var(--gray-11)',
          fontSize: '13px'
        }}>
          <li><strong>Ngrok tunnel will die</strong> if computer sleeps (webhook callback will fail)</li>
          <li><strong>You'll need to manually check status</strong> using the "Check Status" button</li>
          <li><strong>Training will still complete</strong> - just won't auto-update in UI</li>
        </ul>
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: 'var(--gray-12)'
        }}>
          💡 <strong>Recovery:</strong> Click "Check Status" button after waking up to recover training progress
        </div>
      </div>
    </div>
  );
}
