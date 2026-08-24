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
  classes: string[];
}

export interface Segment {
  start: number;
  end: number;
  classes: string[];
  match: Match | null;
}

export interface Line {
  start: number;
  text: string;
  matches: Match[];
}

export function tokenizeLine(line: string, language: string | null): Run[] {
  if (line.length === 0) return [];
  if (!language || !refractor.registered(language)) return [{ text: line, classes: [] }];
  const runs: Run[] = [];
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

export function prismLanguage(
  language: string | undefined,
  isCode: boolean | undefined
): string | null {
  if (!isCode || !language) return null;
  const name = language === 'html' || language === 'xml' ? 'markup' : language;
  return refractor.registered(name) ? name : null;
}
