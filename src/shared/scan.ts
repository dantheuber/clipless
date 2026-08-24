import type { Match, ScanResult } from './types';

export const LARGE_CLIP_THRESHOLD = 256 * 1024; // above this, scanning happens on demand, off the first paint (spec 17.3)

export interface ScanTerm {
  id: string;
  pattern: string;
  enabled?: boolean;
}

const compiled = new Map<string, RegExp | Error>(); // failed compiles cached as their Error: reported once, never retried

function compile(pattern: string): RegExp | Error {
  const cached = compiled.get(pattern);
  if (cached) return cached;
  let result: RegExp | Error;
  try {
    result = new RegExp(pattern, 'gd'); // d: hasIndices gives every named group its [start, end]
  } catch (error) {
    result = error as Error; // the RegExp constructor throws SyntaxError
  }
  compiled.set(pattern, result);
  return result;
}

export function isLargeText(text: string): boolean {
  return text.length > LARGE_CLIP_THRESHOLD;
}

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
        regex.lastIndex++; // an empty match would otherwise never advance
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

export function valuesByGroup(scan: ScanResult): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const match of scan.matches) {
    const values = (result[match.group] ??= []);
    if (!values.includes(match.value)) values.push(match.value);
  }
  return result;
}
