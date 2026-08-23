import type { GroupColours, QuickClipsImportMode, TemplatesData } from '../../shared/types';
import { isSlotIndex } from '../../shared/groupColours';
import { patternGroups, itemTokens } from '../../shared/readiness';

/**
 * groupColours lives in templates.enc beside the search terms: a slot index per group,
 * never a hex (spec 14.4, 17.2). These helpers keep it consistent with the rest of that
 * file; storage/index.ts calls them on save and import.
 */

/**
 * Every group that appears anywhere: in a search term pattern (enabled or not), a tool URL
 * token or a template token.
 */
export function usedGroups(
  data: Pick<TemplatesData, 'searchTerms' | 'quickTools' | 'templates'>
): Set<string> {
  const groups = new Set<string>();
  for (const term of data.searchTerms) {
    for (const group of patternGroups(term.pattern)) groups.add(group);
  }
  for (const tool of data.quickTools) {
    for (const token of itemTokens({ url: tool.url })) {
      for (const group of token.groups) groups.add(group);
    }
  }
  for (const template of data.templates) {
    for (const token of itemTokens({ content: template.content })) {
      for (const group of token.groups) groups.add(group);
    }
  }
  return groups;
}

/**
 * Drop entries whose group no longer appears anywhere, and any value that is not a slot.
 * Returns the same object when nothing changed.
 */
export function pruneGroupColours(
  groupColours: GroupColours | undefined,
  data: Pick<TemplatesData, 'searchTerms' | 'quickTools' | 'templates'>
): GroupColours | undefined {
  if (!groupColours) return undefined;
  const used = usedGroups(data);
  const pruned: GroupColours = {};
  let changed = false;
  for (const [group, slot] of Object.entries(groupColours)) {
    if (used.has(group) && isSlotIndex(slot)) pruned[group] = slot;
    else changed = true;
  }
  return changed ? pruned : groupColours;
}

/**
 * Import: merge keeps an existing colour and adds missing ones; replace takes the file's
 * map. A file without groupColours (version 1) brings none.
 */
export function mergeGroupColours(
  existing: GroupColours | undefined,
  incoming: GroupColours | undefined,
  mode: QuickClipsImportMode
): GroupColours | undefined {
  const valid: GroupColours = {};
  for (const [group, slot] of Object.entries(incoming ?? {})) {
    if (isSlotIndex(slot)) valid[group] = slot;
  }
  if (mode === 'replace') return valid;
  return { ...valid, ...(existing ?? {}) };
}
