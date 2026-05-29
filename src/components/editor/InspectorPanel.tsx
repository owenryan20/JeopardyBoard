import { useRef, useState, type CSSProperties } from 'react';
import { AlertTriangle, Copy, Download, FileJson, Printer, Upload } from 'lucide-react';
import type { Board, Clue } from '../../types/board';
import { formatPeso } from '../../lib/currency';
import { findClue } from '../../lib/boardFactory';
import { getBoardReadiness, getClueStatusLabel } from '../../lib/boardStats';
import {
  copyBoardToClipboard,
  exportBoardBackup,
  exportBoardJson,
  openPrintableBoard,
} from '../../lib/export';
import { validateBoardImport } from '../../lib/validation';
import { importBoard } from '../../hooks/useBoards';
import './InspectorPanel.css';

interface InspectorPanelProps {
  board: Board;
  selectedCategoryId: string | null;
  selectedClueId: string | null;
  teams?: { name: string; score: number; color: string }[];
}

const TEAM_COLORS = ['#3b82f6', '#a855f7', '#14b8a6'];

export function InspectorPanel({
  board,
  selectedCategoryId,
  selectedClueId,
  teams,
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
    try {
      const text = await file.text();
      const result = validateBoardImport(JSON.parse(text) as unknown);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      importBoard({ ...result.board, id: board.id, title: result.board.title });
      window.location.reload();
    } catch {
      setImportError('Invalid JSON file.');
    }
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
        <h3>Selected Clue</h3>
        {selected ? (
          <SelectedClueDetails categoryName={selected.category.name} clue={selected.clue} />
        ) : (
          <p className="inspector-empty">Select a tile to see details.</p>
        )}
      </section>

      <section className="inspector-section card">
        <h3>Portability</h3>
        <p className="inspector-hint">
          Boards are saved locally in your browser. Export a backup to move boards between devices.
        </p>
        <div className="inspector-actions">
          <button type="button" className="btn btn-sm" onClick={() => exportBoardJson(board)}>
            <FileJson size={14} aria-hidden="true" /> Export JSON
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openPrintableBoard(board)}>
            <Printer size={14} aria-hidden="true" /> Printable
          </button>
          <button type="button" className="btn btn-sm" onClick={() => exportBoardBackup(board)}>
            <Download size={14} aria-hidden="true" /> Backup
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
          accept=".json"
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
          <p>Drop JSON file or click to import</p>
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

function SelectedClueDetails({ categoryName, clue }: { categoryName: string; clue: Clue }) {
  return (
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
  );
}
