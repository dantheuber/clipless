export interface CaptureItem {
  groupName: string;
  value: string;
  searchTermId: string;
  uniqueKey: string;
}

/**
 * Compute which capture items should be pre-selected.
 * Rules:
 *  - If more than 5 capture items total, select none (force explicit choice).
 *  - Otherwise, pre-select only items whose groupName appears exactly once
 *    across the full list (singletons). Groups with multiple values stay
 *    unselected so the user picks which value to use.
 */
export function computeInitialSelection(items: CaptureItem[]): Set<string> {
  if (items.length > 5) return new Set();
  const groupCounts = new Map<string, number>();
  items.forEach((item) => {
    groupCounts.set(item.groupName, (groupCounts.get(item.groupName) ?? 0) + 1);
  });
  return new Set(
    items.filter((item) => groupCounts.get(item.groupName) === 1).map((item) => item.uniqueKey)
  );
}

/**
 * Identify capture groups where the user has selected more than one value.
 * Templates can only bind a single value per token, so any template needing
 * one of these groups is ambiguous.
 */
export function computeAmbiguousGroups(items: CaptureItem[], selected: Set<string>): Set<string> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    if (selected.has(item.uniqueKey)) {
      counts.set(item.groupName, (counts.get(item.groupName) ?? 0) + 1);
    }
  });
  return new Set(
    Array.from(counts.entries())
      .filter(([, n]) => n > 1)
      .map(([g]) => g)
  );
}
