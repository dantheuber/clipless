import { refractor } from 'refractor/core';
import type { Element, Root, RootContent } from 'hast';
import javascript from 'refractor/javascript';
import typescript from 'refractor/typescript';
import python from 'refractor/python';
import java from 'refractor/java';
import csharp from 'refractor/csharp';
import cpp from 'refractor/cpp';
import c from 'refractor/c';
import markup from 'refractor/markup';
import css from 'refractor/css';
import json from 'refractor/json';
import sql from 'refractor/sql';
import bash from 'refractor/bash';
import powershell from 'refractor/powershell';
import type { Match } from '../../../../shared/types';

/**
 * Syntax tokens per line with chips inside them (spec 17, plan step 2). Prism runs on one
 * line at a time (tokens never span lines, so multi-line token state stays out of scope),
 * then each line's text is split at the token boundaries and at the match offsets from
 * the scan. A match that spans a token boundary splits both tokens; the renderer wraps the
 * run of segments that share a match in one chip.
 */

for (const syntax of [
  javascript,
  typescript,
  python,
  java,
  csharp,
  cpp,
  c,
  markup,
  css,
  json,
  sql,
  bash,
  powershell,
]) {
  refractor.register(syntax);
}

export interface Run {
  text: string;
  classes: string[]; // Prism token types, without the "token" prefix
}

export interface Segment {
  start: number; // offset within the line
  end: number;
  classes: string[];
  match: Match | null;
}

export interface Line {
  start: number; // offset of the line within the text
  text: string;
  matches: Match[]; // the non-overlapping matches on this line
}

export interface LineIndex {
  starts: number[];
  matchesByLine: ReadonlyMap<number, Match[]>;
}

const lineForOffset = (starts: readonly number[], offset: number): number => {
  let low = 0;
  let high = starts.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (starts[middle] <= offset) low = middle + 1;
    else high = middle;
  }
  return Math.max(0, low - 1);
};

/** Index line boundaries without allocating a string for every line. */
export function indexLines(text: string, matches: readonly Match[]): LineIndex {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);

  const matchesByLine = new Map<number, Match[]>();
  let lastEnd = -1;
  for (const match of matches) {
    if (match.start < lastEnd) continue;
    lastEnd = match.end;
    const first = lineForOffset(starts, Math.min(match.start, text.length));
    const last = lineForOffset(starts, Math.max(0, Math.min(match.end - 1, text.length)));
    for (let line = first; line <= last; line++) {
      const start = starts[line];
      const next = starts[line + 1] ?? text.length;
      let end = line + 1 < starts.length ? next - 1 : next;
      if (end > start && text.charCodeAt(end - 1) === 13) end--;
      if (match.start < end && match.end > start) {
        const onLine = matchesByLine.get(line) ?? [];
        onLine.push(match);
        matchesByLine.set(line, onLine);
      }
    }
  }
  return { starts, matchesByLine };
}

export function indexedLine(text: string, index: LineIndex, line: number): Line {
  const start = index.starts[line];
  const next = index.starts[line + 1] ?? text.length;
  let end = line + 1 < index.starts.length ? next - 1 : next;
  if (end > start && text.charCodeAt(end - 1) === 13) end--;
  return { start, text: text.slice(start, end), matches: index.matchesByLine.get(line) ?? [] };
}

/**
 * Prism's token tree for one line, flattened to runs. An unknown language gives one plain
 * run, so the content pane renders the same way for prose.
 */
export function tokenizeLine(line: string, language: string | null): Run[] {
  if (line.length === 0) return [];
  if (!language || !refractor.registered(language)) return [{ text: line, classes: [] }];
  const runs: Run[] = [];
  // refractor's tree holds text nodes and elements with a className list; nothing else
  const walk = (nodes: RootContent[], inherited: string[]) => {
    for (const node of nodes) {
      if (node.type === 'text') {
        runs.push({ text: node.value, classes: inherited });
      } else {
        const element = node as Element;
        const classes = element.properties.className as string[];
        walk(element.children, [...inherited, ...classes.filter((cls) => cls !== 'token')]);
      }
    }
  };
  walk((refractor.highlight(line, language) as Root).children, []);
  return runs;
}

/**
 * Split the text into lines with their offsets and the matches that fall on each. Matches
 * are already sorted by start; when two overlap the earlier one wins (spec 17.3), and a
 * match that crosses a line break is clipped to each line it touches.
 */
export function splitLines(text: string, matches: readonly Match[]): Line[] {
  const lines: Line[] = [];
  const parts = text.split('\n');
  let offset = 0;
  const kept = nonOverlapping(matches);
  let next = 0;
  for (const part of parts) {
    const body = part.endsWith('\r') ? part.slice(0, -1) : part;
    const end = offset + body.length;
    const onLine: Match[] = [];
    // matches that started before this line and reach into it
    for (let i = next; i < kept.length && kept[i].start < end; i++) {
      const m = kept[i];
      if (m.end > offset) onLine.push(m);
    }
    lines.push({ start: offset, text: body, matches: onLine });
    while (next < kept.length && kept[next].end <= end) next++;
    offset += part.length + 1;
  }
  return lines;
}

function nonOverlapping(matches: readonly Match[]): Match[] {
  const kept: Match[] = [];
  let lastEnd = -1;
  for (const match of matches) {
    if (match.start < lastEnd) continue;
    kept.push(match);
    lastEnd = match.end;
  }
  return kept;
}

/**
 * One line's runs cut at every match boundary. Offsets are within the line; the line's
 * matches carry text offsets, so lineStart converts them.
 */
export function segmentLine(
  runs: readonly Run[],
  lineStart: number,
  matches: readonly Match[]
): Segment[] {
  const segments: Segment[] = [];
  let position = 0;
  for (const run of runs) {
    const runStart = position;
    const runEnd = position + run.text.length;
    position = runEnd;
    const cuts = new Set<number>([runStart, runEnd]);
    for (const match of matches) {
      for (const edge of [match.start - lineStart, match.end - lineStart]) {
        if (edge > runStart && edge < runEnd) cuts.add(edge);
      }
    }
    const edges = [...cuts].sort((a, b) => a - b);
    for (let i = 0; i < edges.length - 1; i++) {
      const start = edges[i];
      const end = edges[i + 1];
      const match =
        matches.find((m) => m.start - lineStart <= start && m.end - lineStart >= end) ?? null;
      segments.push({ start, end, classes: run.classes, match });
    }
  }
  return segments;
}

/**
 * Segments grouped so consecutive ones with the same match render inside one chip.
 */
export function groupByMatch(
  segments: readonly Segment[]
): { match: Match | null; segments: Segment[] }[] {
  const groups: { match: Match | null; segments: Segment[] }[] = [];
  for (const segment of segments) {
    const last = groups[groups.length - 1];
    if (last && last.match !== null && last.match === segment.match) {
      last.segments.push(segment);
    } else {
      groups.push({ match: segment.match, segments: [segment] });
    }
  }
  return groups;
}

/**
 * The Prism language for a clip, or null for prose. Mirrors the names languageDetection
 * produces; markup covers html and xml.
 */
export function prismLanguage(
  language: string | undefined,
  isCode: boolean | undefined
): string | null {
  if (!isCode || !language) return null;
  const name = language === 'html' || language === 'xml' ? 'markup' : language;
  return refractor.registered(name) ? name : null;
}
