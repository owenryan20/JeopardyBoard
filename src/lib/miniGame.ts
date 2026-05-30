import type { Board, BoardDataset, Clue, MiniGameConfig } from '../types/board';
import { isMiniGameTile } from '../types/board';
import { appDatasetToBoardDataset } from './datasetConvert';
import { applyFgoDatasetToMiniGame, getFgoDisambiguationFields, shouldApplyFgoDefaults } from './fgoMiniGameDefaults';
import { getAppDataset } from './datasetStorage';
import { createId } from './ids';
import {
  buildDefaultAttributes,
  getRowId,
  suggestImageField,
  suggestNameField,
} from './csvParse';

export function createDefaultMiniGameConfig(value: number): MiniGameConfig {
  return {
    gameType: 'characterGuess',
    title: 'Guess the Character',
    pointValue: value,
    datasetId: '',
    correctAnswerId: '',
    guessLimit: 6,
    showAnswerImage: true,
    revealBehavior: 'hostReveal',
    hostNotes: '',
    fieldMapping: {
      nameField: '',
      answerField: '',
      searchableFields: [],
    },
    attributes: [],
  };
}

export function createMiniGameTile(value: number): Clue {
  return {
    id: createId(),
    type: 'miniGame',
    value,
    clue: '',
    answer: '',
    hostNotes: '',
    isDailyDouble: false,
    tags: [],
    isUsed: false,
    miniGame: createDefaultMiniGameConfig(value),
  };
}

export function applyDatasetToMiniGame(
  config: MiniGameConfig,
  dataset: BoardDataset,
): MiniGameConfig {
  if (shouldApplyFgoDefaults(dataset)) {
    return applyFgoDatasetToMiniGame(config, dataset);
  }

  const nameField = suggestNameField(dataset.columns);
  const imageField = suggestImageField(dataset.columns);
  const attributes = buildDefaultAttributes(dataset.columns, dataset.rows);
  const answerField = nameField;

  return {
    ...config,
    datasetId: dataset.id,
    fieldMapping: {
      nameField,
      answerField,
      imageField,
      searchableFields: dataset.columns.filter(
        (c) => !attributes.find((a) => a.column === c && a.behavior === 'hidden'),
      ),
    },
    attributes,
  };
}

export function getDataset(board: Board, datasetId: string): BoardDataset | undefined {
  if (!datasetId) return undefined;
  const global = getAppDataset(datasetId);
  if (global) return appDatasetToBoardDataset(global);
  return board.datasets?.find((d) => d.id === datasetId);
}

export function getRowById(dataset: BoardDataset, rowId: string): Record<string, string> | undefined {
  return dataset.rows.find((r) => getRowId(r) === rowId);
}

export function getCorrectAnswerRow(board: Board, config: MiniGameConfig): Record<string, string> | undefined {
  const dataset = getDataset(board, config.datasetId);
  if (!dataset) return undefined;
  return getRowById(dataset, config.correctAnswerId);
}

export function getCorrectAnswerName(board: Board, clue: Clue): string {
  if (!clue.miniGame) return '';
  const row = getCorrectAnswerRow(board, clue.miniGame);
  if (!row) return '';
  return row[clue.miniGame.fieldMapping.nameField] ?? '';
}

export type MiniGameReadinessStatus = 'ready' | 'setupNeeded' | 'missingDataset';

export interface MiniGameReadiness {
  status: MiniGameReadinessStatus;
  label: string;
  checklist: Array<{ label: string; done: boolean }>;
}

export function getMiniGameReadiness(board: Board, clue: Clue): MiniGameReadiness {
  const config = clue.miniGame;
  const checklist = [
    { label: 'Dataset selected', done: false },
    { label: 'Character name mapped', done: false },
    { label: 'Correct answer selected', done: false },
    { label: 'At least one visible comparison attribute', done: false },
  ];

  if (!config) {
    return { status: 'setupNeeded', label: 'Setup Needed', checklist };
  }

  const dataset = getDataset(board, config.datasetId);
  checklist[0].done = Boolean(dataset);
  checklist[1].done = Boolean(config.fieldMapping.nameField);
  checklist[2].done = Boolean(config.correctAnswerId);
  const visibleAttrs = config.attributes.filter(
    (a) => a.visible && a.behavior !== 'hidden' && a.behavior !== 'image' && a.behavior !== 'searchName',
  );
  const mappedColumns = dataset ? new Set(dataset.columns) : new Set<string>();
  const hasVisibleMapped = visibleAttrs.some((a) => mappedColumns.has(a.column));
  checklist[3].done = hasVisibleMapped;

  if (!dataset && config.datasetId) {
    return { status: 'missingDataset', label: 'Missing Dataset', checklist };
  }

  const allDone = checklist.every((c) => c.done);
  return {
    status: allDone ? 'ready' : 'setupNeeded',
    label: allDone ? 'Ready to Play' : 'Setup Needed',
    checklist,
  };
}

export function migrateBoard(raw: Board): Board {
  return {
    ...raw,
    datasets: raw.datasets ?? [],
    categories: raw.categories.map((cat) => ({
      ...cat,
      clues: cat.clues.map((clue) => migrateClue(clue)),
    })),
  };
}

export function migrateClueFromImport(clue: Partial<Clue> & { id?: string; value: number }): Clue {
  return migrateClue({
    ...clue,
    id: clue.id || createId(),
    isUsed: false,
  });
}

function migrateClue(clue: Partial<Clue> & { id: string; value: number }): Clue {
  const type = clue.type ?? 'clue';
  return {
    id: clue.id,
    type,
    value: clue.value,
    clue: clue.clue ?? '',
    answer: clue.answer ?? '',
    hostNotes: clue.hostNotes ?? '',
    isDailyDouble: Boolean(clue.isDailyDouble),
    media: clue.media,
    tags: Array.isArray(clue.tags) ? clue.tags : [],
    isUsed: Boolean(clue.isUsed),
    miniGame: type === 'miniGame' ? (clue.miniGame ?? createDefaultMiniGameConfig(clue.value)) : clue.miniGame,
  };
}

export function searchDatasetRows(
  dataset: BoardDataset,
  config: MiniGameConfig,
  query: string,
): Array<{ rowId: string; label: string; row: Record<string, string> }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { nameField, searchableFields } = config.fieldMapping;
  const fields = [nameField, ...searchableFields].filter(Boolean);
  const disambiguation = shouldApplyFgoDefaults(dataset)
    ? getFgoDisambiguationFields(dataset)
    : dataset.columns.filter(
        (c) => c !== nameField && !fields.includes(c),
      ).slice(0, 2);

  return dataset.rows
    .filter((row) =>
      fields.some((f) => (row[f] ?? '').toLowerCase().includes(q)),
    )
    .slice(0, 12)
    .map((row) => ({
      rowId: getRowId(row),
      label: getRowDisplayLabel(row, nameField, disambiguation),
      row,
    }));
}

function getRowDisplayLabel(
  row: Record<string, string>,
  nameField: string,
  disambiguation: string[],
): string {
  const name = row[nameField] ?? '';
  const extra = disambiguation.map((f) => row[f]).filter(Boolean).join(' · ');
  return extra ? `${name} (${extra})` : name;
}

export function getVisibleComparisonAttributes(config: MiniGameConfig) {
  return config.attributes.filter(
    (a) => a.visible && a.behavior !== 'hidden' && a.behavior !== 'searchName' && a.behavior !== 'image',
  );
}

export function tileEditorStatus(clue: Clue, board: Board): 'empty' | 'partial' | 'complete' {
  if (isMiniGameTile(clue)) {
    const r = getMiniGameReadiness(board, clue);
    if (r.status === 'ready') return 'complete';
    if (r.status === 'missingDataset' || !clue.miniGame?.datasetId) return 'empty';
    return 'partial';
  }
  const hasClue = clue.clue.trim().length > 0;
  const hasAnswer = clue.answer.trim().length > 0;
  if (!hasClue && !hasAnswer) return 'empty';
  if (hasClue && hasAnswer) return 'complete';
  return 'partial';
}
