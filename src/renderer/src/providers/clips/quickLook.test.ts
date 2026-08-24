import { describe, it, expect, vi } from 'vitest';
import type { ClipItem } from '../../../../shared/types';
import {
  INITIAL_QUICK_LOOK,
  closeState,
  createQuickLookNavigation,
  hasContent,
  openOn,
  quickLookPosition,
  positionFromNavigation,
  targetFromNavigation,
  walkTarget,
  walkable,
  type VisibleClip,
} from './quickLook';

const clip = (id: string, content: string, extra: Partial<ClipItem> = {}): ClipItem => ({
  id,
  type: 'text',
  content,
  ...extra,
});

const all = (clips: ClipItem[]): VisibleClip[] =>
  clips.map((c, originalIndex) => ({ clip: c, originalIndex }));

describe('quick look state', () => {
  it('opens by id with the text view and remembers the row to return focus to', () => {
    const state = openOn({ ...INITIAL_QUICK_LOOK, view: 'rendered', wrap: true }, 'b', 4);
    expect(state).toEqual({
      openClipId: 'b',
      view: 'text',
      editing: false,
      returnFocusIndex: 4,
      wrap: true,
    });
  });

  it('keeps the return row when walking to another clip', () => {
    const opened = openOn(INITIAL_QUICK_LOOK, 'b', 4);
    expect(openOn({ ...opened, editing: true }, 'c').returnFocusIndex).toBe(4);
    expect(openOn(opened, 'c').editing).toBe(false);
  });

  it('closes and forgets the row but keeps wrap for the session', () => {
    const closed = closeState({ ...openOn(INITIAL_QUICK_LOOK, 'b', 4), wrap: true, editing: true });
    expect(closed.openClipId).toBeNull();
    expect(closed.returnFocusIndex).toBeNull();
    expect(closed.editing).toBe(false);
    expect(closed.wrap).toBe(true);
  });

  it('treats whitespace-only text and empty images as having no content', () => {
    const trim = vi.spyOn(String.prototype, 'trim');
    expect(hasContent(clip('a', '  \n'))).toBe(false);
    expect(hasContent(clip('i', '', { type: 'image' }))).toBe(false);
    expect(hasContent(clip('i', 'img-id', { type: 'image', imageId: 'img-id' }))).toBe(true);
    expect(hasContent(clip('b', '', { type: 'bookmark', title: 'T', url: 'https://x' }))).toBe(
      true
    );
    expect(trim).not.toHaveBeenCalled();
    trim.mockRestore();
  });

  it('uses bookmark URL/content fallbacks and extracted rich-text content', () => {
    expect(hasContent(clip('url', '', { type: 'bookmark', title: ' ', url: 'https://x' }))).toBe(
      true
    );
    expect(hasContent(clip('fallback', 'https://x', { type: 'bookmark' }))).toBe(true);
    expect(hasContent(clip('empty-bookmark', ' ', { type: 'bookmark' }))).toBe(false);
    expect(hasContent(clip('html', '<b>markup only</b>', { type: 'html', text: ' ' }))).toBe(false);
    expect(hasContent(clip('legacy-html', '<b>readable fallback</b>', { type: 'html' }))).toBe(true);
    expect(hasContent(clip('rtf', '{\\rtf1 markup only}', { type: 'rtf', text: 'readable' }))).toBe(
      true
    );
  });
});

describe('quickLookPosition', () => {
  const clips = [clip('a', 'one'), clip('b', ''), clip('c', 'three'), clip('d', 'four')];

  it('counts only clips with content and numbers from the visible set', () => {
    const position = quickLookPosition(clips, all(clips), 'c', false);
    expect(position).toEqual({
      index: 2,
      visibleIndex: 1,
      visibleCount: 3,
      hidden: false,
      label: '2 / 3',
    });
  });

  it('renumbers when a clip lands above: the index follows the id', () => {
    const landed = [clip('new', 'fresh'), ...clips];
    const position = quickLookPosition(landed, all(landed), 'c', false);
    expect(position.index).toBe(3);
    expect(position.label).toBe('3 / 4');
  });

  it('reports the clip gone when its id left the list', () => {
    const rotated = clips.slice(0, 2);
    const position = quickLookPosition(rotated, all(rotated), 'c', false);
    expect(position.index).toBe(-1);
    expect(position.hidden).toBe(false);
  });

  it('says filtered and counts the filtered set', () => {
    const visible = all(clips).filter(({ clip: c }) => c.id !== 'a');
    expect(quickLookPosition(clips, visible, 'd', true).label).toBe('2 / 2 filtered');
  });

  it('says hidden by filter when the open clip is not in the visible set', () => {
    const visible = all(clips).filter(({ clip: c }) => c.id === 'd');
    const position = quickLookPosition(clips, visible, 'a', true);
    expect(position.hidden).toBe(true);
    expect(position.label).toBe('hidden by filter');
    expect(position.index).toBe(0);
  });
});

describe('walkTarget', () => {
  const clips = [clip('a', 'one'), clip('b', ''), clip('c', 'three'), clip('d', 'four')];

  it('skips empty rows in both directions and stops at the ends', () => {
    expect(walkTarget(clips, all(clips), 'a', 1)).toBe('c');
    expect(walkTarget(clips, all(clips), 'c', -1)).toBe('a');
    expect(walkTarget(clips, all(clips), 'a', -1)).toBeNull();
    expect(walkTarget(clips, all(clips), 'd', 1)).toBeNull();
  });

  it('walks the visible set only', () => {
    const visible = all(clips).filter(({ clip: c }) => c.id !== 'c');
    expect(walkTarget(clips, visible, 'a', 1)).toBe('d');
    expect(walkable(visible).map(({ clip: c }) => c.id)).toEqual(['a', 'd']);
  });

  it('jumps to the nearest visible clip from a clip the filter hides', () => {
    const visible = all(clips).filter(({ clip: c }) => c.id === 'a' || c.id === 'd');
    expect(walkTarget(clips, visible, 'c', 1)).toBe('d');
    expect(walkTarget(clips, visible, 'c', -1)).toBe('a');
  });

  it('returns null when the clip is gone or nothing lies in that direction', () => {
    expect(walkTarget(clips, all(clips), 'zzz', 1)).toBeNull();
    const onlyLast = all(clips).filter(({ clip: c }) => c.id === 'd');
    expect(walkTarget(clips, onlyLast, 'a', -1)).toBeNull();
    const onlyFirst = all(clips).filter(({ clip: c }) => c.id === 'a');
    expect(walkTarget(clips, onlyFirst, 'd', 1)).toBeNull();
  });
});

describe('shared navigation model', () => {
  it('derives content once, then answers position and both neighbours without rereading clips', () => {
    let reads = 0;
    const clips = Array.from({ length: 10_000 }, (_, i) => {
      const item = { id: `c${i}`, type: 'text' as const } as ClipItem;
      Object.defineProperty(item, 'content', {
        enumerable: true,
        get: () => {
          reads++;
          return i % 10 === 0 ? '' : `clip ${i}`;
        },
      });
      return item;
    });
    const navigation = createQuickLookNavigation(clips, all(clips));
    expect(reads).toBe(clips.length);
    reads = 0;
    expect(positionFromNavigation(navigation, 'c5001', false).label).toBe('4501 / 9000');
    expect(targetFromNavigation(navigation, 'c5001', -1)).toBe('c4999');
    expect(targetFromNavigation(navigation, 'c5001', 1)).toBe('c5002');
    expect(reads).toBe(0);
  });
});
