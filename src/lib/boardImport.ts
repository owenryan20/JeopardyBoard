import type { Board } from '../types/board';
import { importBoardZipFile, isZipFile } from './boardZip';
import { validateBoardImport } from './validation';

export type BoardImportResult =
  | { ok: true; board: Board }
  | { ok: false; error: string };

export function isBoardImportFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.json') || lower.endsWith('.zip')) return true;
  return isZipFile(file);
}

export function pickBoardImportFile(files: FileList | null | undefined): File | null {
  if (!files?.length) return null;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file && isBoardImportFile(file)) return file;
  }
  return null;
}

export async function importBoardFromFile(file: File): Promise<BoardImportResult> {
  try {
    if (isZipFile(file)) {
      const board = await importBoardZipFile(file);
      return { ok: true, board };
    }

    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    const result = validateBoardImport(parsed);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, board: result.board };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error
        ? err.message
        : isZipFile(file)
          ? 'Could not read ZIP board file. Check the archive format.'
          : 'Could not parse JSON file. Check the file format.',
    };
  }
}
