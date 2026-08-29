/** Helpers for optional audio clip range and volume on attachments. */

export function normalizeAudioVolume(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const clamped = Math.min(1, Math.max(0, value));
  if (clamped >= 0.999) return undefined; // default full volume — omit from save
  return Math.round(clamped * 1000) / 1000;
}

export function resolveAudioVolume(value: unknown): number {
  return normalizeAudioVolume(value) ?? 1;
}

export function normalizeAudioClipBound(
  startRaw: unknown,
  endRaw: unknown,
  durationSec?: number,
): { audioStartSec?: number; audioEndSec?: number } {
  const duration =
    typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec > 0
      ? durationSec
      : undefined;

  let start =
    typeof startRaw === 'number' && Number.isFinite(startRaw) && startRaw > 0
      ? startRaw
      : undefined;
  let end =
    typeof endRaw === 'number' && Number.isFinite(endRaw) && endRaw > 0
      ? endRaw
      : undefined;

  if (start !== undefined && duration !== undefined) {
    start = Math.min(start, Math.max(0, duration - 0.05));
  }
  if (end !== undefined && duration !== undefined) {
    end = Math.min(end, duration);
  }
  if (start !== undefined && end !== undefined && end <= start) {
    end = undefined;
  }
  if (start !== undefined) start = Math.round(start * 1000) / 1000;
  if (end !== undefined) end = Math.round(end * 1000) / 1000;

  // Treat full-file range as unset
  if (start !== undefined && start <= 0.001) start = undefined;
  if (
    end !== undefined
    && duration !== undefined
    && end >= duration - 0.05
    && start === undefined
  ) {
    end = undefined;
  }

  return {
    audioStartSec: start,
    audioEndSec: end,
  };
}

export function resolveClipBounds(
  startSec: number | undefined,
  endSec: number | undefined,
  durationSec: number,
): { start: number; end: number } {
  const duration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0;
  const start = Math.max(0, startSec ?? 0);
  const end =
    endSec !== undefined && Number.isFinite(endSec) && endSec > start
      ? Math.min(endSec, duration || endSec)
      : duration || Math.max(start + 0.1, endSec ?? start + 0.1);
  return { start: Math.min(start, Math.max(0, end - 0.05)), end };
}

/** Move a clip window by delta seconds without changing its length. */
export function shiftClipWindow(
  startSec: number,
  endSec: number,
  deltaSec: number,
  durationSec: number,
): { start: number; end: number } {
  const duration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0;
  const length = Math.max(0.05, endSec - startSec);
  if (duration <= 0) {
    const start = Math.max(0, startSec + deltaSec);
    return { start, end: start + length };
  }
  const maxStart = Math.max(0, duration - length);
  const start = Math.min(maxStart, Math.max(0, startSec + deltaSec));
  return { start, end: start + length };
}

export function formatAudioClock(seconds: number, withMillis = true): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return withMillis ? '00:00.000' : '00:00';
  }
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  const mm = m.toString().padStart(2, '0');
  if (!withMillis) {
    return `${mm}:${Math.floor(s).toString().padStart(2, '0')}`;
  }
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  return `${mm}:${whole.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function parseAudioClock(value: string): number | null {
  const trimmed = value.trim();
  const match = /^(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(trimmed);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const millis = match[3] ? Number(match[3].padEnd(3, '0')) : 0;
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) return null;
  return minutes * 60 + seconds + millis / 1000;
}
