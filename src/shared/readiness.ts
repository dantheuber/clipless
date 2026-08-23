import type { ScanResult, SearchTerm, Template } from './types';
import { extractTemplateTokens } from './templates';
import { toolTokens, type PinsByGroup } from './tools';
import { valuesByGroup } from './scan';

/**
 * Readiness of a template against the pinned set (spec 7), and of a tool or template
 * against the configuration (spec 14.4). Every pill, the t key and the settings readiness
 * line call these, so the wording lives here once.
 */

export type TemplateReadiness =
  | { kind: 'clip-template' }
  | {
      kind: 'ready';
      values: Record<string, string>; // the first pinned value per token
      counts: Record<string, number>; // how many were pinned per token, for "first of N"
    }
  | {
      kind: 'needs';
      missing: string[]; // tokens with no pinned value
      pins: string[] | null; // group|value keys to pin from the open clip, when it has them all
      lacking: string[]; // the missing tokens the open clip also lacks
    };

/**
 * Key of a pin: group and value, so pinning a value pins every occurrence in every clip.
 */
export function pinKey(group: string, value: string): string {
  return `${group}|${value}`;
}

export function templateReadiness(
  template: Pick<Template, 'content'>,
  pins: PinsByGroup,
  openClipScan?: ScanResult
): TemplateReadiness {
  const { named } = extractTemplateTokens(template.content);
  if (named.length === 0) return { kind: 'clip-template' };

  const values: Record<string, string> = {};
  const counts: Record<string, number> = {};
  const missing: string[] = [];
  for (const token of named) {
    const pinned = (pins[token] ?? []).filter((v) => v.length > 0);
    if (pinned.length === 0) {
      missing.push(token);
    } else {
      values[token] = pinned[0];
      counts[token] = pinned.length;
    }
  }
  if (missing.length === 0) return { kind: 'ready', values, counts };

  const inClip = openClipScan ? valuesByGroup(openClipScan) : {};
  const lacking = missing.filter((token) => !(inClip[token]?.length > 0));
  const pins_ =
    lacking.length === 0 ? missing.map((token) => pinKey(token, inClip[token][0])) : null;
  return { kind: 'needs', missing, pins: pins_, lacking };
}

/**
 * Human list: "a", "a and b", "a, b and c".
 */
export function listTokens(tokens: readonly string[]): string {
  if (tokens.length <= 1) return tokens.join('');
  return `${tokens.slice(0, -1).join(', ')} and ${tokens[tokens.length - 1]}`;
}

/**
 * The named groups a pattern produces, in pattern order.
 */
export function patternGroups(pattern: string): string[] {
  const groups: string[] = [];
  for (const match of pattern.matchAll(/\(\?<(\w+)>/g)) {
    if (!groups.includes(match[1])) groups.push(match[1]);
  }
  return groups;
}

/**
 * Every group some search term produces, with whether any producer is enabled.
 */
export function producers(
  terms: readonly Pick<SearchTerm, 'pattern' | 'enabled'>[]
): Map<string, boolean> {
  const result = new Map<string, boolean>();
  for (const term of terms) {
    for (const group of patternGroups(term.pattern)) {
      result.set(group, (result.get(group) ?? false) || term.enabled);
    }
  }
  return result;
}

export type ConfigItem = Pick<Template, 'content'> | { url: string };

/**
 * The tokens a tool or template needs. A tool token may have pipe alternatives; a template
 * token has one.
 */
export function itemTokens(item: ConfigItem): { name: string; groups: string[] }[] {
  if ('url' in item) {
    return toolTokens(item.url).map((t) => ({ name: t.groups.join('|'), groups: t.groups }));
  }
  return extractTemplateTokens(item.content).named.map((name) => ({ name, groups: [name] }));
}

export type ConfigReadiness =
  | { level: 'never'; tokens: string[] } // orphans: no search term produces the group
  | { level: 'disabled'; tokens: string[] } // every producer is disabled
  | { level: 'ok' };

/**
 * Whether every token the item needs has an enabled producer. List dots and the overview
 * reflect this only.
 */
export function configReadiness(
  item: ConfigItem,
  terms: readonly Pick<SearchTerm, 'pattern' | 'enabled'>[]
): ConfigReadiness {
  const produced = producers(terms);
  const orphans: string[] = [];
  const disabled: string[] = [];
  for (const token of itemTokens(item)) {
    const states = token.groups.map((g) => produced.get(g));
    if (states.every((s) => s === undefined)) orphans.push(token.name);
    else if (!states.some((s) => s === true)) disabled.push(token.name);
  }
  if (orphans.length > 0) return { level: 'never', tokens: orphans };
  if (disabled.length > 0) return { level: 'disabled', tokens: disabled };
  return { level: 'ok' };
}

export type SampleReadiness =
  | Exclude<ConfigReadiness, { level: 'ok' }>
  | { level: 'sample'; tokens: string[] } // the sample text has no value for these
  | { level: 'ready' };

/**
 * Config readiness, then whether the sample text has a value for every token. Shown on the
 * readiness line only.
 */
export function sampleReadiness(
  item: ConfigItem,
  terms: readonly Pick<SearchTerm, 'pattern' | 'enabled'>[],
  sampleScan: ScanResult
): SampleReadiness {
  const config = configReadiness(item, terms);
  if (config.level !== 'ok') return config;
  const inSample = valuesByGroup(sampleScan);
  const lacking = itemTokens(item)
    .filter((token) => !token.groups.some((g) => inSample[g]?.length > 0))
    .map((token) => token.name);
  if (lacking.length > 0) return { level: 'sample', tokens: lacking };
  return { level: 'ready' };
}

/**
 * The four wordings of spec 14.4. They never merge.
 */
export function readinessText(readiness: SampleReadiness | ConfigReadiness): string {
  switch (readiness.level) {
    case 'never':
      return 'never ready';
    case 'disabled':
      return `needs ${listTokens(readiness.tokens)}, producer disabled`;
    case 'sample':
      return `sample lacks ${listTokens(readiness.tokens)}`;
    case 'ready':
      return 'ready on the sample';
    case 'ok':
      return 'ready';
  }
}
