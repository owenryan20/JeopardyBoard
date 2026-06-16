import { useEffect, useState } from 'react';
import { subscribeToast } from '../../lib/toast';
import './ToastHost.css';

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<'default' | 'buzz'>('default');

  useEffect(
    () =>
      subscribeToast((nextMessage, nextVariant = 'default') => {
        setMessage(nextMessage);
        setVariant(nextVariant);
      }),
    [],
  );

  if (!message) return null;

  return (
    <div
      className={`toast-host${variant === 'buzz' ? ' toast-host-buzz' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
