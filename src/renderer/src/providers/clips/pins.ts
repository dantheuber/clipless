import type { ClipItem, ScanResult } from '../../../../shared/types';
import type { PinsByGroup } from '../../../../shared/tools';
import { pinKey } from '../../../../shared/readiness';
import { clipText } from './utils';

export interface Pin {
  group: string;
  value: string;
  pinnedAt: number;
}

export type PinMap = ReadonlyMap<string, Pin>;

export const EMPTY_PINS: PinMap = new Map();

export function scanKeys(scan: ScanResult | null): string[] {
  if (!scan) return [];
  const keys: string[] = [];
  for (const match of scan.matches) {
    const key = pinKey(match.group, match.value);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

export function parsePinKey(key: string): { group: string; value: string } {
  const at = key.indexOf('|');
  return { group: key.slice(0, at), value: key.slice(at + 1) };
}

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

export function sortedPins(pins: PinMap): Pin[] {
  return [...pins.values()].sort((a, b) => a.pinnedAt - b.pinnedAt);
}

export function pinsByGroup(pins: PinMap): PinsByGroup {
  const result: Record<string, string[]> = {};
  for (const pin of sortedPins(pins)) {
    (result[pin.group] ??= []).push(pin.value);
  }
  return result;
}

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

const DROP_REASONS = {
  edited: 'after the edit',
  deleted: (row: number) => `deleted with clip ${row}`,
  rotated: 'rotated out of the list',
  terms: 'after the search terms changed',
} as const;

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
    if (changedSlots.length !== deletedRows.size) deletedRows.clear();
  }

  return { edited, deletedRows, presentIds };
}

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
