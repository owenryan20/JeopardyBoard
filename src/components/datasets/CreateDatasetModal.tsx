import { useState } from 'react';
import { X } from 'lucide-react';
import type { DatasetKind } from '../../types/dataset';
import { DATASET_TEMPLATES } from '../../lib/datasetTemplates';
import { FGO_SERVANTS_SOURCE_LABEL } from '../../lib/fgoServantsPreset';
import './DatasetModals.css';
import './FgoServantsModal.css';

export type CreateDatasetSelection =
  | { type: 'template'; name: string; kind: DatasetKind }
  | { type: 'fgoLivePreset' };

interface CreateDatasetModalProps {
  onCancel: () => void;
  onCreate: (name: string, kind: DatasetKind) => void;
  onFetchFgo?: () => void;
}

export function CreateDatasetModal({ onCancel, onCreate, onFetchFgo }: CreateDatasetModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DatasetKind>('custom');
  const [selected, setSelected] = useState<'template' | 'fgo'>('template');

  const submit = () => {
    if (selected === 'fgo') {
      onFetchFgo?.();
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, kind);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-dataset-title">
      <div className="modal dataset-modal dataset-modal-wide">
        <div className="modal-header">
          <h2 id="create-dataset-title">Create Dataset</h2>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {selected === 'template' && (
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
          )}

          <fieldset className="template-picker">
            <legend className="label">Template</legend>
            {DATASET_TEMPLATES.map((t) => (
              <label
                key={t.kind}
                className={`template-option${selected === 'template' && kind === t.kind ? ' template-option-active' : ''}`}
              >
                <input
                  type="radio"
                  name="template"
                  value={t.kind}
                  checked={selected === 'template' && kind === t.kind}
                  onChange={() => {
                    setSelected('template');
                    setKind(t.kind);
                  }}
                />
                <span>
                  <strong>{t.label}</strong>
                  <span className="field-hint">{t.description}</span>
                </span>
              </label>
            ))}

            <label
              className={`template-option template-option-live${selected === 'fgo' ? ' template-option-active' : ''}`}
            >
              <input
                type="radio"
                name="template"
                value="fgo"
                checked={selected === 'fgo'}
                onChange={() => setSelected('fgo')}
              />
              <span>
                <strong>
                  FGO Servants
                  <span className="badge-live">Live preset</span>
                </strong>
                <span className="field-hint">Fetches up-to-date servant data from Atlas Academy. Choose JP or NA when fetching.</span>
                <span className="fgo-preset-detail">
                  Includes class, rarity, traits, stats, face images, NP info, skills, illustrator, and voice actor when available.
                </span>
                <span className="fgo-preset-detail">Source: {FGO_SERVANTS_SOURCE_LABEL}</span>
              </span>
            </label>
          </fieldset>

          <p className="field-hint">
            {selected === 'fgo'
              ? 'Saved locally after import. Refresh anytime to fetch the latest servant data.'
              : 'Templates only create helpful starting columns. You can rename, delete, or add columns anytime.'}
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          {selected === 'fgo' ? (
            <button type="button" className="btn btn-primary" onClick={submit}>
              Fetch FGO Servants
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={submit}>
              Create Dataset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
