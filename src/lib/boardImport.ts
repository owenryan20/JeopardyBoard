import type { Board } from '../types/board';
import { importBoardZipFile, isZipFile } from './boardZip';
import { validateBoardImport } from './validation';

export type BoardImportResult =
  | { ok: true; board: Board }
  | { ok: false; error: string };

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
