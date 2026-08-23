import type { QuickTool, SearchTerm, Template } from '../../../../../shared/types';
import type { BuiltinPattern } from '../../../../../shared/builtinPatterns';
import { extractTemplateTokens } from '../../../../../shared/templates';
import {
  configReadiness,
  itemTokens,
  patternGroups,
  type ConfigItem,
} from '../../../../../shared/readiness';
import { scanText } from '../../../../../shared/scan';

/**
 * The relationships the Tools tab is built on (spec 14.2): a search term produces groups,
 * a tool or template consumes them, an orphan is a group nothing produces. Pure functions
 * over the one loaded config; the list pane, the overview, Uses and the editors all read
 * these and nothing else.
 */

export type ToolsKind = 'term' | 'tool' | 'template';

export interface ToolsConfig {
  terms: readonly SearchTerm[];
  tools: readonly QuickTool[];
  templates: readonly Template[];
}

export const KIND_LABEL: Record<ToolsKind, string> = {
  term: 'search term',
  tool: 'tool',
  template: 'template',
};

export function groupsProduced(term: Pick<SearchTerm, 'pattern'>): string[] {
  return patternGroups(term.pattern);
}

/**
 * The groups a tool or template needs, each once, in token order. Positional template
 * tokens are not groups.
 */
export function groupsNeeded(item: ConfigItem): string[] {
  const groups: string[] = [];
  for (const token of itemTokens(item)) {
    for (const group of token.groups) {
      if (!groups.includes(group)) groups.push(group);
    }
  }
  return groups;
}

export type ToolsItem = SearchTerm | QuickTool | Template;

export function itemOf(config: ToolsConfig, kind: ToolsKind, id: string): ToolsItem | undefined {
  const list: readonly ToolsItem[] =
    kind === 'term' ? config.terms : kind === 'tool' ? config.tools : config.templates;
  return list.find((item) => item.id === id);
}

export function configItemOf(kind: ToolsKind, item: QuickTool | Template): ConfigItem {
  return kind === 'tool'
    ? { url: (item as QuickTool).url }
    : { content: (item as Template).content };
}

/** Every search term, enabled or not, whose pattern produces the group. */
export function producersOf(terms: readonly SearchTerm[], group: string): SearchTerm[] {
  return terms.filter((term) => groupsProduced(term).includes(group));
}

export function consumersOf(
  config: ToolsConfig,
  group: string
): { tools: QuickTool[]; templates: Template[] } {
  return {
    tools: config.tools.filter((tool) => groupsNeeded({ url: tool.url }).includes(group)),
    templates: config.templates.filter((template) =>
      groupsNeeded({ content: template.content }).includes(group)
    ),
  };
}

/**
 * Every group anywhere: produced (in term order, so colours are stable) then consumed, so
 * orphans appear in the overview.
 */
export function allGroups(config: ToolsConfig): string[] {
  const groups: string[] = [];
  const add = (g: string) => {
    if (!groups.includes(g)) groups.push(g);
  };
  for (const term of config.terms) groupsProduced(term).forEach(add);
  for (const tool of config.tools) groupsNeeded({ url: tool.url }).forEach(add);
  for (const template of config.templates) groupsNeeded({ content: template.content }).forEach(add);
  return groups;
}

export type GroupState = 'ok' | 'off' | 'orphan';

/** ok: an enabled producer; off: only disabled producers; orphan: none at all. */
export function groupState(terms: readonly SearchTerm[], group: string): GroupState {
  const producers = producersOf(terms, group);
  if (producers.some((term) => term.enabled)) return 'ok';
  if (producers.length > 0) return 'off';
  return 'orphan';
}

export function isClipTemplate(template: Pick<Template, 'content'>): boolean {
  return extractTemplateTokens(template.content).named.length === 0;
}

/** The list pane's health dot (spec 14.3). Config readiness only, never the sample. */
export type Dot = 'ok' | 'no' | 'orph' | 'off' | 'clip';

export const DOT_TITLE: Record<Dot, string> = {
  ok: 'ready',
  no: 'a producer is disabled',
  orph: 'never ready: a token nothing produces',
  off: 'disabled',
  clip: 'clip template',
};

export function listDot(
  kind: ToolsKind,
  item: SearchTerm | QuickTool | Template,
  terms: readonly SearchTerm[]
): Dot {
  if (kind === 'term') return (item as SearchTerm).enabled ? 'ok' : 'off';
  if (kind === 'template' && isClipTemplate(item as Template)) return 'clip';
  const readiness = configReadiness(configItemOf(kind, item as QuickTool | Template), terms);
  if (readiness.level === 'never') return 'orph';
  if (readiness.level === 'disabled') return 'no';
  return 'ok';
}

/** The groups shown as swatches on a list row: produced for a term, needed otherwise. */
export function rowGroups(kind: ToolsKind, item: SearchTerm | QuickTool | Template): string[] {
  if (kind === 'term') return groupsProduced(item as SearchTerm);
  return groupsNeeded(configItemOf(kind, item as QuickTool | Template));
}

const RESERVED_GROUP = /^c\d+$/;

/**
 * Why a pattern cannot be saved, or null (spec 14.4): it does not compile, matches the
 * empty string, has no named group, or uses a reserved c1-style name.
 */
export function validatePattern(pattern: string): string | null {
  if (pattern.trim().length === 0) return 'Pattern is empty.';
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch {
    return 'Not a valid regular expression.';
  }
  if (regex.test('')) return 'Matches the empty string, so it would match everywhere.';
  const groups = patternGroups(pattern);
  if (groups.length === 0) {
    return 'Needs at least one named group, for example (?<ip>...). Unnamed groups produce nothing.';
  }
  const reserved = groups.find((g) => RESERVED_GROUP.test(g));
  if (reserved) return `Group name "${reserved}" is reserved for positional template tokens.`;
  return null;
}

/**
 * The search term a library entry was added as, matched by pattern body so a term added
 * from the old library under another name still counts (spec 17.2).
 */
export function libraryTerm(
  terms: readonly SearchTerm[],
  entry: BuiltinPattern
): SearchTerm | undefined {
  return terms.find((term) => term.pattern === entry.pattern);
}

/** Distinct values the entry would find in the sample. */
export function libraryHits(sample: string, entry: BuiltinPattern): number {
  const scan = scanText(sample, [{ id: 'library', pattern: entry.pattern }]);
  return new Set(scan.matches.map((m) => m.value)).size;
}

/** The group a library entry produces, for its pill. */
export function libraryGroup(entry: BuiltinPattern): string {
  return patternGroups(entry.pattern)[0] ?? '';
}

/**
 * What depends on an item, by name, for the delete confirmation (spec 14.4). A term's
 * dependents are the tools and templates that use a group it produces; nothing depends on
 * a tool or a template.
 */
export function dependents(config: ToolsConfig, kind: ToolsKind, id: string): string[] {
  if (kind !== 'term') return [];
  const term = config.terms.find((t) => t.id === id);
  if (!term) return [];
  const names: string[] = [];
  for (const group of groupsProduced(term)) {
    const { tools, templates } = consumersOf(config, group);
    for (const item of [...tools, ...templates]) {
      if (!names.includes(item.name)) names.push(item.name);
    }
  }
  return names;
}
