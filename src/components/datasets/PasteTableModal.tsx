import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { parsePastedTable, removeEmptyColumns } from '../../lib/tableParse';
import './DatasetModals.css';

interface PasteTableModalProps {
  onCancel: () => void;
  onImport: (name: string, columns: string[], rows: Array<Record<string, string>>) => void;
  defaultName?: string;
}

export function PasteTableModal({ onCancel, onImport, defaultName = 'Pasted Dataset' }: PasteTableModalProps) {
  const [text, setText] = useState('');
  const [firstRowHeaders, setFirstRowHeaders] = useState(true);
  const [name, setName] = useState(defaultName);
  const [showPreview, setShowPreview] = useState(false);

  const previewResult = useMemo(() => {
    if (!showPreview || !text.trim()) return null;
    return parsePastedTable(text, firstRowHeaders);
  }, [text, firstRowHeaders, showPreview]);

  const previewData = previewResult?.ok
    ? removeEmptyColumns(previewResult.columns, previewResult.rows)
    : null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="paste-table-title">
      <div className="modal dataset-modal dataset-modal-wide">
        <div className="modal-header">
          <div>
            <h2 id="paste-table-title">Paste Table</h2>
            <p className="field-hint">Paste rows from a spreadsheet or table. We&apos;ll turn them into a reusable dataset.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="label" htmlFor="paste-dataset-name">Dataset name</label>
            <input id="paste-dataset-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="paste-text">Table data</label>
            <textarea
              id="paste-text"
              className="textarea paste-textarea"
              rows={8}
              placeholder="Paste spreadsheet rows here…"
              value={text}
              onChange={(e) => { setText(e.target.value); setShowPreview(false); }}
            />
          </div>
          <label className="toggle-row">
            <span className="label" style={{ marginBottom: 0 }}>First row contains headers</span>
            <label className="toggle">
              <input type="checkbox" checked={firstRowHeaders} onChange={(e) => setFirstRowHeaders(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </label>
          {previewResult && !previewResult.ok && showPreview && (
            <p role="alert" className="import-error">{previewResult.error}</p>
          )}
          {previewData && (
            <div className="paste-preview">
              <p>We found {previewData.rows.length} rows and {previewData.columns.length} columns.</p>
              <div className="paste-preview-table-wrap">
                <table className="paste-preview-table">
                  <thead>
                    <tr>{previewData.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>{previewData.columns.map((c) => <td key={c}>{row[c] || '—'}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          {!showPreview ? (
            <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={() => setShowPreview(true)}>
              Preview Data
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!previewData || !name.trim()}
              onClick={() => previewData && onImport(name.trim(), previewData.columns, previewData.rows)}
            >
              Import Dataset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
