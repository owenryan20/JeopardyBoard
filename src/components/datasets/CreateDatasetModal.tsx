import { useState } from 'react';
import { X } from 'lucide-react';
import type { DatasetKind } from '../../types/dataset';
import { DATASET_TEMPLATES } from '../../lib/datasetTemplates';
import './DatasetModals.css';

interface CreateDatasetModalProps {
  onCancel: () => void;
  onCreate: (name: string, kind: DatasetKind) => void;
}

export function CreateDatasetModal({ onCancel, onCreate }: CreateDatasetModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DatasetKind>('custom');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, kind);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-dataset-title">
      <div className="modal dataset-modal">
        <div className="modal-header">
          <h2 id="create-dataset-title">Create Dataset</h2>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="label" htmlFor="dataset-name">Dataset name</label>
            <input
              id="dataset-name"
              className="input"
              value={name}
              autoFocus
              placeholder="My Character List"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <fieldset className="template-picker">
            <legend className="label">Template</legend>
            {DATASET_TEMPLATES.map((t) => (
              <label key={t.kind} className={`template-option${kind === t.kind ? ' template-option-active' : ''}`}>
                <input
                  type="radio"
                  name="template"
                  value={t.kind}
                  checked={kind === t.kind}
                  onChange={() => setKind(t.kind)}
                />
                <span>
                  <strong>{t.label}</strong>
                  <span className="field-hint">{t.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="field-hint">
            Templates only create helpful starting columns. You can rename, delete, or add columns anytime.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={submit}>
            Create Dataset
          </button>
        </div>
      </div>
    </div>
  );
}
