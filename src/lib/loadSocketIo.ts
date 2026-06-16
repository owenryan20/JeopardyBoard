import { SOCKET_IO_CDN_URL } from './buzzIn';
import type { BuzzInSocketFactory } from '../types/buzzIn';

let loadPromise: Promise<BuzzInSocketFactory> | null = null;

export function loadSocketIo(): Promise<BuzzInSocketFactory> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Socket.IO can only be loaded in the browser'));
  }

  if (window.io) {
    return Promise.resolve(window.io);
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${SOCKET_IO_CDN_URL}"]`,
      );
      if (existing) {
        if (window.io) {
          resolve(window.io);
          return;
        }
        existing.addEventListener('load', () => {
          if (window.io) resolve(window.io);
          else reject(new Error('Socket.IO loaded but io is unavailable'));
        });
        existing.addEventListener('error', () => {
          reject(new Error('Failed to load Socket.IO from CDN'));
        });
        return;
      }

      const script = document.createElement('script');
      script.src = SOCKET_IO_CDN_URL;
      script.async = true;
      script.onload = () => {
        if (window.io) resolve(window.io);
        else reject(new Error('Socket.IO loaded but io is unavailable'));
      };
      script.onerror = () => reject(new Error('Failed to load Socket.IO from CDN'));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}
