import { describe, it, expect } from 'vitest';
import type { Match } from '../../../../shared/types';
import {
  groupByMatch,
  prismLanguage,
  segmentLine,
  splitLines,
  tokenizeLine,
  type Run,
} from './tokens';

const m = (group: string, value: string, start: number): Match => ({
  group,
  value,
  start,
  end: start + value.length,
  termId: 't',
});

describe('tokenizeLine', () => {
  it('returns Prism token runs for a known language', () => {
    const runs = tokenizeLine('{"ip": "10.0.0.1"}', 'json');
    const string = runs.find((r) => r.text === '"10.0.0.1"');
    expect(string?.classes).toEqual(['string']);
    expect(runs.find((r) => r.text === '"ip"')?.classes).toEqual(['property']);
    expect(runs.map((r) => r.text).join('')).toBe('{"ip": "10.0.0.1"}');
  });

  it('gives one plain run for prose or an unknown language and none for an empty line', () => {
    expect(tokenizeLine('hello 10.0.0.1', null)).toEqual([{ text: 'hello 10.0.0.1', classes: [] }]);
    expect(tokenizeLine('x', 'klingon')).toEqual([{ text: 'x', classes: [] }]);
    expect(tokenizeLine('', 'json')).toEqual([]);
  });

  it('flattens nested tokens with their parents classes', () => {
    // bash string interpolation produces nested tokens
    const runs = tokenizeLine('echo "a ${HOME} b"', 'bash');
    expect(runs.map((r) => r.text).join('')).toBe('echo "a ${HOME} b"');
    expect(runs.some((r) => r.classes.length > 1)).toBe(true);
  });
});

describe('segmentLine with chips inside Prism tokens', () => {
  it('splits a JSON string token at the IP inside it', () => {
    const line = '{"ip": "10.0.0.1"}';
    const runs = tokenizeLine(line, 'json');
    const ip = m('ip', '10.0.0.1', line.indexOf('10.0.0.1'));
    const segments = segmentLine(runs, 0, [ip]);
    const texts = segments.map((s) => ({
      t: line.slice(s.start, s.end),
      cls: s.classes,
      hit: !!s.match,
    }));
    expect(texts).toContainEqual({ t: '"', cls: ['string'], hit: false });
    expect(texts).toContainEqual({ t: '10.0.0.1', cls: ['string'], hit: true });
    // the closing quote is its own piece of the string token, after the chip
    const closing = texts.filter((x) => x.t === '"' && x.cls[0] === 'string');
    expect(closing).toHaveLength(2);
    expect(segments.map((s) => line.slice(s.start, s.end)).join('')).toBe(line);
  });

  it('a match spanning a token boundary splits both tokens', () => {
    const runs: Run[] = [
      { text: 'foo ', classes: [] },
      { text: 'bar', classes: ['keyword'] },
    ];
    const match = m('x', 'o ba', 2);
    const segments = segmentLine(runs, 0, [match]);
    expect(segments).toEqual([
      { start: 0, end: 2, classes: [], match: null },
      { start: 2, end: 4, classes: [], match },
      { start: 4, end: 6, classes: ['keyword'], match },
      { start: 6, end: 7, classes: ['keyword'], match: null },
    ]);
    const groups = groupByMatch(segments);
    expect(groups.map((g) => [g.match?.value ?? null, g.segments.length])).toEqual([
      [null, 1],
      ['o ba', 2],
      [null, 1],
    ]);
  });

  it('converts text offsets with lineStart', () => {
    const runs: Run[] = [{ text: 'ip 1.1.1.1', classes: [] }];
    const segments = segmentLine(runs, 100, [m('ip', '1.1.1.1', 103)]);
    expect(segments.map((s) => [s.start, s.end, !!s.match])).toEqual([
      [0, 3, false],
      [3, 10, true],
    ]);
  });

  it('does not merge two adjacent matches into one chip', () => {
    const runs: Run[] = [{ text: 'ab', classes: [] }];
    const a = m('x', 'a', 0);
    const b = m('x', 'b', 1);
    const groups = groupByMatch(segmentLine(runs, 0, [a, b]));
    expect(groups).toHaveLength(2);
  });
});

describe('splitLines', () => {
  it('gives each line its offset and the matches on it, dropping \\r', () => {
    const text = 'one 1.1.1.1\r\ntwo\nthree a@b.co';
    const lines = splitLines(text, [m('ip', '1.1.1.1', 4), m('email', 'a@b.co', 23)]);
    expect(lines.map((l) => [l.start, l.text, l.matches.length])).toEqual([
      [0, 'one 1.1.1.1', 1],
      [13, 'two', 0],
      [17, 'three a@b.co', 1],
    ]);
  });

  it('drops a later match that overlaps an earlier one', () => {
    const lines = splitLines('abcdef', [m('x', 'abcd', 0), m('y', 'cdef', 2)]);
    expect(lines[0].matches.map((x) => x.group)).toEqual(['x']);
  });

  it('keeps a match that crosses a line break on both lines', () => {
    const lines = splitLines('ab\ncd', [m('x', 'b\nc', 1)]);
    expect(lines[0].matches).toHaveLength(1);
    expect(lines[1].matches).toHaveLength(1);
    expect(splitLines('', [])).toEqual([{ start: 0, text: '', matches: [] }]);
    // a match that ends on the line break belongs to the first line only
    const edge = splitLines('ab\ncd', [m('x', 'b\n', 1)]);
    expect(edge[0].matches).toHaveLength(1);
    expect(edge[1].matches).toHaveLength(0);
  });
});

describe('prismLanguage', () => {
  it('maps detected languages to registered Prism names', () => {
    expect(prismLanguage('json', true)).toBe('json');
    expect(prismLanguage('html', true)).toBe('markup');
    expect(prismLanguage('xml', true)).toBe('markup');
    expect(prismLanguage('cobol', true)).toBeNull();
    expect(prismLanguage('json', false)).toBeNull();
    expect(prismLanguage(undefined, true)).toBeNull();
  });
});
