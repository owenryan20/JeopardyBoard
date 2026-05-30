import type { Board } from '../types/board';
import type { AppDataset, DatasetKind, DatasetSourceType } from '../types/dataset';
import { boardDatasetToAppDataset, createColumn, appDatasetToBoardDataset } from './datasetConvert';
import { getTemplate } from './datasetTemplates';
import { createId } from './ids';
import { loadBoards } from './storage';

const DATASETS_KEY = 'jeff-hardy-datasets';

let migrationDone = false;

function loadDatasetsRaw(): AppDataset[] {
  try {
    const raw = localStorage.getItem(DATASETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppDataset[];
    return Array.isArray(parsed) ? parsed.map(normalizeDataset) : [];
  } catch {
    return [];
  }
}

function normalizeDataset(raw: Partial<AppDataset> & { id: string }): AppDataset {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    name: raw.name ?? 'Dataset',
    type: raw.type ?? 'custom',
    sourceType: raw.sourceType ?? 'manual',
    columns: Array.isArray(raw.columns)
      ? raw.columns.map((c) => ({
          id: c.id || createId(),
          name: c.name,
          type: c.type ?? 'text',
          width: c.width,
          hidden: Boolean(c.hidden),
        }))
      : [],
    rows: Array.isArray(raw.rows)
      ? raw.rows.map((r) => ({
          id: r.id || createId(),
          values: r.values ?? {},
        }))
      : [],
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}

export function saveDatasets(datasets: AppDataset[]): void {
  localStorage.setItem(DATASETS_KEY, JSON.stringify(datasets));
}

export function loadDatasets(): AppDataset[] {
  ensureMigration();
  return loadDatasetsRaw();
}

export function getAppDataset(id: string): AppDataset | undefined {
  return loadDatasets().find((d) => d.id === id);
}

export function upsertAppDataset(dataset: AppDataset): AppDataset {
  const datasets = loadDatasetsRaw();
  const updated = { ...dataset, updatedAt: new Date().toISOString() };
  const index = datasets.findIndex((d) => d.id === dataset.id);
  if (index >= 0) datasets[index] = updated;
  else datasets.push(updated);
  saveDatasets(datasets);
  return updated;
}

export function deleteAppDataset(id: string): void {
  saveDatasets(loadDatasetsRaw().filter((d) => d.id !== id));
}

export function duplicateAppDataset(id: string): AppDataset | null {
  const source = getAppDataset(id);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: AppDataset = {
    ...JSON.parse(JSON.stringify(source)) as AppDataset,
    id: createId(),
    name: `${source.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    columns: source.columns.map((c) => ({ ...c, id: createId() })),
    rows: source.rows.map((r) => ({ ...r, id: createId() })),
  };
  return upsertAppDataset(copy);
}

export function createAppDataset(
  name: string,
  kind: DatasetKind,
  sourceType: DatasetSourceType = 'manual',
): AppDataset {
  const template = getTemplate(kind);
  const now = new Date().toISOString();
  const columns = template.columns.map((c) => createColumn(c.name, c.type));
  const dataset: AppDataset = {
    id: createId(),
    name,
    type: kind,
    sourceType,
    columns,
    rows: [],
    createdAt: now,
    updatedAt: now,
  };
  return upsertAppDataset(dataset);
}

export function createAppDatasetFromParsed(
  name: string,
  columnNames: string[],
  rows: Array<Record<string, string>>,
  sourceType: DatasetSourceType,
  kind: DatasetKind = 'custom',
): AppDataset {
  const samplesByColumn = new Map<string, string[]>();
  for (const col of columnNames) {
    samplesByColumn.set(col, rows.slice(0, 5).map((r) => r[col] ?? '').filter(Boolean));
  }
  const columns = columnNames.map((name) => createColumn(name, undefined, samplesByColumn.get(name) ?? []));
  const datasetRows = rows.map((values) => {
    const rowValues: Record<string, string> = {};
    for (const col of columnNames) rowValues[col] = values[col] ?? '';
    return { id: createId(), values: rowValues };
  });
  const now = new Date().toISOString();
  return upsertAppDataset({
    id: createId(),
    name,
    type: kind,
    sourceType,
    columns,
    rows: datasetRows,
    createdAt: now,
    updatedAt: now,
  });
}

export function ensureMigration(): void {
  if (migrationDone) return;
  migrationDone = true;

  const boards = loadBoards();
  const global = loadDatasetsRaw();
  const globalIds = new Set(global.map((d) => d.id));
  let globalChanged = false;

  for (const board of boards) {
    for (const ds of board.datasets ?? []) {
      if (!globalIds.has(ds.id)) {
        global.push(boardDatasetToAppDataset(ds, 'custom', 'backup'));
        globalIds.add(ds.id);
        globalChanged = true;
      }
    }
  }

  if (globalChanged) saveDatasets(global);
}

export function collectDatasetIdsFromBoard(board: Board): string[] {
  const ids = new Set<string>();
  for (const cat of board.categories) {
    for (const clue of cat.clues) {
      if (clue.miniGame?.datasetId) ids.add(clue.miniGame.datasetId);
    }
  }
  for (const ds of board.datasets ?? []) ids.add(ds.id);
  return [...ids];
}

export function syncBoardDatasetsForExport(board: Board): Board {
  const ids = collectDatasetIdsFromBoard(board);
  const embedded = new Map((board.datasets ?? []).map((d) => [d.id, d]));
  for (const id of ids) {
    if (!embedded.has(id)) {
      const global = getAppDataset(id);
      if (global) {
        embedded.set(id, appDatasetToBoardDataset(global));
      }
    }
  }
  return { ...board, datasets: [...embedded.values()] };
}

export function replaceAppDatasetData(
  id: string,
  columnNames: string[],
  rows: Array<Record<string, string>>,
  sourceType: DatasetSourceType = 'csv',
): AppDataset | null {
  const existing = getAppDataset(id);
  if (!existing) return null;

  const samplesByColumn = new Map<string, string[]>();
  for (const col of columnNames) {
    samplesByColumn.set(col, rows.slice(0, 5).map((r) => r[col] ?? '').filter(Boolean));
  }

  const columns = columnNames.map((name) => {
    const prev = existing.columns.find((c) => c.name === name);
    return prev ?? createColumn(name, undefined, samplesByColumn.get(name) ?? []);
  });

  const datasetRows = rows.map((values) => {
    const rowValues: Record<string, string> = {};
    for (const col of columnNames) rowValues[col] = values[col] ?? '';
    return { id: createId(), values: rowValues };
  });

  return upsertAppDataset({
    ...existing,
    sourceType,
    columns,
    rows: datasetRows,
    updatedAt: new Date().toISOString(),
  });
}
