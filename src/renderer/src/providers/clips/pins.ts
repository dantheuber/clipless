import type { ClipItem, ScanResult } from '../../../../shared/types';
import type { PinsByGroup } from '../../../../shared/tools';
import { pinKey } from '../../../../shared/readiness';
import { clipText } from './utils';

/**
 * Pins: the user's selection of (group, value) pairs, keyed group|value so pinning a value
 * pins every occurrence in every clip (spec 3). Memory only, never stored. pinnedAt is a
 * counter, not a time, so "first pinned" in spec 7 is an order the user can reason about.
 *
 * Every writer goes through togglePins, setPins and clearPins; no component holds its own
 * pin state (spec 17.1). The functions here are pure; the provider holds the map.
 */

export interface Pin {
  group: string;
  value: string;
  pinnedAt: number;
}

export type PinMap = ReadonlyMap<string, Pin>;

export const EMPTY_PINS: PinMap = new Map();

/**
 * The distinct pin keys a scan produces, in order of first appearance. "p" on a row or in
 * the reader toggles these as one.
 */
export function scanKeys(scan: ScanResult | null): string[] {
  if (!scan) return [];
  const keys: string[] = [];
  for (const match of scan.matches) {
    const key = pinKey(match.group, match.value);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

/**
 * Split a key back into its group and value. The value may itself contain a pipe, so the
 * split is at the first one only.
 */
export function parsePinKey(key: string): { group: string; value: string } {
  const at = key.indexOf('|');
  return { group: key.slice(0, at), value: key.slice(at + 1) };
}

/**
 * Toggle a set of keys as one: if every key is pinned, unpin them all; otherwise pin the
 * ones that are not. For one key that is a plain flip. nextAt is the counter to stamp new
 * pins with, in key order.
 */
export function togglePins(pins: PinMap, keys: readonly string[], nextAt: number): PinMap {
  if (keys.length === 0) return pins;
  const allOn = keys.every((key) => pins.has(key));
  return setPins(pins, keys, !allOn, nextAt);
}

export function setPins(pins: PinMap, keys: readonly string[], on: boolean, nextAt = 0): PinMap {
  const next = new Map(pins);
  let at = nextAt;
  for (const key of keys) {
    if (on) {
      if (!next.has(key)) {
        next.set(key, { ...parsePinKey(key), pinnedAt: at++ });
      }
    } else {
      next.delete(key);
    }
  }
  return next;
}

export function clearPins(): PinMap {
  return new Map();
}

/**
 * Pins in the order they were pinned.
 */
export function sortedPins(pins: PinMap): Pin[] {
  return [...pins.values()].sort((a, b) => a.pinnedAt - b.pinnedAt);
}

/**
 * The shape tools and templates read: values per group, in pin order.
 */
export function pinsByGroup(pins: PinMap): PinsByGroup {
  const result: Record<string, string[]> = {};
  for (const pin of sortedPins(pins)) {
    (result[pin.group] ??= []).push(pin.value);
  }
  return result;
}

/**
 * The next counter value: one past the highest pinnedAt.
 */
export function nextPinnedAt(pins: PinMap): number {
  let max = -1;
  for (const pin of pins.values()) if (pin.pinnedAt > max) max = pin.pinnedAt;
  return max + 1;
}

export interface DroppedPin {
  key: string;
  group: string;
  value: string;
  reason: string;
}

export const DROP_REASONS = {
  edited: 'after the edit',
  deleted: (row: number) => `deleted with clip ${row}`,
  rotated: 'rotated out of the list',
  terms: 'after the search terms changed',
} as const;

/**
 * What one clips array became in the next. Computed once per change, then read for each
 * dropped pin. A delete is a slot whose clip was replaced by an empty one while every other
 * slot kept its clip; a rotation changes many slots at once.
 */
export function diffClips(
  prev: readonly ClipItem[],
  next: readonly ClipItem[]
): { edited: Set<string>; deletedRows: Set<number>; presentIds: Set<string> } {
  const presentIds = new Set(next.map((clip) => clip.id));
  const nextById = new Map(next.map((clip) => [clip.id, clip]));
  const edited = new Set<string>();
  for (const clip of prev) {
    const now = nextById.get(clip.id);
    if (now && clipText(now) !== clipText(clip)) edited.add(clip.id);
  }

  const deletedRows = new Set<number>();
  if (prev.length === next.length) {
    const changedSlots: number[] = [];
    for (let i = 0; i < prev.length; i++) {
      if (prev[i].id !== next[i].id) changedSlots.push(i);
    }
    for (const i of changedSlots) {
      const isDelete =
        clipText(next[i]).length === 0 && next[i].content === '' && !presentIds.has(prev[i].id);
      if (isDelete) deletedRows.add(i);
    }
    // A rotation changes a run of slots; a delete changes its slot alone. When more than one
    // slot changed and not every one reads as a delete, the list rotated.
    if (changedSlots.length !== deletedRows.size) deletedRows.clear();
  }

  return { edited, deletedRows, presentIds };
}

/**
 * Drop every pin whose key appears in no clip's scan, and say why from the diff against the
 * previous clips array (spec 17.1). keysByClip is the previous run's keys per clip id; it
 * tells which clips held each pin before the change. When one value was held by several
 * clips the topmost previous holder's fate is the reason.
 *
 * present is the union of keys across every current scan. When any scan is still pending
 * the caller passes null and nothing is pruned until it lands.
 */
export function prunePins(
  pins: PinMap,
  present: ReadonlySet<string> | null,
  prevClips: readonly ClipItem[],
  clips: readonly ClipItem[],
  keysByClip: ReadonlyMap<string, ReadonlySet<string>>
): { pins: PinMap; dropped: DroppedPin[] } {
  if (present === null) return { pins, dropped: [] };
  const droppedKeys = [...pins.keys()].filter((key) => !present.has(key));
  if (droppedKeys.length === 0) return { pins, dropped: [] };

  const diff = diffClips(prevClips, clips);
  const dropped: DroppedPin[] = droppedKeys.map((key) => {
    const holder = prevClips.findIndex((clip) => keysByClip.get(clip.id)?.has(key));
    return { key, ...parsePinKey(key), reason: reasonFor(holder, prevClips, diff) };
  });

  return { pins: setPins(pins, droppedKeys, false), dropped };
}

function reasonFor(
  holder: number,
  prevClips: readonly ClipItem[],
  diff: ReturnType<typeof diffClips>
): string {
  if (holder < 0) return DROP_REASONS.terms;
  const id = prevClips[holder].id;
  if (diff.edited.has(id)) return DROP_REASONS.edited;
  if (diff.presentIds.has(id)) return DROP_REASONS.terms;
  if (diff.deletedRows.has(holder)) return DROP_REASONS.deleted(holder + 1);
  return DROP_REASONS.rotated;
}

/**
 * The tray's one-line notice for one change: "Dropped 203.0.113.42 (ip) after the edit".
 * Different reasons in one change are listed each with its own.
 */
export function droppedNotice(dropped: readonly DroppedPin[]): string | null {
  if (dropped.length === 0) return null;
  const byReason = new Map<string, DroppedPin[]>();
  for (const pin of dropped) {
    (byReason.get(pin.reason) ?? byReason.set(pin.reason, []).get(pin.reason)!).push(pin);
  }
  const parts = [...byReason.entries()].map(
    ([reason, pins]) => `${pins.map((p) => `${p.value} (${p.group})`).join(', ')} ${reason}`
  );
  return `Dropped ${parts.join('; ')}`;
}
