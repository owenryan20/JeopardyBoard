import type {
  Board,
  BoardDataset,
  CharacterGuessMiniGameConfig,
  Clue,
  CropRevealMiniGameConfig,
  FinalJeopardy,
  MiniGameConfig,
} from '../types/board';
import { isCharacterGuessConfig, isCropRevealConfig, isMiniGameTile } from '../types/board';
import { migrateClueAttachments } from './attachments';
import { migrateBoardWithTheme } from './boardTheme';
import { createDefaultCropRevealConfig, validateCropRevealConfig } from './cropReveal';
import { appDatasetToBoardDataset } from './datasetConvert';
import { applyFgoDatasetToMiniGame, getFgoDisambiguationFields, shouldApplyFgoDefaults } from './fgoMiniGameDefaults';
import { getAppDataset } from './datasetStorage';
import {
  createEmptyFinalTile,
  createDefaultFinalJeopardy,
  FINAL_JEOPARDY_TILE_ID,
} from './finalJeopardy';
import { createId } from './ids';
import {
  buildDefaultAttributes,
  getRowId,
  suggestImageField,
  suggestNameField,
} from './csvParse';

export function createDefaultMiniGameConfig(value: number): CharacterGuessMiniGameConfig {
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

export function createCropRevealTile(value: number): Clue {
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
    miniGame: createDefaultCropRevealConfig(value),
  };
}

export function applyDatasetToMiniGame(
  config: CharacterGuessMiniGameConfig,
  dataset: BoardDataset,
): CharacterGuessMiniGameConfig {
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

export function getCorrectAnswerRow(
  board: Board,
  config: CharacterGuessMiniGameConfig,
): Record<string, string> | undefined {
  const dataset = getDataset(board, config.datasetId);
  if (!dataset) return undefined;
  return getRowById(dataset, config.correctAnswerId);
}

export function getCorrectAnswerName(board: Board, clue: Clue): string {
  if (!clue.miniGame || !isCharacterGuessConfig(clue.miniGame)) return '';
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

  if (isCropRevealConfig(config)) {
    const errors = validateCropRevealConfig(config);
    const checklistCr = [
      { label: 'Image selected', done: Boolean(config.image.mediaId || config.image.url?.trim()) },
      { label: 'Correct answer set', done: Boolean(config.correctAnswer.trim()) },
      { label: 'Crop settings valid', done: errors.length === 0 },
    ];
    const allDone = checklistCr.every((c) => c.done);
    return {
      status: allDone ? 'ready' : 'setupNeeded',
      label: allDone ? 'Ready to Play' : 'Setup Needed',
      checklist: checklistCr,
    };
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
  const migrated: Board = {
    ...raw,
    datasets: raw.datasets ?? [],
    finalJeopardy: migrateFinalJeopardy(raw.finalJeopardy),
    categories: raw.categories.map((cat) => ({
      ...cat,
      clues: cat.clues.map((clue) => migrateClue(clue)),
    })),
  };
  return migrateBoardWithTheme(migrated);
}

export function migrateFinalJeopardy(raw: unknown): FinalJeopardy {
  if (!raw || typeof raw !== 'object') {
    return createDefaultFinalJeopardy();
  }

  const obj = raw as Record<string, unknown>;

  if (obj.tile && typeof obj.tile === 'object') {
    const tileRaw = obj.tile as Partial<Clue> & { value?: number };
    const tile = migrateClue({
      ...tileRaw,
      id: tileRaw.id || FINAL_JEOPARDY_TILE_ID,
      value: 0,
    });
    return {
      category: typeof obj.category === 'string' ? obj.category : '',
      tile: { ...tile, value: 0, isDailyDouble: false },
    };
  }

  return {
    category: typeof obj.category === 'string' ? obj.category : '',
    tile: {
      ...createEmptyFinalTile(),
      clue: typeof obj.clue === 'string' ? obj.clue : '',
      answer: typeof obj.answer === 'string' ? obj.answer : '',
    },
  };
}

export function migrateClueFromImport(clue: Partial<Clue> & { id?: string; value: number }): Clue {
  return migrateClue({
    ...clue,
    id: clue.id || createId(),
    isUsed: false,
  });
}

function migrateMiniGameConfig(
  raw: Partial<MiniGameConfig> | undefined,
  value: number,
): MiniGameConfig | undefined {
  if (!raw) return createDefaultMiniGameConfig(value);
  if (raw.gameType === 'cropReveal') {
    const cr = raw as Partial<CropRevealMiniGameConfig>;
    const defaults = createDefaultCropRevealConfig(value);
    return {
      ...defaults,
      ...cr,
      gameType: 'cropReveal',
      image: cr.image ?? defaults.image,
      acceptedAnswers: Array.isArray(cr.acceptedAnswers) ? cr.acceptedAnswers : [],
    };
  }
  if (raw.gameType === 'characterGuess' || 'datasetId' in raw) {
    const cg = raw as Partial<CharacterGuessMiniGameConfig>;
    return {
      ...createDefaultMiniGameConfig(value),
      ...cg,
      gameType: 'characterGuess',
      fieldMapping: cg.fieldMapping ?? createDefaultMiniGameConfig(value).fieldMapping,
      attributes: Array.isArray(cg.attributes) ? cg.attributes : [],
    };
  }
  return createDefaultMiniGameConfig(value);
}

function migrateClue(clue: Partial<Clue> & { id: string; value: number }): Clue {
  const type = clue.type ?? 'clue';
  const base: Clue = {
    id: clue.id,
    type,
    value: clue.value,
    clue: clue.clue ?? '',
    answer: clue.answer ?? '',
    hostNotes: clue.hostNotes ?? '',
    isDailyDouble: Boolean(clue.isDailyDouble),
    tags: Array.isArray(clue.tags) ? clue.tags : [],
    isUsed: Boolean(clue.isUsed),
    attachments: clue.attachments,
    attachmentDisplayMode: clue.attachmentDisplayMode,
    miniGame: type === 'miniGame' ? migrateMiniGameConfig(clue.miniGame, clue.value) : clue.miniGame,
  };
  return migrateClueAttachments(base);
}

export function searchDatasetRows(
  dataset: BoardDataset,
  config: CharacterGuessMiniGameConfig,
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

export function getVisibleComparisonAttributes(config: CharacterGuessMiniGameConfig) {
  return config.attributes.filter(
    (a) => a.visible && a.behavior !== 'hidden' && a.behavior !== 'searchName' && a.behavior !== 'image',
  );
}

export function tileEditorStatus(clue: Clue, board: Board): 'empty' | 'partial' | 'complete' {
  if (isMiniGameTile(clue)) {
    const r = getMiniGameReadiness(board, clue);
    if (r.status === 'ready') return 'complete';
    if (isCropRevealConfig(clue.miniGame!)) {
      if (r.status === 'setupNeeded' && !clue.miniGame.correctAnswer.trim()) return 'empty';
      return 'partial';
    }
    if (r.status === 'missingDataset' || !isCharacterGuessConfig(clue.miniGame!) || !clue.miniGame.datasetId) return 'empty';
    return 'partial';
  }
  const hasClue = clue.clue.trim().length > 0;
  const hasAnswer = clue.answer.trim().length > 0;
  if (!hasClue && !hasAnswer) return 'empty';
  if (hasClue && hasAnswer) return 'complete';
  return 'partial';
}
