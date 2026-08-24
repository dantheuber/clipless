import { describe, expect, it } from 'vitest';
import type { ClipItem } from '../../../../shared/types';
import { diffClips, droppedNotice } from './pins';

const clip = (id: string, content: string): ClipItem => ({ id, type: 'text', content });

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
    ).toBe(
      'Dropped 1.1.1.1 (ip), a@b.co (email) after the edit; INC-1 (ticket) deleted with clip 4'
    );
  });
});
