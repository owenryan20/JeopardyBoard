import type { AttributeBehavior, MiniGameAttribute } from '../types/board';

export type ComparisonResult =
  | { kind: 'match'; label: 'Match'; icon: '✓'; sharedTags?: string[] }
  | { kind: 'partial'; label: 'Partial'; icon: '≈'; sharedTags?: string[] }
  | { kind: 'miss'; label: 'No match'; icon: '×' }
  | { kind: 'higher'; label: 'Higher'; icon: '↑' }
  | { kind: 'lower'; label: 'Lower'; icon: '↓' }
  | { kind: 'empty'; label: '—'; icon: '—' };

export function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

export function compareAttribute(
  behavior: AttributeBehavior,
  guessed: string,
  answer: string,
): ComparisonResult {
  const g = guessed.trim();
  const a = answer.trim();

  if (!g && !a) return { kind: 'empty', label: '—', icon: '—' };
  if (!g || !a) return { kind: 'miss', label: 'No match', icon: '×' };

  switch (behavior) {
    case 'exact':
      return normalizeValue(g) === normalizeValue(a)
        ? { kind: 'match', label: 'Match', icon: '✓' }
        : { kind: 'miss', label: 'No match', icon: '×' };

    case 'partial':
      return comparePartial(g, a);

    case 'numeric':
      return compareNumeric(g, a);

    case 'tagOverlap':
      return compareTags(g, a);

    default:
      return normalizeValue(g) === normalizeValue(a)
        ? { kind: 'match', label: 'Match', icon: '✓' }
        : { kind: 'miss', label: 'No match', icon: '×' };
  }
}

function comparePartial(guessed: string, answer: string): ComparisonResult {
  const g = normalizeValue(guessed);
  const a = normalizeValue(answer);
  if (g === a) return { kind: 'match', label: 'Match', icon: '✓' };
  if (g.includes(a) || a.includes(g)) return { kind: 'partial', label: 'Partial', icon: '≈' };

  const gParts = splitParts(g);
  const aParts = splitParts(a);
  const shared = gParts.filter((p) => aParts.includes(p));
  if (shared.length > 0) return { kind: 'partial', label: 'Partial', icon: '≈', sharedTags: shared };

  return { kind: 'miss', label: 'No match', icon: '×' };
}

function splitParts(value: string): string[] {
  return value.split(/[\s,;/|]+/).map((p) => p.trim()).filter(Boolean);
}

/** Split comma-delimited tag lists without breaking multi-word trait names. */
export function splitTagList(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of value.split(/[,;|/]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = normalizeValue(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(trimmed);
  }
  return tags;
}

function sharedTagLabels(guessedTags: string[], answerTags: string[]): string[] {
  const answerByNorm = new Map(answerTags.map((t) => [normalizeValue(t), t]));
  const shared: string[] = [];
  const seen = new Set<string>();
  for (const tag of guessedTags) {
    const norm = normalizeValue(tag);
    const label = answerByNorm.get(norm);
    if (!label || seen.has(norm)) continue;
    seen.add(norm);
    shared.push(label);
  }
  return shared;
}

function compareNumeric(guessed: string, answer: string): ComparisonResult {
  const gn = parseNumber(guessed);
  const an = parseNumber(answer);
  if (gn === null || an === null) {
    return normalizeValue(guessed) === normalizeValue(answer)
      ? { kind: 'match', label: 'Match', icon: '✓' }
      : { kind: 'miss', label: 'No match', icon: '×' };
  }
  if (gn === an) return { kind: 'match', label: 'Match', icon: '✓' };
  if (gn < an) return { kind: 'higher', label: 'Higher', icon: '↑' };
  return { kind: 'lower', label: 'Lower', icon: '↓' };
}

function parseNumber(value: string): number | null {
  const match = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isNaN(n) ? null : n;
}

function compareTags(guessed: string, answer: string): ComparisonResult {
  const gTags = splitTagList(guessed);
  const aTags = splitTagList(answer);
  if (gTags.length === 0 || aTags.length === 0) {
    return { kind: 'miss', label: 'No match', icon: '×' };
  }

  const shared = sharedTagLabels(gTags, aTags);
  const gNorm = new Set(gTags.map(normalizeValue));
  const aNorm = new Set(aTags.map(normalizeValue));

  if (shared.length === aNorm.size && shared.length === gNorm.size) {
    return { kind: 'match', label: 'Match', icon: '✓', sharedTags: shared };
  }
  if (shared.length > 0) {
    return { kind: 'partial', label: 'Partial', icon: '≈', sharedTags: shared };
  }
  return { kind: 'miss', label: 'No match', icon: '×' };
}

export interface GuessComparisonRow {
  rowId: string;
  name: string;
  cells: Array<{
    attribute: MiniGameAttribute;
    guessedValue: string;
    answerValue: string;
    result: ComparisonResult;
  }>;
  isCorrect: boolean;
}

export function buildGuessComparison(
  guessedRow: Record<string, string>,
  answerRow: Record<string, string>,
  attributes: MiniGameAttribute[],
  nameField: string,
  rowId: string,
): GuessComparisonRow {
  const visible = attributes.filter(
    (a) => a.visible && a.behavior !== 'hidden' && a.behavior !== 'searchName' && a.behavior !== 'image',
  );

  const cells = visible.map((attr) => {
    const guessedValue = guessedRow[attr.column] ?? '';
    const answerValue = answerRow[attr.column] ?? '';
    return {
      attribute: attr,
      guessedValue,
      answerValue,
      result: compareAttribute(attr.behavior, guessedValue, answerValue),
    };
  });

  const isCorrect = getRowId(guessedRow) === getRowId(answerRow);

  return {
    rowId,
    name: guessedRow[nameField] ?? '',
    cells,
    isCorrect,
  };
}

function getRowId(row: Record<string, string>): string {
  return row.__rowId ?? '';
}

export const COMPARISON_LEGEND = [
  { icon: '✓', label: 'Match' },
  { icon: '≈', label: 'Partial' },
  { icon: '×', label: 'No match' },
  { icon: '↑', label: 'Higher' },
  { icon: '↓', label: 'Lower' },
] as const;
