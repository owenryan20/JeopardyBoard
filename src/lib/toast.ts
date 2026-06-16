type ToastListener = (message: string | null, variant?: 'default' | 'buzz') => void;

let listener: ToastListener | null = null;
let hideTimer: number | null = null;

export function subscribeToast(fn: ToastListener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

export function showToast(message: string, durationMs = 4000, variant: 'default' | 'buzz' = 'default'): void {
  if (hideTimer) window.clearTimeout(hideTimer);
  listener?.(message, variant);
  hideTimer = window.setTimeout(() => {
    listener?.(null);
    hideTimer = null;
  }, durationMs);
}

export function showBuzzToast(message: string, durationMs = 3500): void {
  showToast(message, durationMs, 'buzz');
}

export function formatFetchedAt(iso: string | undefined): string {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleString();
}
