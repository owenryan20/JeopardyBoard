import type { DatasetColumnType, FgoServantsRegion } from '../types/dataset';

export type { FgoServantsRegion };

export interface FgoRegionConfig {
  region: FgoServantsRegion;
  label: string;
  url: string;
  sourceVersion: string;
  exportLabel: string;
  defaultDatasetName: string;
  helperText: string;
}

export const FGO_SERVANTS_DEFAULT_NAME = 'FGO Servants';

export const FGO_SERVANTS_SOURCE_LABEL = 'Atlas Academy';

export const FGO_SERVANTS_EXPORT_LABEL = 'nice servant export';

export const FGO_REGION_OPTIONS: FgoRegionConfig[] = [
  {
    region: 'JP',
    label: 'JP (English)',
    url: 'https://api.atlasacademy.io/export/JP/nice_servant_lang_en.json',
    sourceVersion: 'nice_servant_lang_en',
    exportLabel: 'nice servant export (JP, English)',
    defaultDatasetName: 'FGO Servants (JP)',
    helperText: 'Japanese server servant data with English names.',
  },
  {
    region: 'NA',
    label: 'NA',
    url: 'https://api.atlasacademy.io/export/NA/nice_servant.json',
    sourceVersion: 'nice_servant',
    exportLabel: 'nice servant export (NA)',
    defaultDatasetName: 'FGO Servants (NA)',
    helperText: 'North American server servant data.',
  },
];

/** @deprecated Use getFgoRegionConfig('JP').url */
export const FGO_SERVANTS_API_URL = FGO_REGION_OPTIONS[0].url;

/** @deprecated Use getFgoRegionConfig('JP').sourceVersion */
export const FGO_SERVANTS_SOURCE_VERSION = FGO_REGION_OPTIONS[0].sourceVersion;

export function getFgoRegionConfig(region: FgoServantsRegion): FgoRegionConfig {
  return FGO_REGION_OPTIONS.find((r) => r.region === region) ?? FGO_REGION_OPTIONS[0];
}

export function inferFgoRegionFromSource(source?: {
  region?: FgoServantsRegion;
  url?: string;
}): FgoServantsRegion {
  if (source?.region) return source.region;
  if (source?.url?.includes('/NA/')) return 'NA';
  if (source?.url?.includes('/JP/')) return 'JP';
  return 'JP';
}

export interface FgoColumnDef {
  name: string;
  type: DatasetColumnType;
  hidden?: boolean;
}

export const FGO_SERVANTS_COLUMNS: FgoColumnDef[] = [
  { name: 'ID', type: 'hidden', hidden: true },
  { name: 'Collection No.', type: 'hidden', hidden: true },
  { name: 'Name', type: 'name' },
  { name: 'Original Name', type: 'text' },
  { name: 'Class', type: 'text' },
  { name: 'Attribute', type: 'text' },
  { name: 'Rarity', type: 'number' },
  { name: 'Gender', type: 'text' },
  { name: 'Alignment', type: 'text' },
  { name: 'Traits', type: 'tags' },
  { name: 'Max ATK', type: 'number' },
  { name: 'Max HP', type: 'number' },
  { name: 'Cost', type: 'number' },
  { name: 'NP Card', type: 'text' },
  { name: 'NP Type', type: 'text' },
  { name: 'NP Name', type: 'text' },
  { name: 'Deck', type: 'text' },
  { name: 'Skills', type: 'tags' },
  { name: 'Passive Skills', type: 'tags' },
  { name: 'Illustrator', type: 'text' },
  { name: 'Voice Actor', type: 'text' },
  { name: 'Face Image', type: 'image' },
  { name: 'Has Costume', type: 'text' },
  { name: 'Costumes', type: 'tags' },
  { name: 'Trait Count', type: 'number' },
];

export const FGO_PREVIEW_COLUMNS = [
  'Name',
  'Class',
  'Attribute',
  'Rarity',
  'Gender',
  'Alignment',
  'Traits',
  'NP Card',
  'Deck',
  'Skills',
  'Max ATK',
  'Max HP',
  'Face Image',
] as const;

export const FGO_TAG_PREVIEW_COLUMNS = new Set(['Traits', 'Skills', 'Passive Skills']);

export const FGO_DISAMBIGUATION_FIELDS = ['Class', 'Rarity', 'Attribute'];

export const FGO_LARGE_DATASET_THRESHOLD = 100;
export const FGO_PREVIEW_ROW_LIMIT = 50;
