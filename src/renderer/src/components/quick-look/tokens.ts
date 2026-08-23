import { refractor } from 'refractor/core';
import type { Root, RootContent } from 'hast';
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

/**
 * Prism's token tree for one line, flattened to runs. An unknown language gives one plain
 * run, so the content pane renders the same way for prose.
 */
export function tokenizeLine(line: string, language: string | null): Run[] {
  if (line.length === 0) return [];
  if (!language || !refractor.registered(language)) return [{ text: line, classes: [] }];
  const runs: Run[] = [];
  const walk = (nodes: RootContent[], inherited: string[]) => {
    for (const node of nodes) {
      if (node.type === 'text') {
        if (node.value.length > 0) runs.push({ text: node.value, classes: inherited });
      } else if (node.type === 'element') {
        const classes = (node.properties?.className as string[] | undefined) ?? [];
        walk(node.children, [...inherited, ...classes.filter((cls) => cls !== 'token')]);
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
