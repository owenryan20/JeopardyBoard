import type { AppDataset } from '../types/dataset';
import { findDuplicateNames } from './csvParse';
import { appDatasetToBoardDataset, getImageColumn, getNameColumn } from './datasetConvert';

export type QualityLevel = 'ok' | 'warn' | 'info';

export interface QualityCheck {
  level: QualityLevel;
  icon: string;
  label: string;
}

export function getDatasetQualityChecks(dataset: AppDataset): QualityCheck[] {
  const checks: QualityCheck[] = [];
  const boardForm = appDatasetToBoardDataset(dataset);
  const nameCol = getNameColumn(dataset);
  const imageCol = getImageColumn(dataset);

  if (nameCol) {
    checks.push({ level: 'ok', icon: '✓', label: 'Name field detected' });
  } else {
    checks.push({ level: 'warn', icon: '⚠', label: 'No name field detected' });
  }

  if (imageCol) {
    checks.push({ level: 'ok', icon: '✓', label: 'Image field detected' });
  } else {
    checks.push({ level: 'info', icon: '·', label: 'No image field (optional)' });
  }

  checks.push({
    level: 'ok',
    icon: '✓',
    label: `${dataset.rows.length} row${dataset.rows.length === 1 ? '' : 's'} found`,
  });
  checks.push({
    level: 'ok',
    icon: '✓',
    label: `${dataset.columns.filter((c) => !c.hidden).length} column${dataset.columns.length === 1 ? '' : 's'} found`,
  });

  if (imageCol) {
    const missingImages = dataset.rows.filter((r) => !(r.values[imageCol.name] ?? '').trim()).length;
    if (missingImages > 0) {
      checks.push({
        level: 'warn',
        icon: '⚠',
        label: `${missingImages} row${missingImages === 1 ? '' : 's'} missing images`,
      });
    }
  }

  if (nameCol) {
    const dupes = findDuplicateNames(boardForm.rows, nameCol.name);
    if (dupes.length > 0) {
      checks.push({
        level: 'warn',
        icon: '⚠',
        label: `${dupes.length} duplicate name${dupes.length === 1 ? '' : 's'} found`,
      });
    }
  }

  for (const col of dataset.columns.filter((c) => c.type === 'number')) {
    const values = dataset.rows.map((r) => r.values[col.name] ?? '').filter(Boolean);
    const numeric = values.filter((v) => !Number.isNaN(parseFloat(v.replace(/[^\d.-]/g, ''))));
    if (values.length > 0 && numeric.length > 0 && numeric.length < values.length) {
      checks.push({ level: 'warn', icon: '⚠', label: `${col.name} has mixed values` });
    }
  }

  for (const col of dataset.columns.filter((c) => c.type === 'tags')) {
    const separators = new Set<string>();
    for (const row of dataset.rows) {
      const val = row.values[col.name] ?? '';
      if (val.includes('|')) separators.add('|');
      if (val.includes(',')) separators.add(',');
      if (val.includes(';')) separators.add(';');
      if (val.includes('/')) separators.add('/');
    }
    if (separators.size > 1) {
      checks.push({ level: 'warn', icon: '⚠', label: 'Tags use inconsistent separators' });
      break;
    }
  }

  const emptyRows = dataset.rows.filter((row) =>
    dataset.columns.every((col) => !(row.values[col.name] ?? '').trim()),
  ).length;
  if (emptyRows > 0) {
    checks.push({ level: 'warn', icon: '⚠', label: `${emptyRows} empty row${emptyRows === 1 ? '' : 's'}` });
  }

  const emptyColumns = dataset.columns.filter(
    (col) => !dataset.rows.some((row) => (row.values[col.name] ?? '').trim()),
  );
  if (emptyColumns.length > 0) {
    checks.push({
      level: 'warn',
      icon: '⚠',
      label: `${emptyColumns.length} empty column${emptyColumns.length === 1 ? '' : 's'}`,
    });
  }

  return checks;
}
