import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type { AppDataset, FgoServantsRegion } from '../../types/dataset';
import {
  fetchAtlasAcademyServants,
  formatFgoExportLabel,
  formatFgoRegionLabel,
  summarizeFgoRefresh,
  transformAtlasAcademyServants,
  type FgoTransformResult,
  type FgoRefreshSummary,
} from '../../lib/atlasAcademyFgo';
import {
  defaultFgoDatasetName,
  findExistingFgoDataset,
  saveFgoServantsAsNewDataset,
  saveFgoServantsDataset,
} from '../../lib/datasetStorage';
import {
  FGO_LARGE_DATASET_THRESHOLD,
  FGO_PREVIEW_COLUMNS,
  FGO_PREVIEW_ROW_LIMIT,
  FGO_REGION_OPTIONS,
  FGO_SERVANTS_SOURCE_LABEL,
  FGO_TAG_PREVIEW_COLUMNS,
  getFgoRegionConfig,
  inferFgoRegionFromSource,
} from '../../lib/fgoServantsPreset';
import { formatFetchedAt } from '../../lib/toast';
import './DatasetModals.css';
import './FgoServantsModal.css';

type ModalMode = 'create' | 'refresh' | 'refreshConfirm';

type Step = 'chooseRegion' | 'fetch' | 'error' | 'preview' | 'refreshSummary';

interface FgoServantsModalProps {
  onCancel: () => void;
  onSaved: (dataset: AppDataset, saveMode: 'library' | 'minigame') => void;
  fromMiniGame?: boolean;
  existingDataset?: AppDataset;
  mode?: ModalMode;
}

export function FgoServantsModal({
  onCancel,
  onSaved,
  fromMiniGame = false,
  existingDataset,
  mode = 'create',
}: FgoServantsModalProps) {
  const isRefresh = mode === 'refresh' || mode === 'refreshConfirm' || Boolean(existingDataset);
  const initialRegion = inferFgoRegionFromSource(existingDataset?.source);

  const [region, setRegion] = useState<FgoServantsRegion>(initialRegion);
  const [step, setStep] = useState<Step>(isRefresh ? 'fetch' : 'chooseRegion');
  const [loading, setLoading] = useState(isRefresh && mode !== 'refreshConfirm');
  const [errorMessage, setErrorMessage] = useState('');
  const [invalidShape, setInvalidShape] = useState(false);
  const [transform, setTransform] = useState<FgoTransformResult | null>(null);
  const [fetchedAt, setFetchedAt] = useState('');
  const [datasetName, setDatasetName] = useState(
    defaultFgoDatasetName(initialRegion, existingDataset),
  );
  const [refreshSummary, setRefreshSummary] = useState<FgoRefreshSummary | null>(null);

  const regionConfig = getFgoRegionConfig(region);
  const cachedDataset = findExistingFgoDataset(region);

  const runFetch = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    setInvalidShape(false);
    setStep('fetch');

    const result = await fetchAtlasAcademyServants(region);
    setLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      setInvalidShape(Boolean(result.invalidShape));
      setStep('error');
      return;
    }

    const transformed = transformAtlasAcademyServants(result.servants);
    setTransform(transformed);
    setFetchedAt(result.fetchedAt);

    if (isRefresh && existingDataset) {
      setRefreshSummary(summarizeFgoRefresh(existingDataset, transformed, result.fetchedAt));
      setStep('refreshSummary');
      return;
    }

    setStep('preview');
  }, [existingDataset, isRefresh, region]);

  useEffect(() => {
    if (!isRefresh || mode === 'refreshConfirm') return;
    void runFetch();
  }, [isRefresh, mode, runFetch]);

  const handleRegionChange = (next: FgoServantsRegion) => {
    setRegion(next);
    if (!existingDataset) {
      setDatasetName(defaultFgoDatasetName(next));
    }
  };

  const handleUseLocalCopy = () => {
    const local = existingDataset ?? cachedDataset;
    if (!local) return;
    onSaved(local, fromMiniGame ? 'minigame' : 'library');
  };

  const handleSave = (asNew = false) => {
    if (!transform) return;
    const name = datasetName.trim() || regionConfig.defaultDatasetName;
    const dataset = asNew || !existingDataset
      ? saveFgoServantsAsNewDataset(asNew ? `${name} (Refreshed)` : name, transform, fetchedAt, region)
      : saveFgoServantsDataset(name, transform, fetchedAt, region, existingDataset.id);
    onSaved(dataset, fromMiniGame ? 'minigame' : 'library');
  };

  const handleRefreshUpdate = () => {
    if (!transform || !existingDataset) return;
    const dataset = saveFgoServantsDataset(
      existingDataset.name,
      transform,
      fetchedAt,
      region,
      existingDataset.id,
    );
    onSaved(dataset, 'library');
  };

  const hasCachedCopy = Boolean(existingDataset ?? cachedDataset);
  const sourceMeta = { region, sourceVersion: regionConfig.sourceVersion };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="fgo-modal-title">
      <div className="modal dataset-modal dataset-modal-wide fgo-servants-modal">
        <div className="modal-header">
          <div>
            <h2 id="fgo-modal-title">FGO Servants</h2>
            <p className="fgo-modal-subtitle">
              Source: {FGO_SERVANTS_SOURCE_LABEL}
              {' · '}
              {formatFgoRegionLabel(sourceMeta)}
              {' · '}
              <a href={regionConfig.url} target="_blank" rel="noreferrer" className="fgo-source-link">
                View source <ExternalLink size={12} />
              </a>
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {step === 'chooseRegion' && (
            <div className="fgo-region-step">
              <p className="field-hint">Choose which Atlas Academy server export to fetch.</p>
              <fieldset className="template-picker fgo-region-picker">
                <legend className="label">Server region</legend>
                {FGO_REGION_OPTIONS.map((option) => (
                  <label
                    key={option.region}
                    className={`template-option template-option-live${region === option.region ? ' template-option-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="fgo-region"
                      value={option.region}
                      checked={region === option.region}
                      onChange={() => handleRegionChange(option.region)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <span className="field-hint">{option.helperText}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <p className="field-hint">
                Saved locally after import. Refresh anytime to fetch the latest servant data.
              </p>
            </div>
          )}

          {step === 'fetch' && loading && (
            <div className="fgo-fetch-state">
              <div className="fgo-spinner" aria-hidden="true" />
              <p>Fetching latest FGO servant data from Atlas Academy ({regionConfig.label})…</p>
            </div>
          )}

          {step === 'error' && (
            <div className="fgo-fetch-state fgo-fetch-error">
              <p>{errorMessage}</p>
              {hasCachedCopy ? (
                <p className="field-hint">You can retry, or use the saved local copy.</p>
              ) : invalidShape ? (
                <p className="field-hint">The response did not match the expected servant list format.</p>
              ) : (
                <p className="field-hint">Connect to the internet and try again.</p>
              )}
              <div className="fgo-action-row">
                <button type="button" className="btn btn-primary" onClick={() => void runFetch()}>Retry</button>
                {hasCachedCopy && (
                  <button type="button" className="btn" onClick={handleUseLocalCopy}>Use local copy</button>
                )}
                <button type="button" className="btn" onClick={onCancel}>Cancel</button>
              </div>
            </div>
          )}

          {step === 'preview' && transform && (
            <div className="fgo-preview-layout">
              <div className="fgo-preview-static">
                <p className="fgo-success-banner">Fetched latest servant data.</p>
                <div className="fgo-preview-meta">
                  <div className="field">
                    <label className="label" htmlFor="fgo-dataset-name">Dataset name</label>
                    <input
                      id="fgo-dataset-name"
                      className="input"
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                    />
                  </div>
                  <dl className="fgo-preview-stats">
                    <div><dt>Source</dt><dd>{FGO_SERVANTS_SOURCE_LABEL}</dd></div>
                    <div><dt>Region</dt><dd>{formatFgoRegionLabel(sourceMeta)}</dd></div>
                    <div><dt>Export type</dt><dd>{formatFgoExportLabel(sourceMeta)}</dd></div>
                    <div><dt>Last fetched</dt><dd>{formatFetchedAt(fetchedAt)}</dd></div>
                    <div><dt>Rows</dt><dd>{transform.rows.length}</dd></div>
                    <div><dt>Columns</dt><dd>{transform.columns.length}</dd></div>
                  </dl>
                  <p className="field-hint">
                    Saved locally after import. Refresh anytime to fetch the latest servant data.
                  </p>
                </div>

                {transform.duplicateNames.length > 0 && (
                  <div className="import-warning">
                    Duplicate names detected ({transform.duplicateNames.length}). Search uses Class, Rarity, and Attribute to disambiguate.
                  </div>
                )}
                {transform.missingImageCount > 0 && (
                  <div className="import-warning">
                    {transform.missingImageCount} servant{transform.missingImageCount === 1 ? '' : 's'} missing face images.
                  </div>
                )}
              </div>

              <FgoPreviewTable transform={transform} />
            </div>
          )}

          {step === 'refreshSummary' && transform && refreshSummary && (
            <div className="fgo-preview-layout">
              <div className="fgo-preview-static">
                <h3 className="fgo-refresh-title">Refresh from Atlas Academy?</h3>
                <p className="field-hint">
                  Region: {formatFgoRegionLabel(existingDataset?.source ?? sourceMeta)}
                </p>
                {existingDataset?.hasLocalEdits && (
                  <div className="import-warning">
                    This dataset has local edits. Refreshing may replace changed values.
                  </div>
                )}
                <dl className="fgo-preview-stats">
                  <div><dt>Current rows</dt><dd>{refreshSummary.currentRowCount}</dd></div>
                  <div><dt>New rows</dt><dd>{refreshSummary.newRowCount}</dd></div>
                  <div><dt>New servants</dt><dd>{refreshSummary.addedCount}</dd></div>
                  <div><dt>Updated servants</dt><dd>{refreshSummary.updatedCount}</dd></div>
                  <div><dt>Removed servants</dt><dd>{refreshSummary.removedCount}</dd></div>
                  <div><dt>Last fetched</dt><dd>{formatFetchedAt(refreshSummary.lastFetchedAt)}</dd></div>
                  <div><dt>New fetch</dt><dd>{formatFetchedAt(refreshSummary.newFetchedAt)}</dd></div>
                </dl>
                <p className="field-hint">Local data will be updated when you choose Update Dataset.</p>
              </div>
              <FgoPreviewTable transform={transform} compact />
            </div>
          )}
        </div>

        {step === 'chooseRegion' && (
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => void runFetch()}>
              Fetch FGO Servants
            </button>
          </div>
        )}

        {step === 'preview' && transform && (
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => handleSave(false)}>
              {fromMiniGame ? 'Save & Use in Mini Game' : 'Save Dataset'}
            </button>
          </div>
        )}

        {step === 'refreshSummary' && transform && (
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn" onClick={() => handleSave(true)}>Save as New Dataset</button>
            <button type="button" className="btn btn-primary" onClick={handleRefreshUpdate}>Update Dataset</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FgoPreviewTable({ transform, compact = false }: { transform: FgoTransformResult; compact?: boolean }) {
  const isLarge = transform.rows.length > FGO_LARGE_DATASET_THRESHOLD;
  const previewRows = transform.rows.slice(0, compact ? 8 : FGO_PREVIEW_ROW_LIMIT);

  return (
    <div className="fgo-preview-table-wrap">
      {isLarge && !compact && (
        <p className="field-hint fgo-large-hint">
          Showing {previewRows.length} of {transform.rows.length} servants. All rows will be saved.
        </p>
      )}
      <div className="paste-preview-table-wrap">
        <table className="paste-preview-table fgo-preview-table">
          <thead>
            <tr>
              {FGO_PREVIEW_COLUMNS.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr key={row.id}>
                {FGO_PREVIEW_COLUMNS.map((col) => (
                  <td key={col}>
                    <FgoPreviewCell column={col} value={row.values[col] ?? ''} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FgoPreviewCell({ column, value }: { column: string; value: string }) {
  const [imgError, setImgError] = useState(false);

  if (column === 'Face Image') {
    if (!value) return <span className="fgo-missing-img">—</span>;
    if (imgError) return <span className="fgo-missing-img">Unavailable</span>;
    return <img src={value} alt="" className="fgo-face-thumb" onError={() => setImgError(true)} />;
  }

  if (FGO_TAG_PREVIEW_COLUMNS.has(column) && value) {
    return (
      <div className="fgo-tag-chips">
        {value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4).map((tag) => (
          <span key={tag} className="badge badge-tag">{tag}</span>
        ))}
      </div>
    );
  }

  if (column === 'Rarity' || column === 'Max ATK' || column === 'Max HP') {
    return <span className="fgo-num">{value || '—'}</span>;
  }

  return value || '—';
}

interface FgoRefreshWarningModalProps {
  dataset: AppDataset;
  onCancel: () => void;
  onSaveAsNew: () => void;
  onRefreshAnyway: () => void;
}

export function FgoRefreshWarningModal({
  onCancel,
  onSaveAsNew,
  onRefreshAnyway,
}: FgoRefreshWarningModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="fgo-refresh-warn-title">
      <div className="modal dataset-modal">
        <div className="modal-header">
          <h2 id="fgo-refresh-warn-title">Refresh from Atlas Academy?</h2>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p>This dataset has local edits. Refreshing may replace changed values.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn" onClick={onSaveAsNew}>Save as New Dataset</button>
          <button type="button" className="btn btn-primary" onClick={onRefreshAnyway}>Refresh Anyway</button>
        </div>
      </div>
    </div>
  );
}
