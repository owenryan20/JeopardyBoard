import { collectLocalMediaIdsFromBoards } from './mediaUtils';
import { createId } from './ids';
import { loadBoards } from './storage';

const DB_NAME = 'jeff-hardy-media';
const STORE_NAME = 'blobs';
const DB_VERSION = 1;

export interface StoredMediaRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  filename: string;
  size: number;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Could not open media database.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = fn(store);
        tx.oncomplete = () => resolve(request?.result);
        tx.onerror = () => reject(tx.error ?? new Error('Media storage transaction failed.'));
        tx.onabort = () => reject(tx.error ?? new Error('Media storage transaction aborted.'));
      }),
  );
}

export async function saveMediaFile(
  file: File,
  mediaId = createId(),
): Promise<StoredMediaRecord> {
  const record: StoredMediaRecord = {
    id: mediaId,
    blob: file,
    mimeType: file.type || 'application/octet-stream',
    filename: file.name || 'upload',
    size: file.size,
    createdAt: new Date().toISOString(),
  };
  await runTransaction('readwrite', (store) => store.put(record));
  return record;
}

export async function getMediaRecord(id: string): Promise<StoredMediaRecord | null> {
  const result = await runTransaction<StoredMediaRecord>('readonly', (store) => store.get(id));
  return (result as StoredMediaRecord | undefined) ?? null;
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  const record = await getMediaRecord(id);
  return record?.blob ?? null;
}

export async function deleteMedia(id: string): Promise<void> {
  await runTransaction('readwrite', (store) => store.delete(id));
}

export async function deleteMediaIfUnreferenced(mediaId: string): Promise<void> {
  const boards = loadBoards();
  const referenced = collectLocalMediaIdsFromBoards(boards);
  if (!referenced.has(mediaId)) {
    await deleteMedia(mediaId);
  }
}

export async function gcUnreferencedMedia(): Promise<number> {
  const boards = loadBoards();
  const referenced = collectLocalMediaIdsFromBoards(boards);
  const db = await openDb();
  const removed = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result as string[];
      let pending = 0;
      let count = 0;
      for (const key of keys) {
        if (!referenced.has(key)) {
          pending += 1;
          count += 1;
          store.delete(key);
        }
      }
      if (pending === 0) {
        resolve(0);
        return;
      }
      tx.oncomplete = () => resolve(count);
    };
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
  return removed;
}

export async function importMediaRecords(records: StoredMediaRecord[]): Promise<void> {
  if (records.length === 0) return;
  await runTransaction('readwrite', (store) => {
    for (const record of records) {
      store.put(record);
    }
  });
}

export function isMediaStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
