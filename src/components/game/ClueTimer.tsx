import { useCallback, useEffect, useRef, useState } from 'react';
import { formatTimerDisplay } from '../../lib/clueTimer';
import './ClueTimer.css';

interface ClueTimerProps {
  clueId: string;
  durationSeconds: number;
}

export function ClueTimer({ clueId, durationSeconds }: ClueTimerProps) {
  const totalMs = durationSeconds * 1000;
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const [running, setRunning] = useState(true);
  const deadlineRef = useRef<number | null>(Date.now() + totalMs);
  const remainingRef = useRef(totalMs);

  const syncRemaining = useCallback(() => {
    const deadline = deadlineRef.current;
    const next = deadline === null ? remainingRef.current : Math.max(0, deadline - Date.now());
    remainingRef.current = next;
    setRemainingMs(next);
    return next;
  }, []);

  useEffect(() => {
    remainingRef.current = totalMs;
    setRemainingMs(totalMs);
    setRunning(true);
    deadlineRef.current = Date.now() + totalMs;
  }, [clueId, totalMs]);

  useEffect(() => {
    if (!running) return;

    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + remainingRef.current;
    }

    const id = window.setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const left = Math.max(0, deadline - Date.now());
      remainingRef.current = left;
      setRemainingMs(left);
      if (left <= 0) {
        setRunning(false);
        deadlineRef.current = null;
      }
    }, 100);

    return () => window.clearInterval(id);
  }, [running, clueId]);

  const pause = () => {
    if (!running) return;
    syncRemaining();
    setRunning(false);
    deadlineRef.current = null;
  };

  const resume = () => {
    if (running || remainingRef.current <= 0) return;
    setRunning(true);
  };

  const reset = () => {
    remainingRef.current = totalMs;
    setRemainingMs(totalMs);
    setRunning(true);
    deadlineRef.current = Date.now() + totalMs;
  };

  const expired = remainingMs <= 0;

  return (
    <div
      className={`clue-timer${expired ? ' clue-timer-expired' : ''}${!running && !expired ? ' clue-timer-paused' : ''}`}
      role="timer"
      aria-live="polite"
    >
      <div className="clue-timer-display-wrap">
        <span className="clue-timer-label">{expired ? "Time's up" : running ? 'Time left' : 'Paused'}</span>
        <span className="clue-timer-display">{formatTimerDisplay(remainingMs)}</span>
      </div>
      <div className="clue-timer-actions">
        {!expired && (
          <button type="button" className="btn btn-sm" onClick={running ? pause : resume}>
            {running ? 'Pause' : 'Resume'}
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
