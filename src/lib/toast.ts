type ToastListener = (message: string | null) => void;

let listener: ToastListener | null = null;
let hideTimer: number | null = null;

export function subscribeToast(fn: ToastListener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

export function showToast(message: string, durationMs = 4000): void {
  if (hideTimer) window.clearTimeout(hideTimer);
  listener?.(message);
  hideTimer = window.setTimeout(() => {
    listener?.(null);
    hideTimer = null;
  }, durationMs);
}

export function formatFetchedAt(iso: string | undefined): string {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleString();
}
