export type DatasetKind = 'animeCharacters' | 'gameCharacters' | 'generalPeople' | 'custom';
export type DatasetSourceType = 'manual' | 'csv' | 'pasted' | 'backup';
export type DatasetColumnType = 'text' | 'number' | 'tags' | 'image' | 'name' | 'hidden';

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
}

export const DATASET_KIND_LABELS: Record<DatasetKind, string> = {
  animeCharacters: 'Anime Characters',
  gameCharacters: 'Game Characters',
  generalPeople: 'General People',
  custom: 'Custom',
};
