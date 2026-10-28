import { describe, it, expect } from 'vitest';
import type { ClipItem } from '../../shared/types';
import { convertToStoredClips, getClipStats } from './clips';

const text = (id: string, content: string): ClipItem => ({ id, type: 'text', content });

describe('convertToStoredClips', () => {
  it('keeps an empty slot that sits before a later clip so positions are preserved', () => {
    const stored = convertToStoredClips(
      [text('a', 'A'), text('blank', ''), text('c', 'C'), text('d', 'D')],
      {}
    );

    expect(stored.map((s) => s.clip.content)).toEqual(['A', '', 'C', 'D']);
    expect(stored[2].clip.id).toBe('c');
    expect(stored[3].clip.id).toBe('d');
  });

  it('trims the trailing empty slots', () => {
    const stored = convertToStoredClips(
      [text('a', 'A'), text('b', 'B'), text('e1', ''), text('e2', '   ')],
      {}
    );

    expect(stored.map((s) => s.clip.id)).toEqual(['a', 'b']);
  });

  it('stores nothing for a list of empty slots', () => {
    expect(convertToStoredClips([text('e1', ''), text('e2', '')], {})).toEqual([]);
  });

  it('keeps a lock on the row it was set on when a row above it is blank', () => {
    const stored = convertToStoredClips(
      [text('a', 'A'), text('blank', ''), text('c', 'C'), text('d', 'D')],
      { 3: true }
    );

    expect(stored.map((s) => s.isLocked)).toEqual([false, false, false, true]);
  });

  it('never marks an empty slot as locked', () => {
    const stored = convertToStoredClips([text('a', 'A'), text('blank', ''), text('c', 'C')], {
      1: true,
    });

    expect(stored[1].isLocked).toBe(false);
  });
});

describe('getClipStats', () => {
  it('counts only the slots that hold a clip', () => {
    const stored = convertToStoredClips(
      [text('a', 'A'), text('blank', ''), text('c', 'C'), text('d', 'D')],
      { 3: true }
    );

    expect(getClipStats(stored)).toEqual({ clipCount: 3, lockedCount: 1 });
  });
});
