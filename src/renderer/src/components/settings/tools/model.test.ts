import { describe, it, expect } from 'vitest';
import type { QuickTool, SearchTerm, Template } from '../../../../../shared/types';
import { BUILTIN_PATTERNS } from '../../../../../shared/builtinPatterns';
import {
  allGroups,
  consumersOf,
  dependents,
  groupState,
  groupsNeeded,
  groupsProduced,
  isClipTemplate,
  itemOf,
  libraryGroup,
  libraryHits,
  libraryTerm,
  listDot,
  producersOf,
  rowGroups,
  validatePattern,
} from './model';

const term = (id: string, pattern: string, enabled = true): SearchTerm => ({
  id,
  name: id,
  pattern,
  enabled,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});
const tool = (id: string, url: string): QuickTool => ({
  id,
  name: id,
  url,
  captureGroups: [],
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});
const template = (id: string, content: string): Template => ({
  id,
  name: id,
  content,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});

const config = {
  terms: [
    term('ip', '(?<ip>\\d+\\.\\d+\\.\\d+\\.\\d+)'),
    term('email', '(?<email>\\S+@\\S+)'),
    term('domain', '(?<domain>[a-z]+\\.com)', false),
  ],
  tools: [
    tool('vt', 'https://vt.example/{ip}'),
    tool('urlscan', 'https://scan.example/{domain}'),
    tool('dir', 'https://people.example/{user}'),
    tool('either', 'https://x.example/{ip|email}'),
  ],
  templates: [
    template('summary', 'IP {ip} for {email} ref {c1}'),
    template('intake', 'Customer: {c1}\nCallback: {c2}'),
  ],
};

describe('groups', () => {
  it('lists what a term produces and what an item needs, once each', () => {
    expect(groupsProduced(config.terms[0])).toEqual(['ip']);
    expect(groupsNeeded({ url: 'https://x/{ip}/{ip|email}/{email}' })).toEqual(['ip', 'email']);
    expect(groupsNeeded({ content: '{ip} {c1} {ip}' })).toEqual(['ip']);
  });

  it('finds producers and consumers in both directions', () => {
    expect(producersOf(config.terms, 'domain').map((t) => t.id)).toEqual(['domain']);
    expect(consumersOf(config, 'ip').tools.map((t) => t.id)).toEqual(['vt', 'either']);
    expect(consumersOf(config, 'ip').templates.map((t) => t.id)).toEqual(['summary']);
    expect(consumersOf(config, 'user').tools.map((t) => t.id)).toEqual(['dir']);
  });

  it('lists every group, produced first in term order, then the orphans', () => {
    expect(allGroups(config)).toEqual(['ip', 'email', 'domain', 'user']);
  });

  it('states a group as ok, off or orphan', () => {
    expect(groupState(config.terms, 'ip')).toBe('ok');
    expect(groupState(config.terms, 'domain')).toBe('off');
    expect(groupState(config.terms, 'user')).toBe('orphan');
  });

  it('finds an item by kind and id', () => {
    expect(itemOf(config, 'tool', 'vt')?.id).toBe('vt');
    expect(itemOf(config, 'template', 'intake')?.id).toBe('intake');
    expect(itemOf(config, 'term', 'nope')).toBeUndefined();
  });
});

describe('listDot', () => {
  it('reflects config readiness only', () => {
    expect(listDot('term', config.terms[0], config.terms)).toBe('ok');
    expect(listDot('term', config.terms[2], config.terms)).toBe('off');
    expect(listDot('tool', config.tools[0], config.terms)).toBe('ok');
    expect(listDot('tool', config.tools[1], config.terms)).toBe('no');
    expect(listDot('tool', config.tools[2], config.terms)).toBe('orph');
    expect(listDot('template', config.templates[0], config.terms)).toBe('ok');
    expect(listDot('template', config.templates[1], config.terms)).toBe('clip');
  });

  it('gives a row the groups it produces or needs', () => {
    expect(rowGroups('term', config.terms[1])).toEqual(['email']);
    expect(rowGroups('tool', config.tools[3])).toEqual(['ip', 'email']);
    expect(rowGroups('template', config.templates[1])).toEqual([]);
  });
});

describe('isClipTemplate', () => {
  it('means no named tokens at all', () => {
    expect(isClipTemplate({ content: '{c1} and {c2}' })).toBe(true);
    expect(isClipTemplate({ content: 'plain text' })).toBe(true);
    expect(isClipTemplate({ content: '{c1} {ip}' })).toBe(false);
  });
});

describe('validatePattern', () => {
  it('covers the four spec cases and accepts a good pattern', () => {
    expect(validatePattern('')).toMatch(/empty/);
    expect(validatePattern('(?<ip>[')).toBe('Not a valid regular expression.');
    expect(validatePattern('(?<ip>\\d*)')).toMatch(/empty string/);
    expect(validatePattern('\\d+')).toMatch(/named group/);
    expect(validatePattern('(?<c1>\\d+)')).toMatch(/"c1" is reserved/);
    expect(validatePattern('(?<ip>\\d+)')).toBeNull();
  });
});

describe('library', () => {
  const email = BUILTIN_PATTERNS[0];

  it('matches an added entry by pattern body, whatever its name', () => {
    const renamed = term('old', email.pattern, false);
    expect(libraryTerm([renamed], email)?.id).toBe('old');
    expect(libraryTerm(config.terms, email)).toBeUndefined();
  });

  it('counts the distinct values an entry finds in the sample', () => {
    expect(libraryHits('a@b.com then a@b.com and c@d.org', email)).toBe(2);
    expect(libraryHits('nothing here', email)).toBe(0);
  });

  it('names the group an entry produces', () => {
    expect(libraryGroup(email)).toBe('email');
    expect(libraryGroup({ name: 'x', pattern: 'plain' })).toBe('');
  });
});

describe('dependents', () => {
  it('names the tools and templates that use a group the term produces', () => {
    expect(dependents(config, 'term', 'ip')).toEqual(['vt', 'either', 'summary']);
    expect(dependents(config, 'term', 'domain')).toEqual(['urlscan']);
  });

  it('names a dependent once when it uses two groups of the term', () => {
    const cfg = {
      terms: [term('pair', '(?<ip>\\d+):(?<port>\\d+)')],
      tools: [tool('both', 'https://x/{ip}/{port}')],
      templates: [],
    };
    expect(dependents(cfg, 'term', 'pair')).toEqual(['both']);
  });

  it('is empty for tools, templates and unknown ids', () => {
    expect(dependents(config, 'tool', 'vt')).toEqual([]);
    expect(dependents(config, 'template', 'summary')).toEqual([]);
    expect(dependents(config, 'term', 'missing')).toEqual([]);
  });
});
