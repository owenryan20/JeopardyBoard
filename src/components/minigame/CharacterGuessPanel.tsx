import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board, Clue, MiniGameProgress, Team } from '../../types/board';
import { formatPeso } from '../../lib/currency';
import {
  COMPARISON_LEGEND,
  buildGuessComparison,
  type GuessComparisonRow,
} from '../../lib/characterGuess';
import { getRowId } from '../../lib/csvParse';
import {
  getCorrectAnswerRow,
  getDataset,
  getVisibleComparisonAttributes,
  searchDatasetRows,
} from '../../lib/miniGame';
import './CharacterGuessPanel.css';

interface CharacterGuessPanelProps {
  board: Board;
  categoryName: string;
  clue: Clue;
  mode: 'preview' | 'game';
  progress?: MiniGameProgress;
  onProgressChange?: (progress: MiniGameProgress) => void;
  teams?: Team[];
  onScoreTeam?: (teamId: string, delta: number) => void;
  teamScoreSelections?: Record<string, 'add' | 'subtract'>;
  onTeamScore?: (teamId: string, delta: number) => void;
  onClose?: () => void;
  onBackToBoard?: () => void;
  onMarkUsed?: () => void;
}

const defaultProgress = (): MiniGameProgress => ({
  guesses: [],
  revealed: false,
  won: null,
  finished: false,
});

export function CharacterGuessPanel({
  board,
  categoryName,
  clue,
  mode,
  progress: externalProgress,
  onProgressChange,
  teams,
  onScoreTeam,
  teamScoreSelections = {},
  onTeamScore,
  onClose,
  onBackToBoard,
  onMarkUsed,
}: CharacterGuessPanelProps) {
  const config = clue.miniGame!;
  const dataset = getDataset(board, config.datasetId);
  const answerRow = getCorrectAnswerRow(board, config);
  const [localProgress, setLocalProgress] = useState<MiniGameProgress>(defaultProgress);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    Array<{ rowId: string; label: string }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const progress = mode === 'preview' ? localProgress : (externalProgress ?? defaultProgress());
  const setProgress = useCallback(
    (updater: MiniGameProgress | ((p: MiniGameProgress) => MiniGameProgress)) => {
      const next = typeof updater === 'function' ? updater(progress) : updater;
      if (mode === 'preview') setLocalProgress(next);
      else onProgressChange?.(next);
    },
    [mode, onProgressChange, progress],
  );

  useEffect(() => {
    if (!dataset || !query.trim()) {
      setSuggestions([]);
      return;
    }
    setSuggestions(searchDatasetRows(dataset, config, query).map(({ rowId, label }) => ({ rowId, label })));
  }, [query, dataset, config]);

  const guessLimit = config.guessLimit;
  const guessesLeft = guessLimit - progress.guesses.length;
  const finished = progress.finished || progress.revealed;
  const visibleAttrs = getVisibleComparisonAttributes(config);
  const nameField = config.fieldMapping.nameField;

  const guessRows: GuessComparisonRow[] = progress.guesses
    .map((rowId) => {
      const guessedRow = dataset?.rows.find((r) => getRowId(r) === rowId);
      if (!guessedRow || !answerRow) return null;
      return buildGuessComparison(
        guessedRow,
        answerRow,
        config.attributes,
        nameField,
        rowId,
      );
    })
    .filter((r): r is GuessComparisonRow => r !== null);

  const submitGuess = (rowId: string) => {
    if (finished || !dataset || !answerRow) return;
    if (progress.guesses.includes(rowId)) return;

    const newGuesses = [...progress.guesses, rowId];
    const isWin = rowId === config.correctAnswerId;
    const isLose = !isWin && newGuesses.length >= guessLimit;

    setProgress({
      guesses: newGuesses,
      revealed: isWin || isLose,
      won: isWin ? true : isLose ? false : null,
      finished: isWin || isLose,
    });
    setQuery('');
    setShowSuggestions(false);
  };

  const handleReveal = () => {
    if (!window.confirm('Reveal answer? This will end the mini game for this tile.')) return;
    setProgress({ ...progress, revealed: true, finished: true, won: false });
  };

  const handleReset = () => {
    if (!window.confirm('Reset this mini game? All guesses for this tile will be cleared.')) return;
    setProgress(defaultProgress());
    setQuery('');
  };

  const imageUrl =
    config.showAnswerImage && answerRow && config.fieldMapping.imageField
      ? answerRow[config.fieldMapping.imageField]
      : undefined;

  const answerName = answerRow?.[nameField] ?? '';

  if (!config) {
    return (
      <div className="cg-panel cg-panel-error">
        <p>Mini Game is not configured.</p>
        {onClose && <button type="button" className="btn" onClick={onClose}>Close</button>}
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="cg-panel cg-panel-error">
        <p><strong>Missing dataset.</strong> Upload or re-link a CSV in the editor to play this Mini Game.</p>
        {onBackToBoard && (
          <button type="button" className="btn" onClick={onBackToBoard}>Back to Board</button>
        )}
      </div>
    );
  }

  return (
    <div className={`cg-panel${mode === 'game' ? ' cg-panel-game' : ''}`}>
      <div className="cg-header">
        <p className="cg-category">{categoryName}</p>
        <div className="cg-header-meta">
          <span className="game-value">{formatPeso(config.pointValue)}</span>
          <span className="badge badge-minigame">Mini Game</span>
        </div>
        <h2 className="cg-title">{config.title}</h2>
        <p className="cg-subtitle">Character Guess · {guessesLeft} of {guessLimit} guesses left</p>
      </div>

      <div className="cg-body">
        <div className="cg-main">
          {!finished && (
            <div className="cg-search-wrap">
              <label className="sr-only" htmlFor="cg-guess-input">Character guess</label>
              <input
                ref={inputRef}
                id="cg-guess-input"
                className="cg-search-input"
                type="text"
                placeholder="Type a character name…"
                value={query}
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && suggestions[0]) {
                    submitGuess(suggestions[0].rowId);
                  }
                }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="cg-suggestions" role="listbox">
                  {suggestions.map((s) => (
                    <li key={s.rowId}>
                      <button
                        type="button"
                        role="option"
                        onClick={() => submitGuess(s.rowId)}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {progress.won === true && (
            <div className="cg-result cg-result-win" role="status">
              <strong>Correct!</strong> {answerName} in {progress.guesses.length} guess{progress.guesses.length === 1 ? '' : 'es'}.
            </div>
          )}
          {progress.won === false && progress.revealed && (
            <div className="cg-result cg-result-lose" role="status">
              <strong>{progress.guesses.length >= guessLimit ? 'Out of guesses' : 'Answer revealed'}</strong>
              — {answerName}
            </div>
          )}

          {guessRows.length > 0 && (
            <div className="cg-table-wrap">
              <table className="cg-table">
                <thead>
                  <tr>
                    <th scope="col">Guess</th>
                    {visibleAttrs.map((a) => (
                      <th key={a.column} scope="col">{a.displayName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guessRows.map((row) => (
                    <tr key={row.rowId} className={row.isCorrect ? 'cg-row-correct' : ''}>
                      <th scope="row">{row.name}</th>
                      {row.cells.map((cell) => (
                        <td key={cell.attribute.column}>
                          <ComparisonCell
                            value={cell.guessedValue}
                            result={cell.result}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="cg-legend" aria-label="Comparison legend">
            {COMPARISON_LEGEND.map(({ icon, label }) => (
              <span key={label}><span aria-hidden="true">{icon}</span> {label}</span>
            ))}
          </div>

          {config.hostNotes && mode === 'game' && (
            <div className="cg-host-notes">
              <strong>Host notes:</strong> {config.hostNotes}
            </div>
          )}
        </div>

        <div className="cg-image-area">
          {progress.revealed && imageUrl ? (
            <img src={imageUrl} alt={answerName || 'Character'} className="cg-answer-image" />
          ) : (
            <div className="cg-image-placeholder">
              {progress.revealed ? 'No image' : 'Answer will be revealed here'}
            </div>
          )}
        </div>
      </div>

      <div className="cg-actions">
        {!finished && mode === 'game' && (
          <button type="button" className="btn" onClick={handleReveal}>
            Reveal Answer
          </button>
        )}
        {mode === 'preview' && (
          <button type="button" className="btn" onClick={handleReset}>
            Reset Preview
          </button>
        )}
        {mode === 'game' && !finished && (
          <button type="button" className="btn" onClick={handleReset}>
            Reset Mini Game
          </button>
        )}
        {onBackToBoard && (
          <button type="button" className="btn" onClick={onBackToBoard}>
            Back to Board
          </button>
        )}
        {onClose && mode === 'preview' && (
          <button type="button" className="btn" onClick={onClose}>Close</button>
        )}
        {finished && mode === 'game' && onMarkUsed && (
          <button type="button" className="btn btn-primary" onClick={onMarkUsed}>
            Mark as Used
          </button>
        )}
      </div>

      {finished && mode === 'game' && teams && (onScoreTeam || onTeamScore) && (
        <ScoreSection
          teams={teams}
          value={config.pointValue}
          selections={teamScoreSelections}
          onScore={(teamId, delta) => (onTeamScore ?? onScoreTeam)?.(teamId, delta)}
        />
      )}
    </div>
  );
}

function ComparisonCell({
  value,
  result,
}: {
  value: string;
  result: GuessComparisonRow['cells'][0]['result'];
}) {
  return (
    <span className={`cg-cell cg-cell-${result.kind}`} aria-label={`${value || 'empty'}: ${result.label}`}>
      <span className="cg-cell-icon" aria-hidden="true">{result.icon}</span>
      <span className="cg-cell-value">{value || '—'}</span>
      {'sharedTags' in result && result.sharedTags && result.sharedTags.length > 0 && (
        <span className="cg-cell-tags">
          {result.sharedTags.map((t: string) => (
            <span key={t} className="badge badge-tag">{t}</span>
          ))}
        </span>
      )}
    </span>
  );
}

function ScoreSection({
  teams,
  value,
  selections,
  onScore,
}: {
  teams: Team[];
  value: number;
  selections: Record<string, 'add' | 'subtract'>;
  onScore: (teamId: string, delta: number) => void;
}) {
  return (
    <div className="score-quick-actions cg-scoring">
      <p>Apply score — click selected again to undo:</p>
      {teams.map((team) => {
        const selection = selections[team.id];
        const scored = selection != null;
        return (
          <div key={team.id} className="score-team-row">
            <span>{team.name}</span>
            <div className="score-team-buttons" role="group" aria-label={`Score for ${team.name}`}>
              <button
                type="button"
                className={`btn btn-sm score-btn-add${selection === 'add' ? ' score-btn-selected' : ''}`}
                disabled={scored && selection !== 'add'}
                aria-pressed={selection === 'add'}
                aria-label={
                  selection === 'add'
                    ? `Undo ${value} points for ${team.name}`
                    : `Award ${value} points to ${team.name}`
                }
                onClick={() => onScore(team.id, value)}
              >
                +{value}
              </button>
              <button
                type="button"
                className={`btn btn-sm score-btn-subtract${selection === 'subtract' ? ' score-btn-selected' : ''}`}
                disabled={scored && selection !== 'subtract'}
                aria-pressed={selection === 'subtract'}
                aria-label={
                  selection === 'subtract'
                    ? `Undo −${value} points for ${team.name}`
                    : `Deduct ${value} points from ${team.name}`
                }
                onClick={() => onScore(team.id, -value)}
              >
                −{value}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
