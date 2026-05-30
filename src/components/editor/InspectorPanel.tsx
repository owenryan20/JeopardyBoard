import { useRef, useState, type CSSProperties } from 'react';
import { AlertTriangle, Check, Copy, Download, Eye, FileJson, Pencil, Printer, Trash2, Upload } from 'lucide-react';
import type { Board, Clue } from '../../types/board';
import { isMiniGameTile } from '../../types/board';
import { formatPeso } from '../../lib/currency';
import { findClue, hasTileContent } from '../../lib/boardFactory';
import { getBoardReadiness, getClueStatusLabel } from '../../lib/boardStats';
import {
  getCorrectAnswerName,
  getDataset,
  getMiniGameReadiness,
  getVisibleComparisonAttributes,
} from '../../lib/miniGame';
import {
  copyBoardToClipboard,
  exportBoardBackup,
  exportBoardJson,
  openPrintableBoard,
} from '../../lib/export';
import { exportBoardZip, exportBoardZipBackup } from '../../lib/boardZip';
import { importBoardFromFile } from '../../lib/boardImport';
import { importBoard } from '../../hooks/useBoards';
import './InspectorPanel.css';

interface InspectorPanelProps {
  board: Board;
  selectedCategoryId: string | null;
  selectedClueId: string | null;
  teams?: { name: string; score: number; color: string }[];
  onEditMiniGame?: () => void;
  onPreviewMiniGame?: () => void;
  onDuplicateTile?: () => void;
  onResetTile?: () => void;
}

const TEAM_COLORS = ['#3b82f6', '#a855f7', '#14b8a6'];

export function InspectorPanel({
  board,
  selectedCategoryId,
  selectedClueId,
  teams,
  onEditMiniGame,
  onPreviewMiniGame,
  onDuplicateTile,
  onResetTile,
}: InspectorPanelProps) {
  const readiness = getBoardReadiness(board);
  const selected =
    selectedCategoryId && selectedClueId
      ? findClue(board, selectedCategoryId, selectedClueId)
      : null;

  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (file: File) => {
    setImportError(null);
    const result = await importBoardFromFile(file);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    importBoard({ ...result.board, id: board.id, title: result.board.title });
    window.location.reload();
  };

  const previewTeams =
    teams ??
    [
      { name: 'Alpha', score: 1200, color: TEAM_COLORS[0] },
      { name: 'Bravo', score: 800, color: TEAM_COLORS[1] },
      { name: 'Charlie', score: 1500, color: TEAM_COLORS[2] },
    ];

  return (
    <aside className="inspector" aria-label="Board inspector">
      <section className="inspector-section card">
        <h3>Board Readiness</h3>
        <div className="readiness-ring" aria-label={`${readiness.percent}% complete`}>
          <svg viewBox="0 0 36 36" className="readiness-svg">
            <path
              className="readiness-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="readiness-fill"
              strokeDasharray={`${readiness.percent}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="readiness-percent">{readiness.percent}%</span>
        </div>
        <p className="readiness-summary">
          {readiness.completed} of {readiness.total} clues completed
        </p>
        <ul className="readiness-warnings">
          {readiness.missingAnswers > 0 && (
            <li className="warning-item warning-yellow">
              <AlertTriangle size={14} aria-hidden="true" />
              {readiness.missingAnswers} missing answer{readiness.missingAnswers === 1 ? '' : 's'}
            </li>
          )}
          {readiness.mediaWithoutAlt > 0 && (
            <li className="warning-item warning-red">
              <AlertTriangle size={14} aria-hidden="true" />
              {readiness.mediaWithoutAlt} clue{readiness.mediaWithoutAlt === 1 ? '' : 's'} with media
              without alt text
            </li>
          )}
          {readiness.missingAnswers === 0 && readiness.mediaWithoutAlt === 0 && (
            <li className="warning-item warning-ok">Board looks good!</li>
          )}
        </ul>
      </section>

      <section className="inspector-section card">
        <h3>{selected && isMiniGameTile(selected.clue) ? 'Selected Tile' : 'Selected Clue'}</h3>
        {selected ? (
          isMiniGameTile(selected.clue) ? (
            <MiniGameTileDetails
              board={board}
              categoryName={selected.category.name}
              clue={selected.clue}
              onEdit={onEditMiniGame}
              onPreview={onPreviewMiniGame}
              onDuplicate={onDuplicateTile}
              onReset={onResetTile}
            />
          ) : (
            <SelectedClueDetails
              categoryName={selected.category.name}
              clue={selected.clue}
              board={board}
              onReset={onResetTile}
            />
          )
        ) : (
          <p className="inspector-empty">Select a tile to see details.</p>
        )}
      </section>

      <section className="inspector-section card">
        <h3>Portability</h3>
        <p className="inspector-hint">
          Boards and uploaded media are saved in this browser on the host device. Export a ZIP backup to move boards with media to another computer.
        </p>
        <div className="inspector-actions">
          <button type="button" className="btn btn-sm" onClick={() => void exportBoardZip(board)}>
            <Download size={14} aria-hidden="true" /> Export ZIP
          </button>
          <button type="button" className="btn btn-sm" onClick={() => exportBoardJson(board)}>
            <FileJson size={14} aria-hidden="true" /> Export JSON
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openPrintableBoard(board)}>
            <Printer size={14} aria-hidden="true" /> Printable
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void exportBoardZipBackup(board)}>
            <Download size={14} aria-hidden="true" /> ZIP Backup
          </button>
          <button type="button" className="btn btn-sm" onClick={() => exportBoardBackup(board)}>
            <Download size={14} aria-hidden="true" /> JSON Backup
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={async () => {
              await copyBoardToClipboard(board);
              setCopyMsg('Copied!');
              setTimeout(() => setCopyMsg(null), 2000);
            }}
          >
            <Copy size={14} aria-hidden="true" /> {copyMsg ?? 'Copy data'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.zip,application/json,application/zip"
          className="sr-only"
          aria-label="Import JSON"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportFile(f);
            e.target.value = '';
          }}
        />
        <div
          className="drop-zone"
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
          }}
          onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            const f = e.dataTransfer.files[0];
            if (f) void handleImportFile(f);
          }}
        >
          <Upload size={20} aria-hidden="true" />
          <p>Drop JSON or ZIP file, or click to import</p>
        </div>
        {importError && (
          <p role="alert" className="import-error">
            {importError}
          </p>
        )}
      </section>

      <section className="inspector-section card game-preview-section">
        <h3>Game Mode Preview</h3>
        <div
          className="game-preview-board"
          style={{ '--board-cols': Math.min(board.categories.length, 6) } as CSSProperties}
          aria-hidden="true"
        >
          <div className="game-preview-cats">
            {board.categories.slice(0, 6).map((c) => (
              <span key={c.id}>{c.name.slice(0, 8)}</span>
            ))}
          </div>
          <div className="game-preview-values">
            {[100, 200, 300].map((v) => (
              <span key={v} className="game-value">
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className="team-preview">
          {previewTeams.map((t) => (
            <div key={t.name} className="team-preview-card" style={{ borderColor: t.color }}>
              <span className="team-preview-name">{t.name}</span>
              <span className="team-preview-score" style={{ color: t.color }}>
                {formatPeso(t.score)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function MiniGameTileDetails({
  board,
  categoryName,
  clue,
  onEdit,
  onPreview,
  onDuplicate,
  onReset,
}: {
  board: Board;
  categoryName: string;
  clue: Clue;
  onEdit?: () => void;
  onPreview?: () => void;
  onDuplicate?: () => void;
  onReset?: () => void;
}) {
  const config = clue.miniGame!;
  const readiness = getMiniGameReadiness(board, clue);
  const dataset = getDataset(board, config.datasetId);
  const visibleAttrs = getVisibleComparisonAttributes(config);
  const answerName = getCorrectAnswerName(board, clue);

  return (
    <div className="minigame-inspector">
      <dl className="selected-clue-dl">
        <div>
          <dt>Type</dt>
          <dd><span className="badge badge-minigame">Mini Game</span></dd>
        </div>
        <div>
          <dt>Game</dt>
          <dd>Character Guess</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{categoryName}</dd>
        </div>
        <div>
          <dt>Point Value</dt>
          <dd>{config.pointValue}</dd>
        </div>
        <div>
          <dt>Dataset</dt>
          <dd>{dataset?.name ?? (config.datasetId ? 'Missing dataset' : 'None')}</dd>
        </div>
        <div>
          <dt>Correct Answer</dt>
          <dd>{answerName || '—'}</dd>
        </div>
        <div>
          <dt>Visible Attributes</dt>
          <dd>{visibleAttrs.length > 0 ? visibleAttrs.map((a) => a.displayName).join(', ') : '—'}</dd>
        </div>
        <div>
          <dt>Guess Limit</dt>
          <dd>{config.guessLimit}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`mg-status-badge mg-status-${readiness.status}`}>
              {readiness.label}
            </span>
          </dd>
        </div>
      </dl>

      <ul className="mg-checklist">
        {readiness.checklist.map((item) => (
          <li key={item.label} className={item.done ? 'mg-check-done' : ''}>
            {item.done ? <Check size={14} aria-hidden="true" /> : <span className="mg-check-empty" aria-hidden="true" />}
            {item.label}
          </li>
        ))}
      </ul>

      <div className="inspector-actions mg-inspector-actions">
        {onEdit && (
          <button type="button" className="btn btn-sm btn-primary" onClick={onEdit}>
            <Pencil size={14} aria-hidden="true" /> Edit Mini Game
          </button>
        )}
        {onPreview && (
          <button type="button" className="btn btn-sm" onClick={onPreview}>
            <Eye size={14} aria-hidden="true" /> Preview Mini Game
          </button>
        )}
        {onDuplicate && (
          <button type="button" className="btn btn-sm" onClick={onDuplicate}>
            <Copy size={14} aria-hidden="true" /> Duplicate Tile
          </button>
        )}
        {onReset && hasTileContent(clue, board) && (
          <button type="button" className="btn btn-sm btn-danger" onClick={onReset}>
            <Trash2 size={14} aria-hidden="true" /> Reset Tile
          </button>
        )}
      </div>
    </div>
  );
}

function SelectedClueDetails({
  categoryName,
  clue,
  board,
  onReset,
}: {
  categoryName: string;
  clue: Clue;
  board: Board;
  onReset?: () => void;
}) {
  return (
    <>
    <dl className="selected-clue-dl">
      <div>
        <dt>Category</dt>
        <dd>{categoryName}</dd>
      </div>
      <div>
        <dt>Point Value</dt>
        <dd>{clue.value}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{getClueStatusLabel(clue)}</dd>
      </div>
      {clue.tags.length > 0 && (
        <div>
          <dt>Tags</dt>
          <dd className="tag-list">
            {clue.tags.map((tag) => (
              <span key={tag} className="badge badge-tag">
                {tag}
              </span>
            ))}
          </dd>
        </div>
      )}
      {clue.isDailyDouble && (
        <div>
          <dt>Badge</dt>
          <dd>
            <span className="badge badge-dd">Daily Double</span>
          </dd>
        </div>
      )}
    </dl>
    {onReset && hasTileContent(clue, board) && (
      <div className="inspector-actions mg-inspector-actions">
        <button type="button" className="btn btn-sm btn-danger" onClick={onReset}>
          <Trash2 size={14} aria-hidden="true" /> Reset Tile
        </button>
      </div>
    )}
    </>
  );
}
