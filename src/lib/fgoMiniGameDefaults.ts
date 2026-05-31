import type { BoardDataset, CharacterGuessMiniGameConfig } from '../types/board';
import type { AppDataset } from '../types/dataset';
import { isFgoLivePresetDataset } from '../types/dataset';
import { FGO_DISAMBIGUATION_FIELDS } from './fgoServantsPreset';

const FGO_ATTRIBUTE_DEFAULTS: Array<{
  column: string;
  displayName: string;
  visible: boolean;
  behavior: import('../types/board').AttributeBehavior;
}> = [
  { column: 'Name', displayName: 'Name', visible: false, behavior: 'searchName' },
  { column: 'Original Name', displayName: 'Original Name', visible: false, behavior: 'hidden' },
  { column: 'ID', displayName: 'ID', visible: false, behavior: 'hidden' },
  { column: 'Collection No.', displayName: 'Collection No.', visible: false, behavior: 'hidden' },
  { column: 'Class', displayName: 'Class', visible: true, behavior: 'exact' },
  { column: 'Attribute', displayName: 'Attribute', visible: true, behavior: 'exact' },
  { column: 'Rarity', displayName: 'Rarity', visible: true, behavior: 'numeric' },
  { column: 'Gender', displayName: 'Gender', visible: true, behavior: 'exact' },
  { column: 'Alignment', displayName: 'Alignment', visible: true, behavior: 'partial' },
  { column: 'Traits', displayName: 'Traits', visible: true, behavior: 'tagOverlap' },
  { column: 'NP Card', displayName: 'NP Card', visible: true, behavior: 'exact' },
  { column: 'Max ATK', displayName: 'Max ATK', visible: false, behavior: 'numeric' },
  { column: 'Max HP', displayName: 'Max HP', visible: false, behavior: 'numeric' },
  { column: 'Cost', displayName: 'Cost', visible: false, behavior: 'numeric' },
  { column: 'NP Type', displayName: 'NP Type', visible: false, behavior: 'exact' },
  { column: 'NP Name', displayName: 'NP Name', visible: false, behavior: 'exact' },
  { column: 'Deck', displayName: 'Deck', visible: false, behavior: 'exact' },
  { column: 'Skills', displayName: 'Skills', visible: false, behavior: 'tagOverlap' },
  { column: 'Passive Skills', displayName: 'Passive Skills', visible: false, behavior: 'tagOverlap' },
  { column: 'Trait Count', displayName: 'Trait Count', visible: false, behavior: 'numeric' },
  { column: 'Has Costume', displayName: 'Has Costume', visible: false, behavior: 'exact' },
  { column: 'Costumes', displayName: 'Costumes', visible: false, behavior: 'tagOverlap' },
  { column: 'Illustrator', displayName: 'Illustrator', visible: false, behavior: 'hidden' },
  { column: 'Voice Actor', displayName: 'Voice Actor', visible: false, behavior: 'hidden' },
  { column: 'Face Image', displayName: 'Face Image', visible: false, behavior: 'image' },
];

export function isFgoServantsBoardDataset(dataset: BoardDataset | AppDataset): boolean {
  if ('type' in dataset && dataset.type === 'fgoServants') return true;
  if ('source' in dataset && dataset.source?.kind === 'atlasAcademyFgoServants') return true;
  return dataset.columns.some((c) => (typeof c === 'string' ? c : c.name) === 'Class')
    && dataset.columns.some((c) => (typeof c === 'string' ? c : c.name) === 'Face Image');
}

export function applyFgoDatasetToMiniGame(
  config: CharacterGuessMiniGameConfig,
  dataset: BoardDataset,
): CharacterGuessMiniGameConfig {
  const columnSet = new Set(dataset.columns);
  const attributes = FGO_ATTRIBUTE_DEFAULTS.filter((a) => columnSet.has(a.column));

  return {
    ...config,
    datasetId: dataset.id,
    fieldMapping: {
      nameField: columnSet.has('Name') ? 'Name' : suggestNameFieldFallback(dataset.columns),
      answerField: columnSet.has('Name') ? 'Name' : suggestNameFieldFallback(dataset.columns),
      imageField: columnSet.has('Face Image') ? 'Face Image' : undefined,
      searchableFields: ['Name', 'Original Name'].filter((c) => columnSet.has(c)),
    },
    attributes,
  };
}

function suggestNameFieldFallback(columns: string[]): string {
  return columns.find((c) => /name/i.test(c)) ?? columns[0] ?? '';
}

export function getFgoDisambiguationFields(dataset: BoardDataset | AppDataset): string[] {
  const columns = 'columns' in dataset && typeof dataset.columns[0] === 'string'
    ? (dataset.columns as string[])
    : (dataset as AppDataset).columns.map((c) => c.name);
  return FGO_DISAMBIGUATION_FIELDS.filter((c) => columns.includes(c));
}

export function shouldApplyFgoDefaults(dataset: BoardDataset | AppDataset): boolean {
  if ('type' in dataset && dataset.type === 'fgoServants') return true;
  if ('source' in dataset && isFgoLivePresetDataset(dataset as AppDataset)) return true;
  return isFgoServantsBoardDataset(dataset);
}
