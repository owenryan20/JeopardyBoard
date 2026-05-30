import { ClipboardPaste, Database, Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateDatasetModal } from '../components/datasets/CreateDatasetModal';
import { DatasetCard } from '../components/datasets/DatasetCard';
import { PasteTableModal } from '../components/datasets/PasteTableModal';
import { UploadCsvModal } from '../components/datasets/UploadCsvModal';
import { useDatasets, notifyDatasetChange } from '../hooks/useDatasets';
import type { DatasetKind } from '../types/dataset';
import { replaceAppDatasetData } from '../lib/datasetStorage';
import './DatasetsPage.css';
import './DashboardPage.css';

export function DatasetsPage() {
  const { datasets, createDataset, duplicateDataset, removeDataset, createFromParsed } = useDatasets();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [replaceId, setReplaceId] = useState<string | null>(null);

  const sorted = datasets.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleCreate = (name: string, kind: DatasetKind) => {
    const ds = createDataset(name, kind);
    setShowCreate(false);
    navigate(`/datasets/${ds.id}`);
  };

  const handleImport = (name: string, columns: string[], rows: Array<Record<string, string>>) => {
    if (replaceId) {
      replaceAppDatasetData(replaceId, columns, rows, 'csv');
      notifyDatasetChange();
      setReplaceId(null);
      setShowUpload(false);
      return;
    }
    const ds = createFromParsed(name, columns, rows, 'csv');
    setShowUpload(false);
    navigate(`/datasets/${ds.id}`);
  };

  const handlePasteImport = (name: string, columns: string[], rows: Array<Record<string, string>>) => {
    const ds = createFromParsed(name, columns, rows, 'pasted');
    setShowPaste(false);
    navigate(`/datasets/${ds.id}`);
  };

  return (
    <div className="page dashboard-page datasets-page">
      <header className="page-header">
        <div>
          <h1>Datasets</h1>
          <p className="page-subtitle">Create or import character data once, then reuse it across Mini Game tiles.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} aria-hidden="true" />
            Create Dataset
          </button>
          <button type="button" className="btn" onClick={() => setShowUpload(true)}>
            <Upload size={16} aria-hidden="true" />
            Upload CSV
          </button>
          <button type="button" className="btn" onClick={() => setShowPaste(true)}>
            <ClipboardPaste size={16} aria-hidden="true" />
            Paste Table
          </button>
        </div>
      </header>

      <p className="datasets-helper field-hint">
        Datasets are saved locally in your browser. Export backups to move them between devices or store them in a GitHub repo.
      </p>

      {sorted.length === 0 ? (
        <div className="empty-state card">
          <Database size={32} aria-hidden="true" />
          <h2>No datasets yet</h2>
          <p>Create a character list, upload a CSV, or paste rows from a spreadsheet. Datasets can be reused across Mini Game tiles.</p>
          <div className="empty-state-actions">
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Dataset</button>
            <button type="button" className="btn" onClick={() => setShowUpload(true)}>Upload CSV</button>
            <button type="button" className="btn" onClick={() => setShowPaste(true)}>Paste Table</button>
          </div>
        </div>
      ) : (
        <div className="dataset-grid">
          {sorted.map((ds) => (
            <DatasetCard
              key={ds.id}
              dataset={ds}
              onDuplicate={duplicateDataset}
              onDelete={removeDataset}
              onReplaceCsv={(id) => { setReplaceId(id); setShowUpload(true); }}
            />
          ))}
        </div>
      )}

      {showCreate && <CreateDatasetModal onCancel={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showUpload && (
        <UploadCsvModal
          replaceMode={Boolean(replaceId)}
          datasetName={replaceId ? datasets.find((d) => d.id === replaceId)?.name : undefined}
          onCancel={() => { setShowUpload(false); setReplaceId(null); }}
          onImport={handleImport}
        />
      )}
      {showPaste && <PasteTableModal onCancel={() => setShowPaste(false)} onImport={handlePasteImport} />}
    </div>
  );
}
