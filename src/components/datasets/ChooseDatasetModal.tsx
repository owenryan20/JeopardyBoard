import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { AppDataset } from '../../types/dataset';
import { DATASET_KIND_LABELS } from '../../types/dataset';
import { formatDatasetUsage, getDatasetUsage } from '../../lib/datasetUsage';
import './DatasetModals.css';

interface ChooseDatasetModalProps {
  datasets: AppDataset[];
  selectedId?: string;
  onCancel: () => void;
  onSelect: (dataset: AppDataset) => void;
}

export function ChooseDatasetModal({ datasets, selectedId, onCancel, onSelect }: ChooseDatasetModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return datasets;
    return datasets.filter((d) => d.name.toLowerCase().includes(q));
  }, [datasets, query]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="choose-dataset-title">
      <div className="modal dataset-modal">
        <div className="modal-header">
          <h2 id="choose-dataset-title">Choose Dataset</h2>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="sr-only" htmlFor="choose-dataset-search">Search datasets</label>
            <div className="search-input-wrap">
              <Search size={16} aria-hidden="true" />
              <input
                id="choose-dataset-search"
                className="input"
                placeholder="Search datasets…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <ul className="choose-dataset-list">
            {filtered.length === 0 ? (
              <li className="choose-dataset-empty">No datasets found.</li>
            ) : (
              filtered.map((ds) => {
                const usage = getDatasetUsage(ds.id);
                return (
                  <li key={ds.id}>
                    <button
                      type="button"
                      className={`choose-dataset-item${selectedId === ds.id ? ' choose-dataset-item-selected' : ''}`}
                      onClick={() => onSelect(ds)}
                    >
                      <strong>{ds.name}</strong>
                      <span className="badge badge-tag">{DATASET_KIND_LABELS[ds.type]}</span>
                      <span className="field-hint">
                        {ds.rows.length} rows · {ds.columns.filter((c) => !c.hidden).length} columns · {formatDatasetUsage(usage)}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
