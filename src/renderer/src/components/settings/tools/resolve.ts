import { toolTokens } from '../../../../../shared/tools';

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'value'; group: string; value: string }
  | { kind: 'token'; token: string; groups: string[]; positional: boolean };

const TOKEN = /\{([^}]+)\}/g;
const POSITIONAL = /^c\d+$/;

export function tokenise(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index as number;
    if (at > cursor) segments.push({ kind: 'text', text: text.slice(cursor, at) });
    const groups = match[1]
      .split('|')
      .map((g) => g.trim())
      .filter((g) => g.length > 0);
    segments.push({
      kind: 'token',
      token: match[0],
      groups,
      positional: groups.length > 0 && groups.every((g) => POSITIONAL.test(g)),
    });
    cursor = at + match[0].length;
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) });
  return segments;
}

interface Pick {
  group: string;
  value: string;
}

function valuesFor(groups: readonly string[], values: Record<string, readonly string[]>): Pick[] {
  const picks: Pick[] = [];
  for (const group of groups) {
    for (const value of values[group] ?? []) {
      if (value && !picks.some((p) => p.value === value)) picks.push({ group, value });
    }
  }
  return picks;
}

function substitute(url: string, picks: ReadonlyMap<string, Pick>): string {
  let out = url;
  for (const [token, pick] of picks) {
    const encoded = pick.group === 'url' ? pick.value : encodeURIComponent(pick.value);
    out = out.split(token).join(encoded);
  }
  return out;
}

export function resolveToolUrls(
  url: string,
  values: Record<string, readonly string[]>
): Segment[][] {
  const tokens = toolTokens(url);
  if (tokens.length === 0) return [[{ kind: 'text', text: url }]];

  const perToken = tokens.map((token) => ({
    token: token.token,
    picks: valuesFor(token.groups, values),
  }));
  if (perToken.some((entry) => entry.picks.length === 0)) return [];

  let combos: Map<string, Pick>[] = [new Map()];
  for (const { token, picks } of perToken) {
    const next: Map<string, Pick>[] = [];
    for (const combo of combos) {
      for (const pick of picks) next.push(new Map(combo).set(token, pick));
    }
    combos = next;
  }

  const seen = new Set<string>();
  const result: Segment[][] = [];
  for (const combo of combos) {
    const resolved = substitute(url, combo);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    result.push(
      tokenise(url).map((segment) => {
        if (segment.kind !== 'token') return segment;
        const pick = combo.get(segment.token) as Pick;
        return {
          kind: 'value',
          group: pick.group,
          value: pick.group === 'url' ? pick.value : encodeURIComponent(pick.value),
        };
      })
    );
  }
  return result;
}

export function resolveTemplate(
  content: string,
  values: Record<string, readonly string[]>
): Segment[] {
  return tokenise(content).map((segment) => {
    if (segment.kind !== 'token' || segment.positional) return segment;
    const pick = valuesFor(segment.groups, values)[0];
    return pick ? { kind: 'value', group: pick.group, value: pick.value } : segment;
  });
}

export function segmentsText(segments: readonly Segment[]): string {
  return segments
    .map((s) => (s.kind === 'text' ? s.text : s.kind === 'value' ? s.value : s.token))
    .join('');
}
