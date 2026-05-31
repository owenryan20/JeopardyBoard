import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { closeDialog, subscribeDialog, type DialogRequest } from '../../lib/dialog';
import './AppDialog.css';

export function AppDialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [inputValue, setInputValue] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const pendingRef = useRef<DialogRequest | null>(null);

  useEffect(() => {
    return subscribeDialog((req) => {
      if (req) {
        previousFocus.current = document.activeElement as HTMLElement | null;
        pendingRef.current = req;
        setInputValue(req.inputDefaultValue ?? '');
        setRequest(req);
      } else {
        setRequest(null);
        pendingRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    if (!request) {
      previousFocus.current?.focus?.();
      return;
    }

    const timer = window.setTimeout(() => {
      if (request.inputLabel !== undefined || request.inputDefaultValue !== undefined) {
        inputRef.current?.focus();
        inputRef.current?.select();
      } else {
        const cancelBtn = dialogRef.current?.querySelector<HTMLElement>('[data-dialog-cancel]');
        const confirmBtn = dialogRef.current?.querySelector<HTMLElement>('[data-dialog-confirm]');
        if (request.variant === 'destructive') {
          cancelBtn?.focus();
        } else {
          confirmBtn?.focus();
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [request]);

  const finish = (value: boolean | string | null) => {
    const req = pendingRef.current;
    closeDialog();
    req?.resolve(value);
  };

  useEffect(() => {
    if (!request) return;

    const isPrompt =
      request.inputLabel !== undefined || request.inputDefaultValue !== undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'TEXTAREA') return;
        e.preventDefault();
        if (isPrompt) {
          if (!request.requireInput || inputValue.trim()) finish(inputValue);
        } else {
          finish(true);
        }
      }
      if (e.key === 'Tab' && dialogRef.current) {
        trapFocus(e, dialogRef.current);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [request, inputValue]);

  if (!request) return null;

  const isPrompt =
    request.inputLabel !== undefined || request.inputDefaultValue !== undefined;
  const isAlert = request.cancelLabel === undefined && !isPrompt;
  const confirmDisabled =
    request.loading ||
    (isPrompt && request.requireInput && !inputValue.trim());

  return createPortal(
    <div
      className="modal-overlay app-dialog-overlay"
      onClick={() => {
        if (request.closeOnBackdrop) finish(false);
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`modal app-dialog${request.variant === 'destructive' ? ' app-dialog-destructive' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby={request.description ? 'app-dialog-desc' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="app-dialog-title">{request.title}</h2>
        </div>
        <div className="modal-body">
          {request.description && (
            <p id="app-dialog-desc" className="app-dialog-desc">
              {request.description}
            </p>
          )}
          {isPrompt && (
            <label className="app-dialog-input-label">
              {request.inputLabel && <span>{request.inputLabel}</span>}
              <input
                ref={inputRef}
                type="text"
                className="input"
                value={inputValue}
                placeholder={request.inputPlaceholder}
                onChange={(e) => setInputValue(e.target.value)}
                aria-label={request.inputLabel ?? request.title}
              />
            </label>
          )}
        </div>
        <div className="modal-footer">
          {!isAlert && (
            <button
              type="button"
              className="btn"
              data-dialog-cancel
              disabled={request.loading}
              onClick={() => finish(false)}
            >
              {request.cancelLabel ?? 'Cancel'}
            </button>
          )}
          <button
            type="button"
            className={`btn${request.variant === 'destructive' ? ' btn-danger' : ' btn-primary'}`}
            data-dialog-confirm
            disabled={confirmDisabled}
            onClick={() => {
              if (isPrompt) finish(inputValue);
              else finish(true);
            }}
          >
            {request.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function trapFocus(e: KeyboardEvent, container: HTMLElement) {
  const focusable = container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
