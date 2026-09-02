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
 * nothing else (open-external.ts), so the tray explains when fewer tabs opened than it
 * offered. The editor's warning is needsWebScheme, which also exempts a leading url token.
 */
export function hasWebScheme(url: string): boolean {
  return WEB_SCHEME.test(url.trim());
}

/**
 * Whether the editor should warn that this template will not open as a web link. A template
 * that leads with a url-only token takes its scheme from the captured value (the built-in
 * url pattern captures http:// or https://), which buildToolUrls substitutes unencoded, so
 * it opens without a literal prefix. The token is read through toolTokens so {url|} and
 * { url } count the same way there as here. An empty template gets no warning.
 */
export function needsWebScheme(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.length === 0 || hasWebScheme(trimmed)) return false;
  const first = toolTokens(trimmed)[0];
  const leadsWithUrl =
    first !== undefined &&
    trimmed.startsWith(first.token) &&
    first.groups.length > 0 &&
    first.groups.every((group) => group === 'url');
  return !leadsWithUrl;
}

/**
 * A leading scheme to drop before prefixing https://. The digit lookahead keeps a
 * schemeless host:port ("localhost:3000/{ip}") intact, since no scheme is followed by a digit.
 */
const LEADING_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)\/*/i;

/**
 * The template rewritten to start with https://, replacing any leading scheme (ftp://,
 * mailto:, file:///, the https:/ typo) and dropping leading whitespace. Kept beside
 * hasWebScheme so the editor's one-click fix always produces something it accepts.
 */
export function withWebScheme(url: string): string {
  return 'https://' + url.trimStart().replace(LEADING_SCHEME, '');
}
