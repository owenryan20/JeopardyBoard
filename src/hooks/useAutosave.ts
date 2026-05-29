import { useEffect, useRef, useState } from 'react';
import type { Board } from '../types/board';
import { upsertBoard } from '../lib/storage';

export function useAutosave(board: Board | null, onSaved?: () => void) {
  const [status, setStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardRef = useRef(board);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    if (!board) return;

    setStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const current = boardRef.current;
      if (!current) return;
      upsertBoard(current);
      setStatus('saved');
      setLastSaved(new Date());
      onSaved?.();
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [board, onSaved]);

  const label =
    status === 'saving'
      ? 'Saving…'
      : lastSaved
        ? `Saved ${formatRelative(lastSaved)}`
        : 'Saved';

  return { status, label, lastSaved };
}

function formatRelative(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return date.toLocaleTimeString();
}
