import type { Match, ScanResult } from './types';

/**
 * Clips with more text than this are scanned on demand, off the first paint (spec 17.3).
 */
export const LARGE_CLIP_THRESHOLD = 256 * 1024;

/**
 * What scanText needs from a search term. SearchTerm satisfies it; the settings editor passes
 * the one pattern under edit.
 */
export interface ScanTerm {
  id: string;
  pattern: string;
  enabled?: boolean;
}

/**
 * One compiled RegExp per pattern string. Flags gd: hasIndices gives every named group its
 * [start, end] so chips know where to sit. A pattern that does not compile is cached as its
 * Error so it is reported once per scan and never retried.
 */
const compiled = new Map<string, RegExp | Error>();

function compile(pattern: string): RegExp | Error {
  const cached = compiled.get(pattern);
  if (cached) return cached;
  let result: RegExp | Error;
  try {
    result = new RegExp(pattern, 'gd');
  } catch (error) {
    result = error instanceof Error ? error : new Error(String(error));
  }
  compiled.set(pattern, result);
  return result;
}

export function isLargeText(text: string): boolean {
  return text.length > LARGE_CLIP_THRESHOLD;
}

/**
 * Scan one text with the enabled search terms. Pure and synchronous; the same call feeds the
 * row chips, the reader, the tray and the settings previews, so they cannot disagree.
 *
 * Matches are sorted by start; groups are listed in order of first appearance. Overlapping
 * matches from different terms are all kept. A group that matched the empty string produces
 * no match. Disabled terms and patterns that fail to compile are skipped; the latter are
 * reported in errors.
 */
export function scanText(text: string, terms: readonly ScanTerm[]): ScanResult {
  const matches: Match[] = [];
  const errors: ScanResult['errors'] = [];

  for (const term of terms) {
    if (term.enabled === false) continue;
    const regex = compile(term.pattern);
    if (regex instanceof Error) {
      errors.push({ termId: term.id, message: regex.message });
      continue;
    }

    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m[0] === '') {
        // A pattern that can match nothing would otherwise never advance.
        regex.lastIndex++;
      }
      const groupIndices = m.indices?.groups;
      if (!groupIndices) continue;
      for (const [group, span] of Object.entries(groupIndices)) {
        if (!span) continue;
        const [start, end] = span;
        if (end <= start) continue;
        matches.push({ group, value: text.slice(start, end), start, end, termId: term.id });
      }
    }
  }

  matches.sort((a, b) => a.start - b.start || a.end - b.end);

  const groups: string[] = [];
  for (const match of matches) {
    if (!groups.includes(match.group)) groups.push(match.group);
  }

  return { matches, groups, errors, large: isLargeText(text) };
}

/**
 * Pinned-style lookup of the scan: every distinct value per group, in order of first
 * appearance. The tray and readiness code read this shape.
 */
export function valuesByGroup(scan: ScanResult): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const match of scan.matches) {
    const values = (result[match.group] ??= []);
    if (!values.includes(match.value)) values.push(match.value);
  }
  return result;
}
