import { Download, ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  AttributeBehavior,
  Board,
  BoardDataset,
  Clue,
  MiniGameAttribute,
  MiniGameConfig,
} from '../../types/board';
import { DEFAULT_POINT_VALUES } from '../../types/board';
import type { AppDataset, DatasetKind } from '../../types/dataset';
import {
  datasetToCsv,
  findDuplicateNames,
  getRowDisplayName,
  getRowId,
  suggestNameField as csvSuggestNameField,
} from '../../lib/csvParse';
import { appDatasetToBoardDataset } from '../../lib/datasetConvert';
import { exportBoardBackup } from '../../lib/export';
import { useDatasets } from '../../hooks/useDatasets';
import {
  applyDatasetToMiniGame,
  getDataset,
  getMiniGameReadiness,
  searchDatasetRows,
} from '../../lib/miniGame';
import { ChooseDatasetModal } from '../datasets/ChooseDatasetModal';
import { CreateDatasetModal } from '../datasets/CreateDatasetModal';
import { PasteTableModal } from '../datasets/PasteTableModal';
import { UploadCsvModal } from '../datasets/UploadCsvModal';
import { CharacterGuessPanel } from '../minigame/CharacterGuessPanel';
import './MiniGameEditor.css';

type Tab = 'setup' | 'dataset' | 'attributes' | 'preview';

const BEHAVIOR_OPTIONS: { value: AttributeBehavior; label: string }[] = [
  { value: 'searchName', label: 'Search Name' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'partial', label: 'Partial Match' },
  { value: 'numeric', label: 'Higher / Lower' },
  { value: 'tagOverlap', label: 'Tag Overlap' },
  { value: 'image', label: 'Image Field' },
  { value: 'hidden', label: 'Hidden' },
];

interface MiniGameEditorProps {
  board: Board;
  categoryName: string;
  clue: Clue;
  onSave: (clue: Clue) => void;
  onCancel: () => void;
}

export function MiniGameEditor({
  board,
  categoryName,
  clue,
  onSave,
  onCancel,
}: MiniGameEditorProps) {
  const { datasets: globalDatasets, createDataset, createFromParsed } = useDatasets();
  const [tab, setTab] = useState<Tab>('setup');
  const [draftClue, setDraftClue] = useState(clue);
  const [csvDetails, setCsvDetails] = useState<string | null>(null);
  const [answerQuery, setAnswerQuery] = useState('');
  const [showChoose, setShowChoose] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPaste, setShowPaste] = useState(false);

  const config = draftClue.miniGame!;
  const dataset = getDataset(board, config.datasetId);
  const appDataset = globalDatasets.find((d) => d.id === config.datasetId);
  const missingDataset = Boolean(config.datasetId && !dataset);

  useEffect(() => {
    setDraftClue(clue);
    const mg = clue.miniGame;
    if (!mg?.correctAnswerId) {
      setAnswerQuery('');
      return;
    }
    const ds = getDataset(board, mg.datasetId);
    const row = ds?.rows.find((r) => getRowId(r) === mg.correctAnswerId);
    if (row && ds) {
      const disambiguation = ds.columns.filter((c) => c !== mg.fieldMapping.nameField).slice(0, 2);
      setAnswerQuery(getRowDisplayName(row, mg.fieldMapping.nameField, disambiguation));
    } else {
      setAnswerQuery('');
    }
  }, [clue, board]);

  const updateConfig = (partial: Partial<MiniGameConfig>) => {
    setDraftClue((prev) => ({
      ...prev,
      miniGame: { ...prev.miniGame!, ...partial, pointValue: partial.pointValue ?? prev.miniGame!.pointValue },
      value: partial.pointValue ?? prev.value,
    }));
  };

  const selectCorrectAnswer = (rowId: string, label: string) => {
    updateConfig({ correctAnswerId: rowId });
    setAnswerQuery(label);
  };

  const attachDataset = (legacy: BoardDataset) => {
    const updated = applyDatasetToMiniGame(config, legacy);
    updateConfig(updated);
    setTab('attributes');
  };

  const handleSelectDataset = (ds: AppDataset) => {
    attachDataset(appDatasetToBoardDataset(ds));
    setShowChoose(false);
  };

  const handleCreateDataset = (name: string, kind: DatasetKind) => {
    const ds = createDataset(name, kind);
    attachDataset(appDatasetToBoardDataset(ds));
    setShowCreate(false);
  };

  const handleImportDataset = (name: string, columns: string[], rows: Array<Record<string, string>>) => {
    const ds = createFromParsed(name, columns, rows, 'csv');
    const legacy = appDatasetToBoardDataset(ds);
    const dupes = findDuplicateNames(legacy.rows, csvSuggestNameField(legacy.columns));
    if (dupes.length > 0) {
      setCsvDetails(`Warning: duplicate names found (${dupes.slice(0, 3).join(', ')}${dupes.length > 3 ? '…' : ''}).`);
    }
    attachDataset(legacy);
    setShowUpload(false);
  };

  const handlePasteImport = (name: string, columns: string[], rows: Array<Record<string, string>>) => {
    const ds = createFromParsed(name, columns, rows, 'pasted');
    attachDataset(appDatasetToBoardDataset(ds));
    setShowPaste(false);
  };

  const updateAttribute = (index: number, partial: Partial<MiniGameAttribute>) => {
    const attrs = [...config.attributes];
    attrs[index] = { ...attrs[index], ...partial };
    updateConfig({ attributes: attrs });
  };

  const disambiguationFields = dataset
    ? dataset.columns.filter((c) => c !== config.fieldMapping.nameField).slice(0, 2)
    : [];

  const answerPickerOptions = dataset
    ? answerQuery.trim()
      ? searchDatasetRows(dataset, config, answerQuery)
      : dataset.rows.map((row) => ({
          rowId: getRowId(row),
          label: getRowDisplayName(row, config.fieldMapping.nameField, disambiguationFields),
          row,
        }))
    : [];

  const readiness = getMiniGameReadiness(board, draftClue);
  const visibleAttrCount = config.attributes.filter((a) => a.visible && a.behavior !== 'hidden').length;

  const save = () => onSave({ ...draftClue, value: config.pointValue });

  const builderReturn = `/boards/${board.id}/edit`;

  return (
    <div className="minigame-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="mg-editor-title">
      <div className="modal minigame-editor">
        <div className="modal-header">
          <div>
            <h2 id="mg-editor-title">Edit Mini Game</h2>
            <p className="minigame-editor-subtitle">
              Character Guess · {config.pointValue} points · {categoryName}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="minigame-tabs" role="tablist">
          {(['setup', 'dataset', 'attributes', 'preview'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`minigame-tab${tab === t ? ' minigame-tab-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="modal-body minigame-editor-body">
          {tab === 'setup' && (
            <div className="minigame-tab-panel">
              <div className="field">
                <label className="label" htmlFor="mg-title">Mini Game title</label>
                <input id="mg-title" className="input" value={config.title} onChange={(e) => updateConfig({ title: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Mini Game type</label>
                <input className="input" value="Character Guess" readOnly disabled />
              </div>
              <div className="field">
                <label className="label" htmlFor="mg-value">Point value</label>
                <select id="mg-value" className="select" value={config.pointValue} onChange={(e) => updateConfig({ pointValue: Number(e.target.value) })}>
                  {DEFAULT_POINT_VALUES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="mg-answer">Correct answer</label>
                <input
                  id="mg-answer"
                  className="input"
                  placeholder="Search dataset…"
                  value={answerQuery}
                  onChange={(e) => setAnswerQuery(e.target.value)}
                />
                {dataset && (
                  <ul className="mg-answer-list">
                    {answerPickerOptions.map((opt) => (
                      <li key={opt.rowId}>
                        <button
                          type="button"
                          className={config.correctAnswerId === opt.rowId ? 'mg-answer-selected' : ''}
                          onClick={() => selectCorrectAnswer(opt.rowId, opt.label)}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="field">
                <label className="label" htmlFor="mg-guess-limit">Guess limit</label>
                <select id="mg-guess-limit" className="select" value={config.guessLimit} onChange={(e) => updateConfig({ guessLimit: Number(e.target.value) })}>
                  {[4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="field toggle-row">
                <span className="label" style={{ marginBottom: 0 }}>Show answer image</span>
                <label className="toggle">
                  <input type="checkbox" checked={config.showAnswerImage} onChange={(e) => updateConfig({ showAnswerImage: e.target.checked })} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="field">
                <label className="label" htmlFor="mg-host-notes">Host notes</label>
                <textarea id="mg-host-notes" className="textarea" rows={2} value={config.hostNotes} onChange={(e) => updateConfig({ hostNotes: e.target.value })} />
              </div>
              <div className={`readiness-badge readiness-${readiness.status}`}>{readiness.label}</div>
            </div>
          )}

          {tab === 'dataset' && (
            <div className="minigame-tab-panel">
              <p className="field-hint">
                Datasets are saved locally in your browser. Export a complete backup to move boards and mini games between devices.
              </p>

              {missingDataset ? (
                <div className="dataset-card card mg-dataset-missing">
                  <strong>Dataset missing</strong>
                  <p>This Mini Game needs its dataset before it can be played.</p>
                  <div className="dataset-actions mg-dataset-actions">
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowChoose(true)}>Choose Replacement Dataset</button>
                    <button type="button" className="btn btn-sm" onClick={() => setShowUpload(true)}>Upload CSV</button>
                    <Link to="/datasets" className="btn btn-sm">Open Dataset Library</Link>
                  </div>
                </div>
              ) : dataset ? (
                <div className="dataset-card card">
                  <strong>{dataset.name}</strong>
                  <p>{dataset.rows.length} rows · {dataset.columns.length} columns</p>
                  <p className="field-hint">Saved locally · Included in board backup</p>
                  <ul className="mg-dataset-summary">
                    <li>{visibleAttrCount} visible comparison attribute{visibleAttrCount === 1 ? '' : 's'}</li>
                    {config.fieldMapping.nameField && <li>Name column: {config.fieldMapping.nameField}</li>}
                    {config.fieldMapping.imageField && <li>Image column: {config.fieldMapping.imageField}</li>}
                  </ul>
                  <div className="dataset-actions">
                    <button type="button" className="btn btn-sm" onClick={() => setShowChoose(true)}>Choose Dataset</button>
                    {appDataset && (
                      <Link to={`/datasets/${appDataset.id}?returnTo=${encodeURIComponent(builderReturn)}`} className="btn btn-sm">
                        <ExternalLink size={14} /> Open Full Dataset Builder
                      </Link>
                    )}
                    <button type="button" className="btn btn-sm" onClick={() => downloadDatasetCsv(dataset)}><Download size={14} /> Download dataset CSV</button>
                    <button type="button" className="btn btn-sm" onClick={() => exportBoardBackup(board)}>Export complete backup</button>
                  </div>
                </div>
              ) : (
                <div className="mg-no-dataset card">
                  <strong>No dataset selected</strong>
                  <p>Choose, create, upload, or paste a dataset to build this Mini Game.</p>
                  <div className="dataset-actions mg-dataset-actions">
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowChoose(true)}>Choose Dataset</button>
                    <button type="button" className="btn btn-sm" onClick={() => setShowCreate(true)}>Create Dataset</button>
                    <button type="button" className="btn btn-sm" onClick={() => setShowUpload(true)}>Upload CSV</button>
                    <button type="button" className="btn btn-sm" onClick={() => setShowPaste(true)}>Paste Table</button>
                  </div>
                </div>
              )}

              {csvDetails && <p className="field-hint">{csvDetails}</p>}
              {dataset && (
                <div className="field">
                  <label className="label" htmlFor="mg-name-field">Character name field</label>
                  <select id="mg-name-field" className="select" value={config.fieldMapping.nameField} onChange={(e) => updateConfig({ fieldMapping: { ...config.fieldMapping, nameField: e.target.value, answerField: e.target.value } })}>
                    {dataset.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {tab === 'attributes' && (
            <div className="minigame-tab-panel">
              {!dataset ? (
                <p>Upload a dataset first.</p>
              ) : (
                <div className="attr-table-wrap">
                  <table className="attr-table">
                    <thead>
                      <tr>
                        <th className="attr-col-column">Column</th>
                        <th className="attr-col-samples">Sample values</th>
                        <th className="attr-col-show">Show</th>
                        <th className="attr-col-behavior">Behavior</th>
                        <th className="attr-col-display">Display name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.attributes.map((attr, i) => {
                        const samples = getUniqueSampleValues(dataset.rows, attr.column, 3);
                        return (
                          <tr key={attr.column}>
                            <td className="attr-col-column">{attr.column}</td>
                            <td className="attr-col-samples"><span className="sample-chips">{samples.join(', ') || '—'}</span></td>
                            <td className="attr-col-show">
                              <label className="toggle toggle-sm">
                                <input type="checkbox" checked={attr.visible} onChange={(e) => updateAttribute(i, { visible: e.target.checked })} />
                                <span className="toggle-slider" />
                              </label>
                            </td>
                            <td className="attr-col-behavior">
                              <select className="select select-sm" value={attr.behavior} onChange={(e) => updateAttribute(i, { behavior: e.target.value as AttributeBehavior })}>
                                {BEHAVIOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </td>
                            <td className="attr-col-display">
                              <input className="input input-sm" value={attr.displayName} onChange={(e) => updateAttribute(i, { displayName: e.target.value })} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'preview' && (
            <div className="minigame-tab-panel minigame-preview-tab">
              <CharacterGuessPanel board={board} categoryName={categoryName} clue={draftClue} mode="preview" />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn" onClick={() => { save(); setTab('preview'); }}>Save &amp; Preview</button>
          <button type="button" className="btn btn-primary" onClick={save}>Save Mini Game</button>
        </div>
      </div>

      {showChoose && (
        <ChooseDatasetModal
          datasets={globalDatasets}
          selectedId={config.datasetId}
          onCancel={() => setShowChoose(false)}
          onSelect={handleSelectDataset}
        />
      )}
      {showCreate && (
        <CreateDatasetModal onCancel={() => setShowCreate(false)} onCreate={handleCreateDataset} />
      )}
      {showUpload && (
        <UploadCsvModal onCancel={() => setShowUpload(false)} onImport={handleImportDataset} />
      )}
      {showPaste && (
        <PasteTableModal onCancel={() => setShowPaste(false)} onImport={handlePasteImport} />
      )}
    </div>
  );
}

function downloadDatasetCsv(dataset: BoardDataset) {
  const blob = new Blob([datasetToCsv(dataset)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dataset.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function getUniqueSampleValues(
  rows: Array<Record<string, string>>,
  column: string,
  max = 3,
): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const row of rows) {
    const value = row[column]?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    values.push(value);
    if (values.length >= max) break;
  }
  return values;
}
