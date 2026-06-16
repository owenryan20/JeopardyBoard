import type { BuzzInBuzz, BuzzInBuzzesPayload } from '../types/buzzIn';

export const BUZZIN_LIVE_URL = 'https://buzzin.live';
export const BUZZIN_SOCKET_PATH = '/socket.io';
export const SOCKET_IO_CDN_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.5.0/socket.io.js';

export function normalizeBuzzes(data: unknown): BuzzInBuzz[] {
  if (!data || typeof data !== 'object') return [];

  const payload = data as BuzzInBuzzesPayload;
  const list = payload.buzzes ?? payload.buzzArr ?? [];
  if (!Array.isArray(list)) return [];

  return list
    .filter((item): item is BuzzInBuzz => Boolean(item && typeof item.username === 'string'))
    .map((item) => ({
      username: item.username,
      id: item.id,
      time: item.time,
    }));
}

export function buzzKey(buzz: BuzzInBuzz, index: number): string {
  return buzz.id ? `${buzz.id}-${index}` : `${buzz.username}-${buzz.time ?? index}`;
}

export function buzzIdentity(buzz: BuzzInBuzz, index: number): string {
  if (buzz.id) return buzz.id;
  return `${buzz.username}\0${buzz.time ?? index}`;
}

/** Buzzes present in `next` but not in `previous` (ignores reordering of existing buzzes). */
export function findNewBuzzes(previous: BuzzInBuzz[], next: BuzzInBuzz[]): BuzzInBuzz[] {
  const known = new Set(previous.map((buzz, index) => buzzIdentity(buzz, index)));
  return next.filter((buzz, index) => {
    const key = buzzIdentity(buzz, index);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
}
