import { useCallback, useSyncExternalStore } from 'react';
import type { AppDataset, DatasetKind, DatasetSourceType } from '../types/dataset';
import {
  createAppDataset,
  createAppDatasetFromParsed,
  deleteAppDataset,
  duplicateAppDataset,
  ensureMigration,
  loadDatasets,
  upsertAppDataset,
} from '../lib/datasetStorage';

const EMPTY: AppDataset[] = [];

let cached = loadDatasets();
let listeners: Array<() => void> = [];

function refresh() {
  ensureMigration();
  cached = loadDatasets();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify() {
  refresh();
  listeners.forEach((l) => l());
}

function getSnapshot() {
  return cached;
}

function getServerSnapshot() {
  return EMPTY;
}

export function useDatasets() {
  const datasets = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveDataset = useCallback((dataset: AppDataset) => {
    upsertAppDataset(dataset);
    notify();
    return dataset;
  }, []);

  const createDataset = useCallback(
    (name: string, kind: DatasetKind, sourceType: DatasetSourceType = 'manual') => {
      const ds = createAppDataset(name, kind, sourceType);
      notify();
      return ds;
    },
    [],
  );

  const createFromParsed = useCallback(
    (
      name: string,
      columns: string[],
      rows: Array<Record<string, string>>,
      sourceType: DatasetSourceType,
      kind: DatasetKind = 'custom',
    ) => {
      const ds = createAppDatasetFromParsed(name, columns, rows, sourceType, kind);
      notify();
      return ds;
    },
    [],
  );

  const removeDataset = useCallback((id: string) => {
    deleteAppDataset(id);
    notify();
  }, []);

  const duplicateDataset = useCallback((id: string) => {
    const copy = duplicateAppDataset(id);
    notify();
    return copy;
  }, []);

  const refreshDatasets = useCallback(() => notify(), []);

  return {
    datasets,
    saveDataset,
    createDataset,
    createFromParsed,
    removeDataset,
    duplicateDataset,
    refreshDatasets,
  };
}

export function notifyDatasetChange() {
  notify();
}
