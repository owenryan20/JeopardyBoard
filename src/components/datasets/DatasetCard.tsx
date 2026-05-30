import { Copy, Download, MoreHorizontal, Pencil, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AppDataset } from '../../types/dataset';
import { DATASET_KIND_LABELS } from '../../types/dataset';
import { appDatasetToBoardDataset } from '../../lib/datasetConvert';
import { datasetToCsv } from '../../lib/csvParse';
import { downloadFile } from '../../lib/export';
import { formatDatasetUsage, getDatasetUsage } from '../../lib/datasetUsage';
import './DatasetCard.css';

interface DatasetCardProps {
  dataset: AppDataset;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReplaceCsv: (id: string) => void;
}

export function DatasetCard({ dataset, onDuplicate, onDelete, onReplaceCsv }: DatasetCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const usage = getDatasetUsage(dataset.id);
  const colCount = dataset.columns.filter((c) => !c.hidden).length;

  const exportCsv = () => {
    const csv = datasetToCsv(appDatasetToBoardDataset(dataset));
    const safe = dataset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'dataset';
    downloadFile(csv, `${safe}.csv`, 'text/csv');
    setMenuOpen(false);
  };

  const handleDelete = () => {
    if (usage.miniGameCount > 0) {
      if (!window.confirm(`This dataset is used by ${usage.miniGameCount} Mini Game tile(s). Deleting it will make those tiles need a replacement dataset before they can be played. Delete anyway?`)) {
        return;
      }
    } else if (!window.confirm(`Delete "${dataset.name}"?`)) {
      return;
    }
    onDelete(dataset.id);
  };

  return (
    <article className="dataset-card-item card">
      <div className="dataset-card-head">
        <div>
          <h3>{dataset.name}</h3>
          <span className="badge badge-minigame">{DATASET_KIND_LABELS[dataset.type]}</span>
        </div>
        <div className="dropdown" ref={menuRef}>
          <button type="button" className="btn btn-icon btn-sm" aria-label="More actions" onClick={() => setMenuOpen((o) => !o)}>
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <Link to={`/datasets/${dataset.id}`} className="dropdown-item" onClick={() => setMenuOpen(false)}>
                <Pencil size={14} /> Open / Edit
              </Link>
              <button type="button" className="dropdown-item" onClick={() => { onDuplicate(dataset.id); setMenuOpen(false); }}>
                <Copy size={14} /> Duplicate
              </button>
              <button type="button" className="dropdown-item" onClick={exportCsv}>
                <Download size={14} /> Export CSV
              </button>
              <button type="button" className="dropdown-item" onClick={() => { onReplaceCsv(dataset.id); setMenuOpen(false); }}>
                <Upload size={14} /> Replace CSV
              </button>
              <button type="button" className="dropdown-item dropdown-item-danger" onClick={handleDelete}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <dl className="dataset-card-meta">
        <div><dt>Rows</dt><dd>{dataset.rows.length}</dd></div>
        <div><dt>Columns</dt><dd>{colCount}</dd></div>
        <div><dt>Updated</dt><dd>{new Date(dataset.updatedAt).toLocaleDateString()}</dd></div>
      </dl>
      <p className="dataset-card-usage">{formatDatasetUsage(usage)}</p>
      <p className="field-hint">Saved locally · Exportable CSV</p>
      <Link to={`/datasets/${dataset.id}`} className="btn btn-sm btn-primary dataset-card-open">
        <Pencil size={14} /> Open / Edit
      </Link>
    </article>
  );
}
