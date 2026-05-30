export type DatasetKind =
  | 'animeCharacters'
  | 'gameCharacters'
  | 'generalPeople'
  | 'fgoServants'
  | 'custom';

export type DatasetSourceType = 'manual' | 'csv' | 'pasted' | 'backup' | 'livePreset';

export type DatasetColumnType = 'text' | 'number' | 'tags' | 'image' | 'name' | 'hidden';

export type FgoServantsRegion = 'JP' | 'NA';

export interface DatasetSourceMetadata {
  kind: 'atlasAcademyFgoServants';
  label: string;
  url: string;
  lastFetchedAt: string;
  livePreset: boolean;
  sourceVersion?: string;
  region?: FgoServantsRegion;
}

export interface DatasetColumn {
  id: string;
  name: string;
  type: DatasetColumnType;
  width?: number;
  hidden?: boolean;
}

export interface DatasetRow {
  id: string;
  values: Record<string, string>;
}

export interface AppDataset {
  id: string;
  name: string;
  type: DatasetKind;
  sourceType: DatasetSourceType;
  columns: DatasetColumn[];
  rows: DatasetRow[];
  createdAt: string;
  updatedAt: string;
  source?: DatasetSourceMetadata;
  lastFetchedAt?: string;
  lastEditedAt?: string;
  hasLocalEdits?: boolean;
}

export const DATASET_KIND_LABELS: Record<DatasetKind, string> = {
  animeCharacters: 'Anime Characters',
  gameCharacters: 'Game Characters',
  generalPeople: 'General People',
  fgoServants: 'FGO Servants',
  custom: 'Custom',
};

export function isFgoLivePresetDataset(dataset: AppDataset): boolean {
  return dataset.source?.kind === 'atlasAcademyFgoServants' && Boolean(dataset.source.livePreset);
}
