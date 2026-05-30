import { createId } from './ids';
import type { BoardDataset } from '../types/board';
import type { AttributeBehavior } from '../types/board';

export type CsvParseResult =
  | {
      ok: true;
      columns: string[];
      rows: Array<Record<string, string>>;
      rowIds: string[];
    }
  | {
      ok: false;
      error: string;
      details?: string;
    };

export function parseCsvText(text: string): CsvParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: 'The CSV file is empty.' };
  }

  try {
    const lines = parseCsvLines(trimmed);
    if (lines.length === 0) {
      return { ok: false, error: 'The CSV file is empty.' };
    }

    const headers = lines[0].map((h) => h.trim()).filter(Boolean);
    if (headers.length === 0) {
      return { ok: false, error: 'The CSV file has no column headers.' };
    }

    const rows: Array<Record<string, string>> = [];
    const rowIds: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i];
      if (cells.every((c) => !c.trim())) continue;
      const row: Record<string, string> = { __rowId: createId() };
      headers.forEach((header, j) => {
        row[header] = (cells[j] ?? '').trim();
      });
      rows.push(row);
      rowIds.push(row.__rowId);
    }

    if (rows.length === 0) {
      return { ok: false, error: 'The CSV file has headers but no data rows.' };
    }

    return { ok: true, columns: headers, rows, rowIds };
  } catch (e) {
    return {
      ok: false,
      error: 'Could not read this CSV file.',
      details: e instanceof Error ? e.message : String(e),
    };
  }
}

function parseCsvLines(text: string): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      current.push(field);
      field = '';
    } else if (ch === '\r' && next === '\n') {
      current.push(field);
      lines.push(current);
      current = [];
      field = '';
      i++;
    } else if (ch === '\n') {
      current.push(field);
      lines.push(current);
      current = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    lines.push(current);
  }

  return lines;
}

export function createDatasetFromCsv(
  fileName: string,
  text: string,
): { ok: true; dataset: BoardDataset } | { ok: false; error: string; details?: string } {
  const parsed = parseCsvText(text);
  if (!parsed.ok) return parsed;

  const now = new Date().toISOString();
  const dataset: BoardDataset = {
    id: createId(),
    name: fileName.replace(/\.csv$/i, '') || 'Dataset',
    sourceType: 'csv',
    columns: parsed.columns,
    rows: parsed.rows,
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, dataset };
}

export function datasetToCsv(dataset: BoardDataset): string {
  const headers = dataset.columns;
  const escape = (v: string) => {
    if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of dataset.rows) {
    lines.push(headers.map((h) => escape(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

const NAME_PATTERNS = /^(name|character|character name|char)$/i;
const IMAGE_PATTERNS = /^(image|image url|avatar|portrait|photo|img)$/i;
const ID_PATTERNS = /^(id|internal id|uuid|_id)$/i;

export function suggestColumnBehavior(column: string, sampleValues: string[]): AttributeBehavior {
  const col = column.trim();
  if (NAME_PATTERNS.test(col)) return 'searchName';
  if (IMAGE_PATTERNS.test(col)) return 'image';
  if (ID_PATTERNS.test(col)) return 'hidden';
  if (looksNumeric(sampleValues)) return 'numeric';
  if (looksLikeTags(sampleValues)) return 'tagOverlap';
  if (sampleValues.some((v) => v.length > 20)) return 'partial';
  return 'exact';
}

export function suggestNameField(columns: string[]): string {
  const found = columns.find((c) => NAME_PATTERNS.test(c.trim()));
  return found ?? columns[0] ?? '';
}

export function suggestImageField(columns: string[]): string | undefined {
  return columns.find((c) => IMAGE_PATTERNS.test(c.trim()));
}

export function buildDefaultAttributes(
  columns: string[],
  rows: Array<Record<string, string>>,
): import('../types/board').MiniGameAttribute[] {
  return columns.map((column) => {
    const samples = rows.slice(0, 5).map((r) => r[column] ?? '').filter(Boolean);
    const behavior = suggestColumnBehavior(column, samples);
    return {
      column,
      displayName: column,
      visible: behavior !== 'hidden' && behavior !== 'image' && behavior !== 'searchName',
      behavior,
    };
  });
}

function looksNumeric(values: string[]): boolean {
  if (values.length === 0) return false;
  return values.filter((v) => v.trim()).every((v) => !Number.isNaN(parseFloat(v.replace(/[^\d.-]/g, ''))));
}

function looksLikeTags(values: string[]): boolean {
  return values.some((v) => /[,;|/]/.test(v) && v.split(/[,;|/]/).length > 1);
}

export function findDuplicateNames(
  rows: Array<Record<string, string>>,
  nameField: string,
): string[] {
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const row of rows) {
    const name = (row[nameField] ?? '').trim().toLowerCase();
    if (!name) continue;
    seen.set(name, (seen.get(name) ?? 0) + 1);
    if (seen.get(name) === 2) dupes.push(name);
  }
  return dupes;
}

export function getRowId(row: Record<string, string>): string {
  return row.__rowId ?? '';
}

export function getRowDisplayName(
  row: Record<string, string>,
  nameField: string,
  disambiguationFields: string[] = [],
): string {
  const name = row[nameField] ?? '';
  const extra = disambiguationFields
    .map((f) => row[f])
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ');
  return extra ? `${name} (${extra})` : name;
}
