import type { Board } from '../types/board';
import type { AppDataset, DatasetKind, DatasetSourceMetadata, DatasetSourceType } from '../types/dataset';
import { isFgoLivePresetDataset } from '../types/dataset';
import { buildFgoAppDataset, type FgoTransformResult } from './atlasAcademyFgo';
import { boardDatasetToAppDataset, createColumn, appDatasetToBoardDataset } from './datasetConvert';
import { getTemplate } from './datasetTemplates';
import type { FgoServantsRegion } from '../types/dataset';
import { inferFgoRegionFromSource, getFgoRegionConfig } from './fgoServantsPreset';
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

function normalizeSource(raw: Partial<DatasetSourceMetadata> | undefined): DatasetSourceMetadata | undefined {
  if (!raw?.kind) return undefined;
  return {
    kind: raw.kind,
    label: raw.label ?? 'Unknown',
    url: raw.url ?? '',
    lastFetchedAt: raw.lastFetchedAt ?? new Date().toISOString(),
    livePreset: Boolean(raw.livePreset),
    sourceVersion: raw.sourceVersion,
    region: raw.region,
  };
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
    source: normalizeSource(raw.source),
    lastFetchedAt: raw.lastFetchedAt ?? raw.source?.lastFetchedAt,
    lastEditedAt: raw.lastEditedAt,
    hasLocalEdits: Boolean(raw.hasLocalEdits),
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

export function findExistingFgoDataset(region?: FgoServantsRegion): AppDataset | undefined {
  const datasets = loadDatasetsRaw().filter((d) => isFgoLivePresetDataset(d));
  if (region) {
    return datasets.find((d) => inferFgoRegionFromSource(d.source) === region);
  }
  return datasets[0];
}

export function duplicateAppDataset(id: string): AppDataset | null {
  const source = getAppDataset(id);
  if (!source) return null;
  const now = new Date().toISOString();
  const isFgo = isFgoLivePresetDataset(source);
  const copy: AppDataset = {
    ...JSON.parse(JSON.stringify(source)) as AppDataset,
    id: createId(),
    name: isFgo ? 'FGO Servants Copy' : `${source.name} (Copy)`,
    type: isFgo ? 'custom' : source.type,
    sourceType: isFgo ? 'manual' : source.sourceType,
    createdAt: now,
    updatedAt: now,
    source: undefined,
    lastFetchedAt: undefined,
    hasLocalEdits: false,
    lastEditedAt: undefined,
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

export function saveFgoServantsDataset(
  name: string,
  transform: FgoTransformResult,
  fetchedAt: string,
  region: FgoServantsRegion,
  existingId?: string,
): AppDataset {
  const partial = buildFgoAppDataset(name, transform, fetchedAt, region, existingId);
  const existing = existingId ? getAppDataset(existingId) : undefined;
  const dataset: AppDataset = {
    ...partial,
    createdAt: existing?.createdAt ?? partial.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return upsertAppDataset(dataset);
}

export function saveFgoServantsAsNewDataset(
  name: string,
  transform: FgoTransformResult,
  fetchedAt: string,
  region: FgoServantsRegion,
): AppDataset {
  return saveFgoServantsDataset(name, transform, fetchedAt, region);
}

export function defaultFgoDatasetName(
  region: FgoServantsRegion = 'JP',
  existing?: AppDataset,
): string {
  if (existing?.name) return existing.name;
  return getFgoRegionConfig(region).defaultDatasetName;
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
        global.push(boardDatasetToAppDataset(ds, ds.type ?? 'custom', 'backup'));
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
    hasLocalEdits: true,
    lastEditedAt: new Date().toISOString(),
  });
}

export function markDatasetEdited(id: string): void {
  const existing = getAppDataset(id);
  if (!existing) return;
  upsertAppDataset({
    ...existing,
    hasLocalEdits: true,
    lastEditedAt: new Date().toISOString(),
  });
}
