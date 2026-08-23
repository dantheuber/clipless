import { describe, it, expect, vi } from 'vitest';
import {
  newClipId,
  createEmptyClip,
  createTextClip,
  createHtmlClip,
  createRtfClip,
  createImageClip,
  createBookmarkClip,
  clipText,
  shrinkClips,
  updateClipsLength,
} from './utils';

vi.mock('../../utils/languageDetection', () => ({
  detectLanguage: (content: string) => (content.includes('{') ? 'json' : null),
  isCode: (content: string) => content.includes('{'),
}));

describe('newClipId', () => {
  it('returns a unique id each time', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newClipId()));
    expect(ids.size).toBe(50);
  });

  it('uses Web Crypto when present', () => {
    expect(newClipId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('still produces unique ids without Web Crypto', () => {
    vi.stubGlobal('crypto', undefined);
    try {
      const ids = new Set(Array.from({ length: 20 }, () => newClipId()));
      expect(ids.size).toBe(20);
      expect([...ids][0]).toMatch(/^clip-/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('clip creators', () => {
  it('give every clip an id, including empty ones', () => {
    const clips = [
      createEmptyClip(),
      createTextClip('x'),
      createHtmlClip('<p>x</p>'),
      createRtfClip('{\\rtf1 x}'),
      createImageClip('img'),
      createBookmarkClip('t', 'https://x'),
    ];
    for (const clip of clips) expect(typeof clip.id).toBe('string');
    expect(new Set(clips.map((c) => c.id)).size).toBe(clips.length);
  });

  it('detects language for text clips when enabled', () => {
    expect(createTextClip('{"a":1}')).toMatchObject({ language: 'json', isCode: true });
    expect(createTextClip('{"a":1}', false)).not.toHaveProperty('language');
    const plain = createTextClip('hello');
    expect(plain).not.toHaveProperty('language');
    expect(plain.isCode).toBe(false);
  });

  it('carries extracted text on html and rtf clips when given', () => {
    expect(createHtmlClip('<p>x</p>', 'x').text).toBe('x');
    expect(createHtmlClip('<p>x</p>')).not.toHaveProperty('text');
    expect(createRtfClip('{\\rtf1 x}', 'x').text).toBe('x');
    expect(createRtfClip('{\\rtf1 x}')).not.toHaveProperty('text');
  });

  it('keeps image ids and thumbnails only when given', () => {
    expect(createImageClip('id', 'id', 'data:thumb')).toMatchObject({
      imageId: 'id',
      thumbnailDataUrl: 'data:thumb',
    });
    expect(createImageClip('data:image/png;base64,x')).not.toHaveProperty('imageId');
  });

  it('stores a bookmark with its url as content', () => {
    expect(createBookmarkClip('Title', 'https://x')).toMatchObject({
      type: 'bookmark',
      content: 'https://x',
      title: 'Title',
      url: 'https://x',
    });
  });
});

describe('clipText', () => {
  it('reads extracted text for html and rtf, falling back to content', () => {
    expect(clipText(createHtmlClip('<p>x</p>', 'x'))).toBe('x');
    expect(clipText(createHtmlClip('<p>x</p>'))).toBe('<p>x</p>');
    expect(clipText(createRtfClip('{\\rtf1 x}', 'x'))).toBe('x');
  });

  it('reads title plus url for a bookmark', () => {
    expect(clipText(createBookmarkClip('Title', 'https://x'))).toBe('Title\nhttps://x');
    expect(clipText({ id: 'b', type: 'bookmark', content: 'https://y' })).toBe('\nhttps://y');
  });

  it('has no text for an image and the content for text', () => {
    expect(clipText(createImageClip('img'))).toBe('');
    expect(clipText(createTextClip('hello'))).toBe('hello');
  });
});

describe('updateClipsLength', () => {
  it('pads with empty clips that each have an id', () => {
    const result = updateClipsLength([createTextClip('a')], 3);
    expect(result).toHaveLength(3);
    expect(result[1].content).toBe('');
    expect(result[1].id).not.toBe(result[2].id);
  });

  it('truncates from the end', () => {
    const clips = [createTextClip('a'), createTextClip('b'), createTextClip('c')];
    expect(updateClipsLength(clips, 2).map((c) => c.content)).toEqual(['a', 'b']);
  });

  it('returns a copy when the length already matches', () => {
    const clips = [createTextClip('a')];
    const result = updateClipsLength(clips, 1);
    expect(result).toEqual(clips);
    expect(result).not.toBe(clips);
  });
});

describe('shrinkClips', () => {
  const clips = ['a', 'b', 'c', 'd', 'e'].map((c) => createTextClip(c));

  it('drops the oldest unlocked clips first and keeps the locks on their clips', () => {
    const result = shrinkClips(clips, { 1: true, 4: true }, 3);
    expect(result.clips.map((c) => c.content)).toEqual(['a', 'b', 'e']);
    expect(result.locked).toEqual({ 1: true, 2: true });
  });

  it('drops the oldest locked clips only when the locked ones alone exceed the limit', () => {
    const result = shrinkClips(clips, { 1: true, 2: true, 3: true, 4: true }, 2);
    expect(result.clips.map((c) => c.content)).toEqual(['b', 'c']);
    expect(result.locked).toEqual({ 1: true });
  });

  it('pads when the list is shorter than the limit and never locks row 0', () => {
    const result = shrinkClips(clips.slice(0, 2), { 0: true, 1: true }, 4);
    expect(result.clips).toHaveLength(4);
    expect(result.clips[3].content).toBe('');
    expect(result.locked).toEqual({ 1: true });
  });
});
