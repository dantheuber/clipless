import { describe, it, expect } from 'vitest';
import {
  computeAmbiguousGroups,
  computeInitialSelection,
  type CaptureItem,
} from './quickClipsSelection';

function item(groupName: string, value: string): CaptureItem {
  return {
    groupName,
    value,
    searchTermId: `term-${groupName}`,
    uniqueKey: `${groupName}-${value}`,
  };
}

describe('computeInitialSelection', () => {
  it('returns empty set when there are no items', () => {
    expect(computeInitialSelection([])).toEqual(new Set());
  });

  it('selects all items when every group is a singleton', () => {
    const items = [item('url', 'a'), item('ticket', 'T-1'), item('email', 'a@b.c')];
    expect(computeInitialSelection(items)).toEqual(new Set(['url-a', 'ticket-T-1', 'email-a@b.c']));
  });

  it('skips groups with multiple instances', () => {
    const items = [item('url', 'a'), item('url', 'b'), item('ticket', 'T-1')];
    expect(computeInitialSelection(items)).toEqual(new Set(['ticket-T-1']));
  });

  it('selects nothing when every group has multiple instances', () => {
    const items = [
      item('url', 'a'),
      item('url', 'b'),
      item('ticket', 'T-1'),
      item('ticket', 'T-2'),
    ];
    expect(computeInitialSelection(items)).toEqual(new Set());
  });

  it('returns empty set when total items exceed 5, even if all are singletons', () => {
    const items = [
      item('a', '1'),
      item('b', '2'),
      item('c', '3'),
      item('d', '4'),
      item('e', '5'),
      item('f', '6'),
    ];
    expect(computeInitialSelection(items)).toEqual(new Set());
  });

  it('still applies the singleton rule at exactly 5 items', () => {
    const items = [
      item('url', 'a'),
      item('url', 'b'),
      item('ticket', 'T-1'),
      item('email', 'x@y.z'),
      item('phone', '555'),
    ];
    expect(computeInitialSelection(items)).toEqual(
      new Set(['ticket-T-1', 'email-x@y.z', 'phone-555'])
    );
  });
});

describe('computeAmbiguousGroups', () => {
  it('returns empty when nothing is selected', () => {
    const items = [item('url', 'a'), item('url', 'b')];
    expect(computeAmbiguousGroups(items, new Set())).toEqual(new Set());
  });

  it('returns empty when each selected group has a single value', () => {
    const items = [item('url', 'a'), item('url', 'b'), item('ticket', 'T-1')];
    expect(computeAmbiguousGroups(items, new Set(['url-a', 'ticket-T-1']))).toEqual(new Set());
  });

  it('flags a group when more than one value is selected for it', () => {
    const items = [item('url', 'a'), item('url', 'b'), item('ticket', 'T-1')];
    expect(computeAmbiguousGroups(items, new Set(['url-a', 'url-b', 'ticket-T-1']))).toEqual(
      new Set(['url'])
    );
  });

  it('flags multiple groups independently', () => {
    const items = [
      item('url', 'a'),
      item('url', 'b'),
      item('ticket', 'T-1'),
      item('ticket', 'T-2'),
      item('email', 'x@y.z'),
    ];
    const selected = new Set(['url-a', 'url-b', 'ticket-T-1', 'ticket-T-2', 'email-x@y.z']);
    expect(computeAmbiguousGroups(items, selected)).toEqual(new Set(['url', 'ticket']));
  });

  it('ignores unselected items even if other items in the group are selected', () => {
    const items = [item('url', 'a'), item('url', 'b'), item('url', 'c')];
    expect(computeAmbiguousGroups(items, new Set(['url-a']))).toEqual(new Set());
  });
});
