export type TableParseResult =
  | { ok: true; columns: string[]; rows: Array<Record<string, string>> }
  | { ok: false; error: string };

export function parsePastedTable(text: string, firstRowHeaders = true): TableParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "We couldn't detect a table. Try copying rows from a spreadsheet, or upload a CSV instead." };
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { ok: false, error: "We couldn't detect a table. Try copying rows from a spreadsheet, or upload a CSV instead." };
  }

  const delimiter = detectDelimiter(lines);
  const parsedLines = lines.map((line) => splitLine(line, delimiter));

  if (parsedLines.every((cells) => cells.length <= 1) && !trimmed.includes('\t')) {
    return { ok: false, error: "We couldn't detect a table. Try copying rows from a spreadsheet, or upload a CSV instead." };
  }

  const maxCols = Math.max(...parsedLines.map((l) => l.length));
  let columns: string[];
  let dataLines: string[][];

  if (firstRowHeaders) {
    columns = parsedLines[0].map((h, i) => h.trim() || `Column ${i + 1}`);
    dataLines = parsedLines.slice(1);
  } else {
    columns = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
    dataLines = parsedLines;
  }

  if (columns.length === 0) {
    return { ok: false, error: 'No columns found in pasted data.' };
  }

  const rows: Array<Record<string, string>> = [];
  for (const cells of dataLines) {
    if (cells.every((c) => !c.trim())) continue;
    const row: Record<string, string> = {};
    columns.forEach((col, i) => {
      row[col] = (cells[i] ?? '').trim();
    });
    rows.push(row);
  }

  if (rows.length === 0) {
    return { ok: false, error: 'No data rows found after parsing.' };
  }

  return { ok: true, columns, rows };
}

function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, Math.min(5, lines.length));
  const tabCount = sample.reduce((n, l) => n + (l.match(/\t/g)?.length ?? 0), 0);
  const commaCount = sample.reduce((n, l) => n + (l.match(/,/g)?.length ?? 0), 0);
  if (tabCount >= commaCount && tabCount > 0) return '\t';
  return ',';
}

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') return line.split('\t');
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      cells.push(current);
      current = '';
    } else current += ch;
  }
  cells.push(current);
  return cells;
}

export function removeEmptyColumns(
  columns: string[],
  rows: Array<Record<string, string>>,
): { columns: string[]; rows: Array<Record<string, string>> } {
  const kept = columns.filter((col) =>
    rows.some((row) => (row[col] ?? '').trim().length > 0),
  );
  return {
    columns: kept.length > 0 ? kept : columns,
    rows: rows.map((row) => {
      const next: Record<string, string> = {};
      for (const col of kept.length > 0 ? kept : columns) next[col] = row[col] ?? '';
      return next;
    }),
  };
}
