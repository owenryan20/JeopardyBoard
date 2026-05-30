import {
  ArrowLeft,
  ClipboardPaste,
  Copy,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DatasetQualityPanel } from '../components/datasets/DatasetQualityPanel';
import { PasteTableModal } from '../components/datasets/PasteTableModal';
import { UploadCsvModal } from '../components/datasets/UploadCsvModal';
import { useDatasets } from '../hooks/useDatasets';
import type { AppDataset, DatasetColumn, DatasetColumnType, DatasetRow } from '../types/dataset';
import { appDatasetToBoardDataset, createColumn, createEmptyRow, duplicateRow } from '../lib/datasetConvert';
import { getDatasetQualityChecks } from '../lib/datasetQuality';
import { datasetToCsv } from '../lib/csvParse';
import { downloadFile } from '../lib/export';
import { replaceAppDatasetData } from '../lib/datasetStorage';
import { createId } from '../lib/ids';
import { formatDatasetUsage, getDatasetUsage } from '../lib/datasetUsage';
import './DatasetBuilderPage.css';
import './DashboardPage.css';

const COLUMN_TYPES: { value: DatasetColumnType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'tags', label: 'Tags' },
  { value: 'image', label: 'Image' },
  { value: 'name', label: 'Name / Search' },
  { value: 'hidden', label: 'Hidden' },
];

export function DatasetBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const navigate = useNavigate();
  const { datasets, saveDataset, duplicateDataset, removeDataset } = useDatasets();
  const source = datasets.find((d) => d.id === id);

  const [draft, setDraft] = useState<AppDataset | null>(source ?? null);
  const [search, setSearch] = useState('');
  const [saveLabel, setSaveLabel] = useState('Saved');
  const [showUpload, setShowUpload] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (source) setDraft(source);
    else if (id) navigate('/datasets');
  }, [source, id, navigate]);

  useEffect(() => {
    if (!draft) return;
    setSaveLabel('Saving…');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveDataset(draft);
      setSaveLabel('Saved just now');
    }, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [draft, saveDataset]);

  const filteredRows = useMemo(() => {
    if (!draft) return [];
    const q = search.trim().toLowerCase();
    if (!q) return draft.rows;
    return draft.rows.filter((row) =>
      draft.columns.some((col) => (row.values[col.name] ?? '').toLowerCase().includes(q)),
    );
  }, [draft, search]);

  if (!draft) {
    return <div className="page"><p>Loading dataset…</p></div>;
  }

  const qualityChecks = getDatasetQualityChecks(draft);
  const usage = getDatasetUsage(draft.id);

  const updateDraft = (updater: (d: AppDataset) => AppDataset) => setDraft((prev) => (prev ? updater(prev) : prev));

  const addRow = () => updateDraft((d) => ({ ...d, rows: [...d.rows, createEmptyRow(d.columns)] }));

  const duplicateRowAt = (rowId: string) => updateDraft((d) => {
    const row = d.rows.find((r) => r.id === rowId);
    if (!row) return d;
    const idx = d.rows.findIndex((r) => r.id === rowId);
    const copy = duplicateRow(row);
    const rows = [...d.rows];
    rows.splice(idx + 1, 0, copy);
    return { ...d, rows };
  });

  const deleteRow = (rowId: string) => {
    if (!window.confirm('Delete this row?')) return;
    updateDraft((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== rowId) }));
  };

  const addColumn = () => {
    const name = window.prompt('Column name:');
    if (!name?.trim()) return;
    updateDraft((d) => ({
      ...d,
      columns: [...d.columns, createColumn(name.trim())],
      rows: d.rows.map((r) => ({ ...r, values: { ...r.values, [name.trim()]: '' } })),
    }));
  };

  const renameColumn = (colId: string) => {
    const col = draft.columns.find((c) => c.id === colId);
    if (!col) return;
    const name = window.prompt('Rename column:', col.name);
    if (!name?.trim() || name === col.name) return;
    const oldName = col.name;
    updateDraft((d) => ({
      ...d,
      columns: d.columns.map((c) => (c.id === colId ? { ...c, name: name.trim() } : c)),
      rows: d.rows.map((r) => {
        const values = { ...r.values };
        values[name.trim()] = values[oldName] ?? '';
        if (name.trim() !== oldName) delete values[oldName];
        return { ...r, values };
      }),
    }));
  };

  const deleteColumn = (colId: string) => {
    const col = draft.columns.find((c) => c.id === colId);
    if (!col || !window.confirm(`Delete column "${col.name}"?`)) return;
    updateDraft((d) => ({
      ...d,
      columns: d.columns.filter((c) => c.id !== colId),
      rows: d.rows.map((r) => {
        const values = { ...r.values };
        delete values[col.name];
        return { ...r, values };
      }),
    }));
  };

  const setCell = (rowId: string, colName: string, value: string) => {
    updateDraft((d) => ({
      ...d,
      rows: d.rows.map((r) =>
        r.id === rowId ? { ...r, values: { ...r.values, [colName]: value } } : r,
      ),
    }));
  };

  const setColumnType = (colId: string, type: DatasetColumnType) => {
    updateDraft((d) => ({
      ...d,
      columns: d.columns.map((c) => (c.id === colId ? { ...c, type, hidden: type === 'hidden' } : c)),
    }));
  };

  const exportCsv = () => {
    const csv = datasetToCsv(appDatasetToBoardDataset(draft));
    const safe = draft.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'dataset';
    downloadFile(csv, `${safe}.csv`, 'text/csv');
  };

  const handleReplace = (_name: string, columns: string[], rows: Array<Record<string, string>>) => {
    replaceAppDatasetData(draft.id, columns, rows, 'csv');
    setShowUpload(false);
    window.location.reload();
  };

  const handlePasteAppend = (_name: string, columns: string[], rows: Array<Record<string, string>>) => {
    const newCols = [...draft.columns];
    for (const col of columns) {
      if (!newCols.find((c) => c.name === col)) newCols.push(createColumn(col));
    }
    const newRows: DatasetRow[] = rows.map((values) => {
      const rowValues: Record<string, string> = {};
      for (const col of newCols) rowValues[col.name] = values[col.name] ?? '';
      return { id: createId(), values: rowValues };
    });
    updateDraft((d) => ({ ...d, columns: newCols, rows: [...d.rows, ...newRows] }));
    setShowPaste(false);
  };

  const handleDeleteDataset = () => {
    if (usage.miniGameCount > 0) {
      if (!window.confirm(`This dataset is used by ${usage.miniGameCount} Mini Game tile(s). Delete anyway?`)) return;
    } else if (!window.confirm(`Delete "${draft.name}"?`)) return;
    removeDataset(draft.id);
    navigate('/datasets');
  };

  return (
    <div className="page dataset-builder-page">
      <header className="page-header">
        <div className="dataset-builder-title-wrap">
          <Link to={returnTo || '/datasets'} className="btn btn-ghost btn-sm">
            <ArrowLeft size={16} /> Back
          </Link>
          <input
            className="dataset-name-input"
            value={draft.name}
            aria-label="Dataset name"
            onChange={(e) => updateDraft((d) => ({ ...d, name: e.target.value }))}
          />
          <span className="save-status">{saveLabel}</span>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={addRow}><Plus size={14} /> Add Row</button>
          <button type="button" className="btn btn-sm" onClick={addColumn}><Plus size={14} /> Add Column</button>
          <button type="button" className="btn btn-sm" onClick={() => setShowPaste(true)}><ClipboardPaste size={14} /> Paste Rows</button>
          <button type="button" className="btn btn-sm" onClick={() => setShowUpload(true)}><Upload size={14} /> Import CSV</button>
          <button type="button" className="btn btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
          <div className="dropdown">
            <button type="button" className="btn btn-icon btn-sm" aria-label="More actions" onClick={() => setMenuOpen((o) => !o)}>
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <button type="button" className="dropdown-item" onClick={() => { duplicateDataset(draft.id); setMenuOpen(false); }}>
                  <Copy size={14} /> Duplicate Dataset
                </button>
                <button type="button" className="dropdown-item dropdown-item-danger" onClick={handleDeleteDataset}>
                  <Trash2 size={14} /> Delete Dataset
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="dataset-builder-meta">
        <span>{draft.rows.length} rows</span>
        <span>{draft.columns.filter((c) => !c.hidden).length} columns</span>
        <span>{formatDatasetUsage(usage)}</span>
      </div>

      <div className="dataset-builder-layout">
        <DatasetQualityPanel checks={qualityChecks} />
        <div className="dataset-spreadsheet-wrap card">
          <div className="dataset-spreadsheet-toolbar">
            <div className="search-input-wrap">
              <Search size={16} aria-hidden="true" />
              <input className="input input-sm" placeholder="Search rows…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <p className="field-hint dataset-image-hint">
            Images are optional. Mini Games can still be played without them. Image URLs and relative paths are preserved in exports.
          </p>
          <div className="dataset-spreadsheet-scroll">
            <table className="dataset-spreadsheet">
              <thead>
                <tr>
                  <th className="ds-actions-col" scope="col">Actions</th>
                  {draft.columns.map((col) => (
                    <ColumnHeader
                      key={col.id}
                      column={col}
                      onRename={() => renameColumn(col.id)}
                      onDelete={() => deleteColumn(col.id)}
                      onTypeChange={(type) => setColumnType(col.id, type)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="ds-actions-col">
                      <button type="button" className="btn btn-ghost btn-sm" aria-label="Duplicate row" onClick={() => duplicateRowAt(row.id)}><Copy size={12} /></button>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label="Delete row" onClick={() => deleteRow(row.id)}><Trash2 size={12} /></button>
                    </td>
                    {draft.columns.map((col) => (
                      <CellEditor
                        key={col.id}
                        column={col}
                        value={row.values[col.name] ?? ''}
                        onChange={(v) => setCell(row.id, col.name, v)}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showUpload && (
        <UploadCsvModal replaceMode datasetName={draft.name} onCancel={() => setShowUpload(false)} onImport={handleReplace} />
      )}
      {showPaste && (
        <PasteTableModal defaultName={`${draft.name} rows`} onCancel={() => setShowPaste(false)} onImport={handlePasteAppend} />
      )}
    </div>
  );
}

function ColumnHeader({
  column,
  onRename,
  onDelete,
  onTypeChange,
}: {
  column: DatasetColumn;
  onRename: () => void;
  onDelete: () => void;
  onTypeChange: (type: DatasetColumnType) => void;
}) {
  return (
    <th scope="col" className={column.hidden ? 'ds-col-hidden' : ''}>
      <div className="ds-col-header">
        <button type="button" className="ds-col-name" onClick={onRename}>{column.name}</button>
        <select
          className="select select-sm ds-col-type"
          value={column.type}
          aria-label={`Type for ${column.name}`}
          onChange={(e) => onTypeChange(e.target.value as DatasetColumnType)}
        >
          {COLUMN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Delete column ${column.name}`} onClick={onDelete}><Trash2 size={12} /></button>
      </div>
    </th>
  );
}

function CellEditor({
  column,
  value,
  onChange,
}: {
  column: DatasetColumn;
  value: string;
  onChange: (value: string) => void;
}) {
  const [imgError, setImgError] = useState(false);

  if (column.type === 'image' && value && !imgError) {
    return (
      <td className="ds-image-cell">
        <img src={value} alt="" className="ds-thumb" onError={() => setImgError(true)} />
        <input className="input input-sm" value={value} aria-label={`${column.name} URL`} onChange={(e) => { setImgError(false); onChange(e.target.value); }} />
      </td>
    );
  }

  if (column.type === 'image' && imgError) {
    return (
      <td className="ds-image-cell">
        <span className="ds-img-unavailable">Image unavailable</span>
        <input className="input input-sm" value={value} onChange={(e) => { setImgError(false); onChange(e.target.value); }} />
      </td>
    );
  }

  if (column.type === 'tags' && value) {
    return (
      <td>
        <div className="ds-tag-chips">
          {value.split(/[,;|/]/).map((t) => t.trim()).filter(Boolean).map((tag) => (
            <span key={tag} className="badge badge-tag">{tag}</span>
          ))}
        </div>
        <input className="input input-sm" value={value} aria-label={column.name} onChange={(e) => onChange(e.target.value)} />
      </td>
    );
  }

  return (
    <td>
      <input
        className={`input input-sm${!value ? ' ds-cell-empty' : ''}`}
        value={value}
        aria-label={column.name}
        onChange={(e) => onChange(e.target.value)}
      />
    </td>
  );
}
