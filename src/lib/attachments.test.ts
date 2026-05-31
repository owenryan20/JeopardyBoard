import { describe, expect, it } from 'vitest';
import { migrateClueAttachments } from './attachments';
import type { Clue } from '../types/board';

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
