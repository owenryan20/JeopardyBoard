import type { BoardDataset } from '../types/board';
import type { AppDataset, DatasetColumn, DatasetColumnType, DatasetKind, DatasetRow } from '../types/dataset';
import { createId } from './ids';

const NAME_PATTERNS = /^(name|character|character name|char|aliases)$/i;
const IMAGE_PATTERNS = /^(image|image url|avatar|portrait|photo|img)$/i;
const ID_PATTERNS = /^(id|internal id|uuid|_id)$/i;
const TAG_PATTERNS = /^(tags|tag|faction|element|group)$/i;

export function inferColumnType(name: string, sampleValues: string[] = []): DatasetColumnType {
  const col = name.trim();
  if (ID_PATTERNS.test(col)) return 'hidden';
  if (NAME_PATTERNS.test(col)) return 'name';
  if (IMAGE_PATTERNS.test(col)) return 'image';
  if (TAG_PATTERNS.test(col)) return 'tags';
  if (sampleValues.length > 0 && sampleValues.every((v) => !Number.isNaN(parseFloat(v.replace(/[^\d.-]/g, ''))))) {
    return 'number';
  }
  if (/age|height|cm|year|level|rarity/i.test(col)) return 'number';
  return 'text';
}

export function createColumn(name: string, type?: DatasetColumnType, samples: string[] = []): DatasetColumn {
  return {
    id: createId(),
    name,
    type: type ?? inferColumnType(name, samples),
    hidden: ID_PATTERNS.test(name),
  };
}

export function appDatasetToBoardDataset(ds: AppDataset): BoardDataset {
  const visibleColumns = ds.columns.filter((c) => !c.hidden);
  return {
    id: ds.id,
    name: ds.name,
    sourceType: 'csv',
    columns: visibleColumns.map((c) => c.name),
    rows: ds.rows.map((row) => {
      const record: Record<string, string> = { __rowId: row.id };
      for (const col of visibleColumns) {
        record[col.name] = row.values[col.name] ?? '';
      }
      return record;
    }),
    createdAt: ds.createdAt,
    updatedAt: ds.updatedAt,
  };
}

export function boardDatasetToAppDataset(
  ds: BoardDataset,
  type: DatasetKind = 'custom',
  sourceType: AppDataset['sourceType'] = 'csv',
): AppDataset {
  const samplesByColumn = new Map<string, string[]>();
  for (const col of ds.columns) {
    samplesByColumn.set(
      col,
      ds.rows.slice(0, 5).map((r) => r[col] ?? '').filter(Boolean),
    );
  }

  const columns: DatasetColumn[] = ds.columns.map((name) =>
    createColumn(name, inferColumnType(name, samplesByColumn.get(name) ?? [])),
  );

  const rows: DatasetRow[] = ds.rows.map((row) => {
    const { __rowId, ...rest } = row;
    const values: Record<string, string> = {};
    for (const col of ds.columns) {
      values[col] = rest[col] ?? '';
    }
    return { id: __rowId || createId(), values };
  });

  return {
    id: ds.id,
    name: ds.name,
    type,
    sourceType,
    columns,
    rows,
    createdAt: ds.createdAt,
    updatedAt: ds.updatedAt,
  };
}

export function createEmptyRow(columns: DatasetColumn[]): DatasetRow {
  const values: Record<string, string> = {};
  for (const col of columns) {
    values[col.name] = '';
  }
  return { id: createId(), values };
}

export function duplicateRow(row: DatasetRow): DatasetRow {
  return { id: createId(), values: { ...row.values } };
}

export function getColumnNames(ds: AppDataset): string[] {
  return ds.columns.filter((c) => !c.hidden).map((c) => c.name);
}

export function getNameColumn(ds: AppDataset): DatasetColumn | undefined {
  return ds.columns.find((c) => c.type === 'name') ?? ds.columns.find((c) => NAME_PATTERNS.test(c.name));
}

export function getImageColumn(ds: AppDataset): DatasetColumn | undefined {
  return ds.columns.find((c) => c.type === 'image') ?? ds.columns.find((c) => IMAGE_PATTERNS.test(c.name));
}
