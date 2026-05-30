import JSZip from 'jszip';
import type { Board } from '../types/board';
import { boardToJson, downloadBlob } from './export';
import { getMediaRecord, importMediaRecords, type StoredMediaRecord } from './mediaStorage';
import {
  collectLocalMediaIds,
  sanitizeMediaFilename,
} from './mediaUtils';
import { validateBoardImport } from './validation';

const BOARD_JSON = 'board.json';
const MEDIA_PREFIX = 'media/';

export async function exportBoardZipBlob(board: Board): Promise<Blob> {
  const zip = new JSZip();
  zip.file(BOARD_JSON, boardToJson(board));

  for (const mediaId of collectLocalMediaIds(board)) {
    const record = await getMediaRecord(mediaId);
    if (!record) continue;
    const entry = `${MEDIA_PREFIX}${mediaId}__${sanitizeMediaFilename(record.filename)}`;
    zip.file(entry, record.blob);
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

function parseMediaEntryPath(path: string): { mediaId: string; filename: string } | null {
  if (!path.startsWith(MEDIA_PREFIX) || path.endsWith('/')) return null;
  const base = path.slice(MEDIA_PREFIX.length);
  const sep = base.indexOf('__');
  if (sep <= 0) return null;
  return {
    mediaId: base.slice(0, sep),
    filename: base.slice(sep + 2),
  };
}

export async function importBoardZipFile(file: File): Promise<Board> {
  const zip = await JSZip.loadAsync(file);
  const boardEntry = zip.file(BOARD_JSON);
  if (!boardEntry) {
    throw new Error('ZIP is missing board.json.');
  }

  const text = await boardEntry.async('text');
  const parsed: unknown = JSON.parse(text);
  const result = validateBoardImport(parsed);
  if (!result.ok) {
    throw new Error(result.error);
  }

  const records: StoredMediaRecord[] = [];
  for (const path of Object.keys(zip.files)) {
    const parsedPath = parseMediaEntryPath(path);
    if (!parsedPath) continue;
    const entry = zip.file(path);
    if (!entry || entry.dir) continue;
    const blob = await entry.async('blob');
    records.push({
      id: parsedPath.mediaId,
      blob,
      mimeType: blob.type || 'application/octet-stream',
      filename: parsedPath.filename,
      size: blob.size,
      createdAt: new Date().toISOString(),
    });
  }

  await importMediaRecords(records);
  return result.board;
}

export function isZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
}

function boardExportBasename(board: Board): string {
  return board.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'board';
}

export async function exportBoardZip(board: Board): Promise<void> {
  const blob = await exportBoardZipBlob(board);
  downloadBlob(blob, `${boardExportBasename(board)}.zip`);
}

export async function exportBoardZipBackup(board: Board): Promise<void> {
  const blob = await exportBoardZipBlob(board);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `${boardExportBasename(board)}-backup-${stamp}.zip`);
}
