import { describe, expect, it } from 'vitest';
import { migrateClueAttachments, normalizeAttachment, normalizeAttachmentDisplayMode, normalizeAttachmentLayout } from './attachments';
import type { Clue } from '../types/board';

describe('normalizeAttachmentDisplayMode', () => {
  it('preserves known modes and defaults unknown values', () => {
    expect(normalizeAttachmentDisplayMode('progressive')).toBe('progressive');
    expect(normalizeAttachmentDisplayMode('single')).toBe('single');
    expect(normalizeAttachmentDisplayMode('all-at-once')).toBe('all-at-once');
    expect(normalizeAttachmentDisplayMode(undefined)).toBe('all-at-once');
    expect(normalizeAttachmentDisplayMode('invalid')).toBe('all-at-once');
  });
});

describe('normalizeAttachmentLayout', () => {
  it('defaults unknown values to stack', () => {
    expect(normalizeAttachmentLayout(undefined)).toBe('stack');
    expect(normalizeAttachmentLayout('grid')).toBe('grid');
    expect(normalizeAttachmentLayout('invalid')).toBe('stack');
  });
});

describe('normalizeAttachment', () => {
  it('preserves optional attachment clue text', () => {
    const att = normalizeAttachment({
      id: 'a1',
      type: 'image',
      title: '',
      url: 'https://example.com/x.png',
      clue: '  What is this?  ',
    });
    expect(att?.clue).toBe('What is this?');
  });
});

describe('migrateClueAttachments', () => {
  it('migrates legacy single media into attachments array', () => {
    const clue: Clue = {
      id: 'c1',
      type: 'clue',
      value: 100,
      clue: 'Q',
      answer: 'A',
      hostNotes: '',
      isDailyDouble: false,
      tags: [],
      isUsed: false,
      media: { type: 'image', storage: 'url', url: 'https://example.com/x.png', altText: 'pic' },
    };
    const migrated = migrateClueAttachments(clue);
    expect(migrated.attachments).toHaveLength(1);
    expect(migrated.attachments?.[0].url).toBe('https://example.com/x.png');
    expect(migrated.attachments?.[0].alt).toBe('pic');
    expect(migrated.media).toBeUndefined();
  });
});
