import type { DatasetColumnType, DatasetKind } from '../types/dataset';

export interface DatasetTemplate {
  kind: DatasetKind;
  label: string;
  description: string;
  columns: Array<{ name: string; type: DatasetColumnType }>;
}

export const DATASET_TEMPLATES: DatasetTemplate[] = [
  {
    kind: 'custom',
    label: 'Blank Dataset',
    description: 'Start with id, name, and tags columns.',
    columns: [
      { name: 'id', type: 'hidden' },
      { name: 'name', type: 'name' },
      { name: 'tags', type: 'tags' },
    ],
  },
  {
    kind: 'animeCharacters',
    label: 'Anime Character Template',
    description: 'Columns for anime character guessing games.',
    columns: [
      { name: 'id', type: 'hidden' },
      { name: 'name', type: 'name' },
      { name: 'aliases', type: 'text' },
      { name: 'series', type: 'text' },
      { name: 'image', type: 'image' },
      { name: 'age', type: 'number' },
      { name: 'height_cm', type: 'number' },
      { name: 'gender', type: 'text' },
      { name: 'species', type: 'text' },
      { name: 'hair', type: 'text' },
      { name: 'eyes', type: 'text' },
      { name: 'faction', type: 'tags' },
      { name: 'role', type: 'text' },
      { name: 'tags', type: 'tags' },
    ],
  },
  {
    kind: 'gameCharacters',
    label: 'Game Character Template',
    description: 'Columns for video game character lists.',
    columns: [
      { name: 'id', type: 'hidden' },
      { name: 'name', type: 'name' },
      { name: 'aliases', type: 'text' },
      { name: 'game', type: 'text' },
      { name: 'image', type: 'image' },
      { name: 'class', type: 'text' },
      { name: 'rarity', type: 'text' },
      { name: 'element', type: 'tags' },
      { name: 'weapon', type: 'text' },
      { name: 'faction', type: 'tags' },
      { name: 'role', type: 'text' },
      { name: 'tags', type: 'tags' },
    ],
  },
  {
    kind: 'generalPeople',
    label: 'General Person Template',
    description: 'Columns for general person or celebrity lists.',
    columns: [
      { name: 'id', type: 'hidden' },
      { name: 'name', type: 'name' },
      { name: 'aliases', type: 'text' },
      { name: 'image', type: 'image' },
      { name: 'age', type: 'number' },
      { name: 'country', type: 'text' },
      { name: 'occupation', type: 'text' },
      { name: 'group', type: 'tags' },
      { name: 'tags', type: 'tags' },
    ],
  },
];

export function getTemplate(kind: DatasetKind): DatasetTemplate {
  return DATASET_TEMPLATES.find((t) => t.kind === kind) ?? DATASET_TEMPLATES[0];
}
