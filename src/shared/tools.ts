export interface ToolToken {
  token: string; // the literal token as it appears in the URL, e.g. "{email|domain}"
  groups: string[]; // its alternatives, e.g. ["email", "domain"]
}

export type PinsByGroup = Record<string, readonly string[]>;

const TOKEN_REGEX = /\{([^}]+)\}/g;

export function toolTokens(url: string): ToolToken[] {
  const tokens: ToolToken[] = [];
  for (const match of url.matchAll(TOKEN_REGEX)) {
    if (tokens.some((t) => t.token === match[0])) continue;
    const groups = match[1]
      .split('|')
      .map((g) => g.trim())
      .filter((g) => g.length > 0);
    tokens.push({ token: match[0], groups });
  }
  return tokens;
}

interface TokenValue {
  value: string;
  group: string;
}

function tokenValues(token: ToolToken, pins: PinsByGroup): TokenValue[] {
  const values: TokenValue[] = [];
  for (const group of token.groups) {
    for (const value of pins[group] ?? []) {
      if (value && !values.some((v) => v.value === value)) values.push({ value, group });
    }
  }
  return values;
}

export function toolReady(tool: { url: string }, pins: PinsByGroup): boolean {
  return toolTokens(tool.url).every((token) => tokenValues(token, pins).length > 0);
}

export function buildToolUrls(tool: { url: string }, pins: PinsByGroup): string[] {
  const tokens = toolTokens(tool.url);
  if (tokens.length === 0) return [tool.url];

  const perToken = tokens.map((token) => ({ token, values: tokenValues(token, pins) }));
  if (perToken.some((entry) => entry.values.length === 0)) return [];

  let urls = [tool.url];
  for (const { token, values } of perToken) {
    const next: string[] = [];
    for (const url of urls) {
      for (const { value, group } of values) {
        const substituted = group === 'url' ? value : encodeURIComponent(value);
        next.push(url.split(token.token).join(substituted));
      }
    }
    urls = next;
  }

  return urls.filter((url, index) => urls.indexOf(url) === index);
}
