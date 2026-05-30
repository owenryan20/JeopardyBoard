import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { parseCsvText } from '../../lib/csvParse';
import { removeEmptyColumns } from '../../lib/tableParse';
import './DatasetModals.css';

interface UploadCsvModalProps {
  title?: string;
  replaceMode?: boolean;
  datasetName?: string;
  onCancel: () => void;
  onImport: (name: string, columns: string[], rows: Array<Record<string, string>>) => void;
}

export function UploadCsvModal({
  title = 'Upload CSV',
  replaceMode = false,
  datasetName,
  onCancel,
  onImport,
}: UploadCsvModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; columns: string[]; rows: Array<Record<string, string>> } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setDetails(null);
    const text = await file.text();
    const parsed = parseCsvText(text);
    if (!parsed.ok) {
      setError(parsed.error);
      setDetails(parsed.details ?? null);
      setPreview(null);
      return;
    }
    const cleaned = removeEmptyColumns(parsed.columns, parsed.rows.map((r) => {
      const { __rowId, ...rest } = r;
      return rest;
    }));
    setPreview({
      name: file.name.replace(/\.csv$/i, '') || datasetName || 'Dataset',
      columns: cleaned.columns,
      rows: cleaned.rows,
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="upload-csv-title">
      <div className="modal dataset-modal dataset-modal-wide">
        <div className="modal-header">
          <div>
            <h2 id="upload-csv-title">{replaceMode ? `Replace ${datasetName ?? 'Dataset'}` : title}</h2>
            <p className="field-hint">Upload a CSV where each row is a character or item and each column is a trait.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {replaceMode && (
            <p className="import-warning" role="alert">
              This dataset may be used by Mini Game tiles. Replacing it may affect games that use these columns.
            </p>
          )}
          <input ref={fileRef} type="file" accept=".csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }} />
          <div
            className="drop-zone"
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <Upload size={24} aria-hidden="true" />
            <p>Drop CSV file or click to browse</p>
          </div>
          {error && <p role="alert" className="import-error">{error}</p>}
          {details && <p className="field-hint">{details}</p>}
          {preview && (
            <div className="paste-preview">
              <p><strong>{preview.name}</strong> — {preview.rows.length} rows · {preview.columns.length} columns</p>
              <div className="paste-preview-table-wrap">
                <table className="paste-preview-table">
                  <thead>
                    <tr>{preview.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>{preview.columns.map((c) => <td key={c}>{row[c] || '—'}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!preview}
            onClick={() => preview && onImport(preview.name, preview.columns, preview.rows)}
          >
            {replaceMode ? 'Replace Dataset' : 'Import Dataset'}
          </button>
        </div>
      </div>
    </div>
  );
}
