import { Copy, Download, MoreHorizontal, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AppDataset } from '../../types/dataset';
import { DATASET_KIND_LABELS, isFgoLivePresetDataset } from '../../types/dataset';
import { appDatasetToBoardDataset } from '../../lib/datasetConvert';
import { datasetToCsv } from '../../lib/csvParse';
import { downloadFile } from '../../lib/export';
import { formatDatasetUsage, getDatasetUsage } from '../../lib/datasetUsage';
import { formatFetchedAt } from '../../lib/toast';
import { formatFgoExportLabel, formatFgoRegionLabel } from '../../lib/atlasAcademyFgo';
import { FgoRefreshWarningModal } from './FgoServantsModal';
import './DatasetCard.css';
import './FgoServantsModal.css';

interface DatasetCardProps {
  dataset: AppDataset;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReplaceCsv: (id: string) => void;
  onRefreshFgo?: (dataset: AppDataset) => void;
}

export function DatasetCard({
  dataset,
  onDuplicate,
  onDelete,
  onReplaceCsv,
  onRefreshFgo,
}: DatasetCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRefreshWarn, setShowRefreshWarn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const usage = getDatasetUsage(dataset.id);
  const colCount = dataset.columns.filter((c) => !c.hidden).length;
  const isLiveFgo = isFgoLivePresetDataset(dataset);

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

  const startRefresh = () => {
    setMenuOpen(false);
    if (dataset.hasLocalEdits) {
      setShowRefreshWarn(true);
      return;
    }
    onRefreshFgo?.(dataset);
  };

  return (
    <article className="dataset-card-item card">
      <div className="dataset-card-head">
        <div>
          <h3>{dataset.name}</h3>
          <div className="dataset-card-badges">
            <span className="badge badge-minigame">{DATASET_KIND_LABELS[dataset.type]}</span>
            {isLiveFgo && <span className="badge-live">Live preset</span>}
          </div>
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
              {isLiveFgo && onRefreshFgo && (
                <button type="button" className="dropdown-item" onClick={startRefresh}>
                  <RefreshCw size={14} /> Refresh from Atlas Academy
                </button>
              )}
              <button type="button" className="dropdown-item" onClick={() => { onDuplicate(dataset.id); setMenuOpen(false); }}>
                <Copy size={14} /> Duplicate
              </button>
              <button type="button" className="dropdown-item" onClick={exportCsv}>
                <Download size={14} /> Export CSV
              </button>
              {!isLiveFgo && (
                <button type="button" className="dropdown-item" onClick={() => { onReplaceCsv(dataset.id); setMenuOpen(false); }}>
                  <Upload size={14} /> Replace CSV
                </button>
              )}
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
      {isLiveFgo && (
        <p className="dataset-card-source field-hint">
          Source: {dataset.source?.label ?? 'Atlas Academy'}
          {' · '}{formatFgoRegionLabel(dataset.source)}
          {' · '}{formatFgoExportLabel(dataset.source)}
          {dataset.lastFetchedAt ? ` · Last fetched ${formatFetchedAt(dataset.lastFetchedAt)}` : ''}
        </p>
      )}
      <p className="dataset-card-usage">{formatDatasetUsage(usage)}</p>
      <p className="field-hint">Saved locally · Exportable CSV</p>
      <Link to={`/datasets/${dataset.id}`} className="btn btn-sm btn-primary dataset-card-open">
        <Pencil size={14} /> Open / Edit
      </Link>

      {showRefreshWarn && onRefreshFgo && (
        <FgoRefreshWarningModal
          dataset={dataset}
          onCancel={() => setShowRefreshWarn(false)}
          onSaveAsNew={() => {
            setShowRefreshWarn(false);
            onDuplicate(dataset.id);
          }}
          onRefreshAnyway={() => {
            setShowRefreshWarn(false);
            onRefreshFgo(dataset);
          }}
        />
      )}
    </article>
  );
}
