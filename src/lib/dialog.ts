export type DialogVariant = 'default' | 'destructive';

export interface DialogButton {
  label: string;
  variant?: DialogVariant;
  disabled?: boolean;
}

export interface DialogRequest {
  id: string;
  title: string;
  description?: string;
  variant?: DialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When set, shows a text input (prompt mode). */
  inputLabel?: string;
  inputDefaultValue?: string;
  inputPlaceholder?: string;
  /** If true, Enter confirms when input is non-empty. */
  requireInput?: boolean;
  /** If true, clicking backdrop closes (cancel). */
  closeOnBackdrop?: boolean;
  loading?: boolean;
  resolve: (value: boolean | string | null) => void;
}

type DialogListener = (request: DialogRequest | null) => void;

let listener: DialogListener | null = null;

export function subscribeDialog(fn: DialogListener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

function emit(request: DialogRequest | null) {
  listener?.(request);
}

function createId(): string {
  return crypto.randomUUID();
}

export function confirmDialog(options: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  closeOnBackdrop?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    emit({
      id: createId(),
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      variant: options.variant ?? 'default',
      closeOnBackdrop: options.closeOnBackdrop ?? options.variant !== 'destructive',
      resolve: (v) => resolve(v === true),
    });
  });
}

export function alertDialog(options: {
  title: string;
  description?: string;
  confirmLabel?: string;
}): Promise<void> {
  return new Promise((resolve) => {
    emit({
      id: createId(),
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? 'OK',
      cancelLabel: undefined,
      closeOnBackdrop: true,
      resolve: () => resolve(),
    });
  });
}

export function promptDialog(options: {
  title: string;
  description?: string;
  defaultValue?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireInput?: boolean;
}): Promise<string | null> {
  return new Promise((resolve) => {
    emit({
      id: createId(),
      title: options.title,
      description: options.description,
      inputDefaultValue: options.defaultValue ?? '',
      inputLabel: options.inputLabel,
      inputPlaceholder: options.inputPlaceholder,
      confirmLabel: options.confirmLabel ?? 'OK',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      requireInput: options.requireInput,
      closeOnBackdrop: true,
      resolve: (v) => {
        if (v === false || v === null) resolve(null);
        else if (typeof v === 'string') resolve(v);
        else resolve('');
      },
    });
  });
}

export function closeDialog() {
  emit(null);
}

export function resolveDialog(id: string, value: boolean | string | null) {
  emit(null);
  void id;
  void value;
}
