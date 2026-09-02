/**
 * Tool URL tokens and fan-out. The tray, the reader's Launch button and the settings
 * "Would open N tabs" preview all call buildToolUrls, so they cannot disagree on the count.
 */

export interface ToolToken {
  token: string; // the literal token as it appears in the URL, e.g. "{email|domain}"
  groups: string[]; // its alternatives, e.g. ["email", "domain"]
}

/**
 * Pinned values per group, in pin order. The tray passes the pins; a pattern match passes
 * its captures.
 */
export type PinsByGroup = Record<string, readonly string[]>;

const TOKEN_REGEX = /\{([^}]+)\}/g;

/**
 * Every distinct token in a tool URL, in order of first appearance. The pipe form
 * {a|b} is parsed for compatibility with existing configs (spec 14.8).
 */
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

/**
 * The values a token can take: every pinned value across its alternatives, in alternative
 * order then pin order, each value once.
 */
function tokenValues(token: ToolToken, pins: PinsByGroup): TokenValue[] {
  const values: TokenValue[] = [];
  for (const group of token.groups) {
    for (const value of pins[group] ?? []) {
      if (value && !values.some((v) => v.value === value)) values.push({ value, group });
    }
  }
  return values;
}

/**
 * A tool is offered only when every token has a value (spec 8). A pipe token is ready when
 * any one alternative has a value (spec 14.8).
 */
export function toolReady(tool: { url: string }, pins: PinsByGroup): boolean {
  return toolTokens(tool.url).every((token) => tokenValues(token, pins).length > 0);
}

/**
 * Every URL the tool would open: the Cartesian product of the token values, each value
 * encoded with encodeURIComponent except values from the url group, which are substituted
 * as they are. De-duplicated, in product order. A URL with no tokens opens once; a tool that
 * is not ready opens nothing.
 */
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

const WEB_SCHEME = /^https?:\/\//i;

/**
 * Whether a tool URL template starts with http:// or https://. The main process opens
 * nothing else (open-external.ts), so the editor warns on anything that fails this and the
 * tray explains when fewer tabs opened than it offered.
 */
export function hasWebScheme(url: string): boolean {
  return WEB_SCHEME.test(url.trim());
}
