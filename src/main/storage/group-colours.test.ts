import { describe, it, expect } from 'vitest';
import { usedGroups, pruneGroupColours, mergeGroupColours } from './group-colours';

const term = (pattern: string, enabled = true) => ({
  id: pattern,
  name: pattern,
  pattern,
  enabled,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});
const tool = (url: string) => ({
  id: url,
  name: url,
  url,
  captureGroups: [],
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});
const template = (content: string) => ({
  id: content,
  name: content,
  content,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});

const data = {
  searchTerms: [term('(?<ip>x)'), term('(?<email>y)', false)],
  quickTools: [tool('https://a/{ticket|user}'), tool('https://b/{ip}')],
  templates: [template('{c1} for {account}')],
};

describe('usedGroups', () => {
  it('collects groups from patterns (enabled or not), tool tokens and template tokens', () => {
    expect([...usedGroups(data)].sort()).toEqual(
      ['account', 'email', 'ip', 'ticket', 'user'].sort()
    );
  });
});

describe('pruneGroupColours', () => {
  it('drops an entry whose group appears nowhere', () => {
    expect(pruneGroupColours({ ip: 3, ghost: 4, user: 5 }, data)).toEqual({ ip: 3, user: 5 });
  });

  it('drops a value that is not a slot', () => {
    expect(pruneGroupColours({ ip: 12, email: 1 }, data)).toEqual({ email: 1 });
  });

  it('returns the same object when nothing changes', () => {
    const colours = { ip: 3, email: 1 };
    expect(pruneGroupColours(colours, data)).toBe(colours);
    expect(pruneGroupColours(undefined, data)).toBeUndefined();
  });
});

describe('mergeGroupColours', () => {
  it('keeps existing colours and adds missing ones on merge', () => {
    expect(mergeGroupColours({ ip: 3 }, { ip: 7, email: 1 }, 'merge')).toEqual({ ip: 3, email: 1 });
  });

  it('takes the file map on replace', () => {
    expect(mergeGroupColours({ ip: 3, user: 5 }, { ip: 7 }, 'replace')).toEqual({ ip: 7 });
  });

  it('imports nothing from a version 1 file', () => {
    expect(mergeGroupColours({ ip: 3 }, undefined, 'merge')).toEqual({ ip: 3 });
    expect(mergeGroupColours({ ip: 3 }, undefined, 'replace')).toEqual({});
    expect(mergeGroupColours(undefined, undefined, 'merge')).toEqual({});
  });

  it('ignores values that are not slots', () => {
    expect(mergeGroupColours(undefined, { ip: 99, email: 2 }, 'replace')).toEqual({ email: 2 });
  });
});
