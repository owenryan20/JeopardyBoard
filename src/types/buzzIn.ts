export interface BuzzInBuzz {
  username: string;
  id?: string;
  time?: number;
}

export interface BuzzInGameCreatedPayload {
  gameCode?: string | number;
  hostVerifyCode?: string | number;
  playerLimit?: number;
}

export interface BuzzInErrPayload {
  message?: string;
}

export interface BuzzInBuzzesPayload {
  buzzes?: BuzzInBuzz[];
  buzzArr?: BuzzInBuzz[];
}

export interface BuzzInSocket {
  connected: boolean;
  on(event: string, callback: (...args: unknown[]) => void): BuzzInSocket;
  emit(event: string, ...args: unknown[]): BuzzInSocket;
  disconnect(): BuzzInSocket;
  removeAllListeners(event?: string): BuzzInSocket;
}

export type BuzzInSocketFactory = (
  url: string,
  options?: { transports?: string[]; path?: string },
) => BuzzInSocket;

declare global {
  interface Window {
    io?: BuzzInSocketFactory;
  }
}
