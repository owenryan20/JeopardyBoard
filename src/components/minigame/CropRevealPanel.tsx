import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board, Clue, CropRevealRuntimeState, Team } from '../../types/board';
import { isCropRevealConfig } from '../../types/board';
import { formatPeso } from '../../lib/currency';
import {
  applyCorrectGuess,
  applyManualExpand,
  applyWrongGuess,
  createCropRevealRuntimeState,
  isCropRevealAnswerCorrect,
} from '../../lib/cropReveal';
import { confirmDialog } from '../../lib/dialog';
import { normalizeAttachment } from '../../lib/attachments';
import { CropRevealViewport } from './CropRevealViewport';
import { TeamScoreQuickActions } from '../game/TeamScoreQuickActions';
import './CropRevealPanel.css';

interface CropRevealPanelProps {
  board: Board;
  categoryName: string;
  clue: Clue;
  mode: 'preview' | 'game';
  progress?: CropRevealRuntimeState;
  onProgressChange?: (progress: CropRevealRuntimeState) => void;
  teams?: Team[];
  onTeamScore?: (teamId: string, delta: number) => void;
  teamScoreSelections?: Record<string, 'add' | 'subtract'>;
  onBackToBoard?: () => void;
  onMarkUsed?: () => void;
}

export function CropRevealPanel({
  categoryName,
  clue,
  mode,
  progress: externalProgress,
  onProgressChange,
  teams,
  onTeamScore,
  teamScoreSelections = {},
  onBackToBoard,
  onMarkUsed,
}: CropRevealPanelProps) {
  const config = clue.miniGame;
  const [localProgress, setLocalProgress] = useState<CropRevealRuntimeState | null>(null);
  const [guess, setGuess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const initState = useCallback(() => {
    if (!config || !isCropRevealConfig(config)) return null;
    return createCropRevealRuntimeState(clue.id, config);
  }, [clue.id, config]);

  useEffect(() => {
    if (mode === 'preview') setLocalProgress(initState());
  }, [mode, initState]);

  const progress =
    mode === 'preview'
      ? localProgress
      : externalProgress ?? initState();

  const setProgress = useCallback(
    (updater: CropRevealRuntimeState | ((p: CropRevealRuntimeState) => CropRevealRuntimeState)) => {
      if (!progress) return;
      const next = typeof updater === 'function' ? updater(progress) : updater;
      if (mode === 'preview') setLocalProgress(next);
      else onProgressChange?.(next);
    },
    [mode, onProgressChange, progress],
  );

  if (!config || !isCropRevealConfig(config)) {
    return (
      <div className="cr-panel cr-panel-error">
        <p>Crop Reveal is not configured.</p>
        {onBackToBoard && (
          <button type="button" className="btn" onClick={onBackToBoard}>Back to Board</button>
        )}
      </div>
    );
  }

  const image = normalizeAttachment(config.image);
  const missingImage = !image || (!image.mediaId && !image.url?.trim());

  if (missingImage) {
    return (
      <div className="cr-panel cr-panel-error">
        <p><strong>Missing image.</strong> Choose an image in the editor to play Crop Reveal.</p>
        {onBackToBoard && (
          <button type="button" className="btn" onClick={onBackToBoard}>Back to Board</button>
        )}
      </div>
    );
  }

  if (!progress) return null;

  const finished = progress.status === 'correct' || progress.status === 'failed' || progress.status === 'revealed';
  const awaitingMaxAttemptsChoice = progress.status === 'maxAttemptsReached';
  const revealPercent =
    progress.status === 'correct' && config.showFullImageOnComplete
      ? 100
      : progress.currentRevealPercent;

  const submitGuess = () => {
    if (finished || awaitingMaxAttemptsChoice || !guess.trim()) return;
    const text = guess.trim();
    if (isCropRevealAnswerCorrect(text, config)) {
      setProgress(applyCorrectGuess(progress, config, text));
    } else {
      setProgress(applyWrongGuess(progress, config, text));
    }
    setGuess('');
  };

  const handleExpand = () => {
    if (finished) return;
    setProgress(applyManualExpand(progress, config));
  };

  const handleMarkCorrect = async () => {
    const ok = await confirmDialog({
      title: 'Mark as correct?',
      description: 'Mark this Crop Reveal as answered correctly?',
      confirmLabel: 'Mark correct',
    });
    if (!ok) return;
    setProgress({
      ...progress,
      status: 'correct',
      currentRevealPercent: config.showFullImageOnComplete ? 100 : progress.currentRevealPercent,
      completedAt: new Date().toISOString(),
    });
  };

  const handleMarkIncorrect = () => {
    setProgress(applyWrongGuess(progress, config, '(marked incorrect)'));
  };

  const handleRevealAnswer = async () => {
    const ok = await confirmDialog({
      title: 'Reveal answer?',
      description: 'This will end the Crop Reveal and show the correct answer.',
      confirmLabel: 'Reveal answer',
      variant: 'destructive',
      closeOnBackdrop: false,
    });
    if (!ok) return;
    setProgress({
      ...progress,
      status: 'revealed',
      currentRevealPercent: 100,
      completedAt: new Date().toISOString(),
    });
  };

  const handleMaxAttemptsReveal = () => {
    setProgress({
      ...progress,
      status: 'failed',
      completedAt: new Date().toISOString(),
    });
  };

  const handleMaxAttemptsContinue = () => {
    setProgress({
      ...progress,
      status: 'playing',
      maxAttemptsWaived: true,
    });
    setGuess('');
    inputRef.current?.focus();
  };

  const handleReset = async () => {
    const ok = await confirmDialog({
      title: 'Reset Crop Reveal?',
      description: 'Clear all guesses and start over for this tile.',
      confirmLabel: 'Reset',
      variant: 'destructive',
      closeOnBackdrop: false,
    });
    if (!ok) return;
    setProgress(createCropRevealRuntimeState(clue.id, config));
    setGuess('');
    inputRef.current?.focus();
  };

  return (
    <div className={`cr-panel${mode === 'game' ? ' cr-panel-game' : ''}`}>
      <div className="cr-header">
        <p className="cr-category">{categoryName}</p>
        <div className="cr-header-meta">
          <span className="game-value">{formatPeso(config.pointValue)}</span>
          <span className="badge badge-minigame">Crop Reveal</span>
        </div>
        <h2 className="cr-title">{config.title}</h2>
        <p className="cr-subtitle">
          Reveal level {Math.round(revealPercent)}% · {progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}
        </p>
      </div>

      <CropRevealViewport
        attachment={image}
        revealPercent={revealPercent}
        anchor={config.anchor}
        customAnchorX={config.customAnchorX}
        customAnchorY={config.customAnchorY}
        className="cr-viewport-panel"
        transition
      />

      {!finished && !awaitingMaxAttemptsChoice && (
        <div className="cr-guess-row">
          <label className="sr-only" htmlFor="cr-guess">Your guess</label>
          <input
            ref={inputRef}
            id="cr-guess"
            className="input cr-guess-input"
            value={guess}
            placeholder="Type your guess…"
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitGuess();
              }
              if (e.key === 'Escape') {
                setGuess('');
                inputRef.current?.blur();
              }
            }}
          />
          <button type="button" className="btn btn-primary" onClick={submitGuess} disabled={!guess.trim()}>
            Submit guess
          </button>
        </div>
      )}

      {(progress.status === 'correct' || progress.status === 'revealed') && (
        <div className="cr-result cr-result-success" role="status">
          <p>
            {progress.status === 'correct'
              ? `Correct in ${progress.attempts} attempt${progress.attempts !== 1 ? 's' : ''}!`
              : 'Answer revealed.'}
          </p>
          <p className="cr-answer"><strong>Answer:</strong> {config.correctAnswer}</p>
        </div>
      )}

      {awaitingMaxAttemptsChoice && (
        <div className="cr-result cr-result-failed" role="status">
          <p>Max attempts reached.</p>
          <p className="cr-max-attempts-prompt">Reveal the answer or allow more guesses?</p>
          <div className="cr-max-attempts-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleMaxAttemptsReveal}>
              Reveal answer
            </button>
            <button type="button" className="btn btn-sm" onClick={handleMaxAttemptsContinue}>
              Continue
            </button>
          </div>
        </div>
      )}

      {progress.status === 'failed' && (
        <div className="cr-result cr-result-failed" role="status">
          <p>Max attempts reached.</p>
          <p className="cr-answer"><strong>Answer:</strong> {config.correctAnswer}</p>
        </div>
      )}

      <div className="cr-host-controls">
        <p className="cr-host-label">Host controls</p>
        <div className="cr-host-buttons">
          <button type="button" className="btn btn-sm" onClick={handleExpand} disabled={finished || revealPercent >= 100}>
            Expand image
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void handleMarkCorrect()} disabled={finished}>
            Mark correct
          </button>
          <button type="button" className="btn btn-sm" onClick={handleMarkIncorrect} disabled={finished}>
            Mark incorrect
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void handleRevealAnswer()} disabled={finished}>
            Reveal answer
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => void handleReset()}>
            Reset this mini game
          </button>
        </div>
      </div>

      {mode === 'game' && finished && teams && onTeamScore && (
        <TeamScoreQuickActions
          teams={teams}
          value={clue.value ?? config.pointValue}
          selections={teamScoreSelections}
          onScore={onTeamScore}
        />
      )}

      <div className="cr-footer">
        {mode === 'game' && finished && onMarkUsed && (
          <button type="button" className="btn btn-primary" onClick={onMarkUsed}>
            Mark as Used
          </button>
        )}
        {onBackToBoard && (
          <button type="button" className="btn" onClick={onBackToBoard}>
            Back to Board
          </button>
        )}
      </div>
    </div>
  );
}
