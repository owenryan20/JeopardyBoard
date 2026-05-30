import type { QualityCheck } from '../../lib/datasetQuality';
import './DatasetModals.css';

export function DatasetQualityPanel({ checks }: { checks: QualityCheck[] }) {
  return (
    <aside className="dataset-quality card" aria-label="Dataset quality">
      <h3>Dataset Quality</h3>
      <ul className="quality-list">
        {checks.map((check) => (
          <li key={check.label} className={`quality-item quality-${check.level}`}>
            <span aria-hidden="true">{check.icon}</span>
            {check.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
