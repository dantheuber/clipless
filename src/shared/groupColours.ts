import type { GroupColours } from './types';

/**
 * The colour bucket: twelve slots, each with a dark-theme and a light-theme value of the
 * same hue (spec 16.2, contrast pass of 2026-08-22). Groups store a slot index, never a hex.
 * The renderer sets --slot-0 to --slot-11 from the pair that matches the theme; nothing
 * references a hex directly.
 */
export interface GroupColourSlot {
  dark: string;
  light: string;
}

export const GROUP_COLOUR_SLOTS: readonly GroupColourSlot[] = [
  { dark: '#f87171', light: '#b91c1c' },
  { dark: '#60a5fa', light: '#1d4ed8' },
  { dark: '#34d399', light: '#047857' },
  { dark: '#fbbf24', light: '#b45309' },
  { dark: '#22d3ee', light: '#0e7490' },
  { dark: '#c084fc', light: '#7e22ce' },
  { dark: '#fb923c', light: '#c2410c' },
  { dark: '#a3e635', light: '#3f6212' },
  { dark: '#f472b6', light: '#aa0d5f' },
  { dark: '#38bdf8', light: '#067db1' },
  { dark: '#818cf8', light: '#0a19ae' },
  { dark: '#2dd4bf', light: '#0f766e' },
];

export const GROUP_COLOUR_SLOT_COUNT = GROUP_COLOUR_SLOTS.length;

/**
 * Slots 0 to 5 belong to the six prototype groups by default (spec 14.4).
 */
export const DEFAULT_GROUP_SLOTS: Readonly<Record<string, number>> = {
  ip: 0,
  email: 1,
  ticket: 2,
  domain: 3,
  url: 4,
  user: 5,
};

export function isSlotIndex(value: unknown): value is number {
  return (
    Number.isInteger(value) && (value as number) >= 0 && (value as number) < GROUP_COLOUR_SLOT_COUNT
  );
}

/**
 * Assign a slot to every known group, in order: the stored override if present, else the
 * named default, else the lowest slot no earlier group took (wrapping to 0 once all twelve
 * are in use). knownGroups is every group in every search term, in term order, so the
 * answer is the same on every render.
 */
export function assignGroupSlots(
  groupColours: GroupColours | undefined,
  knownGroups: readonly string[]
): Map<string, number> {
  const assigned = new Map<string, number>();
  const used = new Set<number>();
  const unresolved: string[] = [];
  const seen = new Set<string>();

  for (const group of knownGroups) {
    if (seen.has(group)) continue;
    seen.add(group);
    const override = groupColours?.[group];
    const slot = isSlotIndex(override) ? override : DEFAULT_GROUP_SLOTS[group];
    if (slot === undefined) {
      unresolved.push(group);
      continue;
    }
    assigned.set(group, slot);
    used.add(slot);
  }

  for (const group of unresolved) {
    const slot = lowestFreeSlot(used);
    assigned.set(group, slot);
    used.add(slot);
  }

  return assigned;
}

function lowestFreeSlot(used: Set<number>): number {
  if (used.size >= GROUP_COLOUR_SLOT_COUNT) {
    used.clear();
  }
  let slot = 0;
  while (used.has(slot)) slot++;
  return slot;
}

/**
 * The slot one group renders in. A group outside knownGroups (the pattern under edit in
 * settings) is treated as if it were appended to the list.
 */
export function resolveGroupSlot(
  group: string,
  groupColours: GroupColours | undefined,
  knownGroups: readonly string[]
): number {
  const groups = knownGroups.includes(group) ? knownGroups : [...knownGroups, group];
  return assignGroupSlots(groupColours, groups).get(group) as number;
}
