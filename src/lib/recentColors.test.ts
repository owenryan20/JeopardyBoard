import { describe, expect, it, beforeEach } from 'vitest';
import {
  COLOR_PRESETS,
  loadRecentColors,
  MAX_RECENT_COLORS,
  normalizeHexColor,
  rememberRecentColor,
  RECENT_COLORS_KEY,
} from './recentColors';

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const memory = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
  });
  return memory;
}

describe('normalizeHexColor', () => {
  it('normalizes short and full hex', () => {
    expect(normalizeHexColor('#AbC')).toBe('#aabbcc');
    expect(normalizeHexColor('  #DC2626 ')).toBe('#dc2626');
    expect(normalizeHexColor('red')).toBeNull();
  });
});

describe('rememberRecentColor', () => {
  beforeEach(() => {
    installMemoryLocalStorage().clear();
  });

  it('stores newest first and dedupes', () => {
    rememberRecentColor('#dc2626');
    rememberRecentColor('#16a34a');
    rememberRecentColor('#dc2626');
    expect(loadRecentColors()).toEqual(['#dc2626', '#16a34a']);
    expect(localStorage.getItem(RECENT_COLORS_KEY)).toContain('#dc2626');
  });

  it('caps recent list length', () => {
    for (let i = 0; i < MAX_RECENT_COLORS + 3; i += 1) {
      rememberRecentColor(`#${i.toString(16).padStart(6, '0')}`);
    }
    expect(loadRecentColors()).toHaveLength(MAX_RECENT_COLORS);
  });
});

describe('COLOR_PRESETS', () => {
  it('includes valid hex colors', () => {
    expect(COLOR_PRESETS.length).toBeGreaterThan(0);
    for (const preset of COLOR_PRESETS) {
      expect(normalizeHexColor(preset.value)).toBe(preset.value.toLowerCase());
    }
  });
});
