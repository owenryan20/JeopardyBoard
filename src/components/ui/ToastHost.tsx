import { useEffect, useState } from 'react';
import { subscribeToast } from '../../lib/toast';
import './ToastHost.css';

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeToast(setMessage), []);

  if (!message) return null;

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {message}
    </div>
  );
}
