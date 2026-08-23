import { describe, it, expect } from 'vitest';
import type { ClipItem } from '../../../../shared/types';
import {
  EMPTY_PINS,
  clearPins,
  diffClips,
  droppedNotice,
  nextPinnedAt,
  parsePinKey,
  pinsByGroup,
  prunePins,
  setPins,
  sortedPins,
  togglePins,
} from './pins';

const clip = (id: string, content: string, extra: Partial<ClipItem> = {}): ClipItem => ({
  id,
  type: 'text',
  content,
  ...extra,
});

const keysOf = (entries: [string, string[]][]): Map<string, Set<string>> =>
  new Map(entries.map(([id, keys]) => [id, new Set(keys)]));

describe('pin writers', () => {
  it('parses a key at the first pipe only', () => {
    expect(parsePinKey('url|https://a.b/c?x=1|2')).toEqual({
      group: 'url',
      value: 'https://a.b/c?x=1|2',
    });
  });

  it('toggles one key on and off', () => {
    const on = togglePins(EMPTY_PINS, ['ip|1.1.1.1'], 0);
    expect(on.get('ip|1.1.1.1')).toEqual({ group: 'ip', value: '1.1.1.1', pinnedAt: 0 });
    const off = togglePins(on, ['ip|1.1.1.1'], 1);
    expect(off.size).toBe(0);
  });

  it('toggling a set pins the missing ones and unpins all only when all are pinned', () => {
    const one = setPins(EMPTY_PINS, ['ip|1.1.1.1'], true, 0);
    const both = togglePins(one, ['ip|1.1.1.1', 'email|a@b.co'], 5);
    expect(both.size).toBe(2);
    expect(both.get('ip|1.1.1.1')?.pinnedAt).toBe(0); // kept its order
    expect(both.get('email|a@b.co')?.pinnedAt).toBe(5);
    const none = togglePins(both, ['ip|1.1.1.1', 'email|a@b.co'], 9);
    expect(none.size).toBe(0);
  });

  it('toggling nothing returns the same map', () => {
    expect(togglePins(EMPTY_PINS, [], 0)).toBe(EMPTY_PINS);
  });

  it('setPins off removes keys and ignores ones that are not pinned', () => {
    const pins = setPins(EMPTY_PINS, ['a|1', 'b|2'], true, 0);
    expect(setPins(pins, ['a|1', 'c|3'], false).size).toBe(1);
  });

  it('clearPins empties the map', () => {
    expect(clearPins().size).toBe(0);
  });

  it('orders by pinnedAt and groups in pin order', () => {
    let pins = setPins(EMPTY_PINS, ['ip|2.2.2.2'], true, 3);
    pins = setPins(pins, ['email|a@b.co', 'ip|1.1.1.1'], true, 4);
    expect(sortedPins(pins).map((p) => p.value)).toEqual(['2.2.2.2', 'a@b.co', '1.1.1.1']);
    expect(pinsByGroup(pins)).toEqual({ ip: ['2.2.2.2', '1.1.1.1'], email: ['a@b.co'] });
    expect(nextPinnedAt(pins)).toBe(6);
    expect(nextPinnedAt(EMPTY_PINS)).toBe(0);
    // the counter is one past the highest stamp, whatever order the pins were added in
    const late = setPins(setPins(EMPTY_PINS, ['a|1'], true, 7), ['b|2'], true, 2);
    expect(nextPinnedAt(late)).toBe(8);
  });
});

describe('diffClips', () => {
  it('reports an edit when an id keeps its slot with new text', () => {
    const prev = [clip('a', 'one'), clip('b', 'two')];
    const next = [clip('a', 'one changed'), clip('b', 'two')];
    const diff = diffClips(prev, next);
    expect([...diff.edited]).toEqual(['a']);
    expect(diff.deletedRows.size).toBe(0);
  });

  it('reports a delete when one slot became an empty clip and nothing else moved', () => {
    const prev = [clip('a', 'one'), clip('b', 'two'), clip('c', 'three')];
    const next = [clip('a', 'one'), clip('x', ''), clip('c', 'three')];
    expect([...diffClips(prev, next).deletedRows]).toEqual([1]);
  });

  it('reports no delete for a rotation, even when an empty clip lands in a slot', () => {
    const prev = [clip('e', ''), clip('a', 'one'), clip('b', 'two')];
    const next = [clip('n', 'new'), clip('e', ''), clip('a', 'one')];
    const diff = diffClips(prev, next);
    expect(diff.deletedRows.size).toBe(0);
    expect(diff.presentIds.has('b')).toBe(false);
  });

  it('does not look for deletes when the length changed', () => {
    const prev = [clip('a', 'one'), clip('b', 'two')];
    const next = [clip('a', 'one'), clip('x', ''), clip('y', '')];
    expect(diffClips(prev, next).deletedRows.size).toBe(0);
  });
});

describe('prunePins', () => {
  const pinned = setPins(EMPTY_PINS, ['ip|1.1.1.1', 'email|a@b.co'], true, 0);

  it('prunes nothing while a scan is pending', () => {
    const result = prunePins(pinned, null, [], [], new Map());
    expect(result.pins).toBe(pinned);
    expect(result.dropped).toEqual([]);
  });

  it('keeps every pin that is still present', () => {
    const present = new Set(['ip|1.1.1.1', 'email|a@b.co']);
    const result = prunePins(pinned, present, [], [], new Map());
    expect(result.pins).toBe(pinned);
    expect(result.dropped).toEqual([]);
  });

  it('names the edit when the holder kept its id with new text', () => {
    const prev = [clip('a', 'ip 1.1.1.1 and a@b.co')];
    const next = [clip('a', 'ip 1.1.1.1 only')];
    const result = prunePins(
      pinned,
      new Set(['ip|1.1.1.1']),
      prev,
      next,
      keysOf([['a', ['ip|1.1.1.1', 'email|a@b.co']]])
    );
    expect(result.pins.size).toBe(1);
    expect(result.dropped).toEqual([
      { key: 'email|a@b.co', group: 'email', value: 'a@b.co', reason: 'after the edit' },
    ]);
  });

  it('names the row when the holder was deleted in place', () => {
    const prev = [clip('a', 'x'), clip('b', 'a@b.co'), clip('c', '1.1.1.1')];
    const next = [clip('a', 'x'), clip('empty', ''), clip('c', '1.1.1.1')];
    const result = prunePins(
      pinned,
      new Set(['ip|1.1.1.1']),
      prev,
      next,
      keysOf([
        ['b', ['email|a@b.co']],
        ['c', ['ip|1.1.1.1']],
      ])
    );
    expect(result.dropped[0].reason).toBe('deleted with clip 2');
  });

  it('says rotated out when the holder id is gone from the list', () => {
    const prev = [clip('a', 'x'), clip('b', 'a@b.co')];
    const next = [clip('n', 'new'), clip('a', 'x')];
    const result = prunePins(
      setPins(EMPTY_PINS, ['email|a@b.co'], true, 0),
      new Set(),
      prev,
      next,
      keysOf([['b', ['email|a@b.co']]])
    );
    expect(result.dropped[0].reason).toBe('rotated out of the list');
  });

  it('blames the search terms when the holder did not change', () => {
    const prev = [clip('a', 'a@b.co')];
    const result = prunePins(
      setPins(EMPTY_PINS, ['email|a@b.co'], true, 0),
      new Set(),
      prev,
      prev,
      keysOf([['a', ['email|a@b.co']]])
    );
    expect(result.dropped[0].reason).toBe('after the search terms changed');
  });

  it('blames the search terms when no previous clip is known to have held the pin', () => {
    const result = prunePins(
      setPins(EMPTY_PINS, ['email|a@b.co'], true, 0),
      new Set(),
      [],
      [],
      new Map()
    );
    expect(result.dropped[0].reason).toBe('after the search terms changed');
  });

  it('uses the topmost previous holder when several clips held the value', () => {
    const prev = [clip('a', 'a@b.co'), clip('b', 'a@b.co')];
    const next = [clip('a', 'nothing'), clip('n', 'new')];
    const result = prunePins(
      setPins(EMPTY_PINS, ['email|a@b.co'], true, 0),
      new Set(),
      prev,
      next,
      keysOf([
        ['a', ['email|a@b.co']],
        ['b', ['email|a@b.co']],
      ])
    );
    expect(result.dropped[0].reason).toBe('after the edit');
  });
});

describe('droppedNotice', () => {
  it('is null with nothing dropped', () => {
    expect(droppedNotice([])).toBeNull();
  });

  it('names each value with its group and the reason, one reason per group of pins', () => {
    expect(
      droppedNotice([
        { key: 'ip|1.1.1.1', group: 'ip', value: '1.1.1.1', reason: 'after the edit' },
        { key: 'email|a@b.co', group: 'email', value: 'a@b.co', reason: 'after the edit' },
        { key: 'ticket|INC-1', group: 'ticket', value: 'INC-1', reason: 'deleted with clip 4' },
      ])
    ).toBe('Dropped 1.1.1.1 (ip), a@b.co (email) after the edit; INC-1 (ticket) deleted with clip 4');
  });
});
