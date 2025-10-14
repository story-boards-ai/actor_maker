import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  startTime: number;
  estimatedDuration: number;
}

export function CountdownTimer({ startTime, estimatedDuration }: CountdownTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  const remaining = Math.max(0, estimatedDuration - elapsed);
  const elapsedMinutes = Math.floor(elapsed / 60000);
  const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
  const remainingMinutes = Math.floor(remaining / 60000);
  const remainingSeconds = Math.floor((remaining % 60000) / 1000);
  const progress = Math.min(100, (elapsed / estimatedDuration) * 100);
  
  return (
    <div className="timer-container">
      <div className="timer-bar">
        <div className="timer-progress" style={{ width: `${progress}%` }} />
      </div>
      <div className="timer-info">
        <span className="timer-elapsed">
          Elapsed: {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, '0')}
        </span>
        <span className="timer-remaining">
          {remaining > 0 ? `~${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} remaining` : 'Completing...'}
        </span>
      </div>
    </div>
  );
}
