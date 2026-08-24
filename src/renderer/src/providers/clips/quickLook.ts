import type { ClipItem } from '../../../../shared/types';

/**
 * The reader's state (spec 17.1). It tracks a clip by id, not an index: when a clip lands
 * above, the header renumbers; when the id disappears, the reader closes. Walking uses
 * the visible list and skips empty rows (spec 16 rules 3 and 14).
 */

export type QuickLookView = 'text' | 'source' | 'rendered';

export interface QuickLookState {
  openClipId: string | null;
  view: QuickLookView;
  editing: boolean;
  returnFocusIndex: number | null;
  wrap: boolean; // per session, default off (spec 12)
}

export const INITIAL_QUICK_LOOK: QuickLookState = {
  openClipId: null,
  view: 'text',
  editing: false,
  returnFocusIndex: null,
  wrap: false,
};

export interface VisibleClip {
  clip: ClipItem;
  originalIndex: number;
}

/**
 * Open on a clip. The view resets to text on every open (rule 6); wrap is kept.
 * returnFocusIndex is the row focus goes back to on close; walking keeps the original.
 */
export function openOn(
  state: QuickLookState,
  clipId: string,
  returnFocusIndex: number | null = state.returnFocusIndex
): QuickLookState {
  return { ...state, openClipId: clipId, view: 'text', editing: false, returnFocusIndex };
}

export function closeState(state: QuickLookState): QuickLookState {
  return { ...state, openClipId: null, editing: false, view: 'text', returnFocusIndex: null };
}

export function hasContent(clip: ClipItem): boolean {
  if (clip.type === 'image') return clip.content.length > 0;
  if (clip.type === 'bookmark') {
    return /\S/u.test(clip.title ?? '') || /\S/u.test(clip.url ?? clip.content);
  }
  return /\S/u.test(
    clip.type === 'html' || clip.type === 'rtf' ? (clip.text ?? clip.content) : clip.content
  );
}

/**
 * The clips the reader can land on: visible rows with content, in row order.
 */
export function walkable(visible: readonly VisibleClip[]): VisibleClip[] {
  return visible.filter(({ clip }) => hasContent(clip));
}

export interface QuickLookPosition {
  index: number; // row index in the full list, -1 when the clip is gone
  visibleIndex: number; // index among walkable visible clips, -1 when hidden by the filter
  visibleCount: number;
  hidden: boolean;
  label: string; // "5 / 6", "2 / 5 filtered", "hidden by filter"
}

export interface QuickLookNavigation {
  readonly rowById: ReadonlyMap<string, number>;
  readonly stepById: ReadonlyMap<string, number>;
  readonly steps: readonly { id: string; originalIndex: number }[];
}

/** Build once when the clip/filter data changes; opening and walking then only query it. */
export function createQuickLookNavigation(
  clips: readonly ClipItem[],
  visible: readonly VisibleClip[]
): QuickLookNavigation {
  const rowById = new Map<string, number>();
  for (let i = 0; i < clips.length; i++) rowById.set(clips[i].id, i);

  const stepById = new Map<string, number>();
  const steps: { id: string; originalIndex: number }[] = [];
  for (const { clip, originalIndex } of visible) {
    if (!hasContent(clip)) continue;
    stepById.set(clip.id, steps.length);
    steps.push({ id: clip.id, originalIndex });
  }
  return { rowById, stepById, steps };
}

export function positionFromNavigation(
  navigation: QuickLookNavigation,
  openClipId: string,
  filtering: boolean
): QuickLookPosition {
  const index = navigation.rowById.get(openClipId) ?? -1;
  const visibleIndex = navigation.stepById.get(openClipId) ?? -1;
  const hidden = index >= 0 && visibleIndex < 0;
  const label = hidden
    ? 'hidden by filter'
    : `${visibleIndex + 1} / ${navigation.steps.length}${filtering ? ' filtered' : ''}`;
  return { index, visibleIndex, visibleCount: navigation.steps.length, hidden, label };
}

export function quickLookPosition(
  clips: readonly ClipItem[],
  visible: readonly VisibleClip[],
  openClipId: string,
  filtering: boolean
): QuickLookPosition {
  return positionFromNavigation(createQuickLookNavigation(clips, visible), openClipId, filtering);
}

export function targetFromNavigation(
  navigation: QuickLookNavigation,
  openClipId: string,
  direction: -1 | 1
): string | null {
  const at = navigation.stepById.get(openClipId);
  if (at !== undefined) return navigation.steps[at + direction]?.id ?? null;

  const row = navigation.rowById.get(openClipId);
  if (row === undefined) return null;
  let low = 0;
  let high = navigation.steps.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (navigation.steps[middle].originalIndex < row) low = middle + 1;
    else high = middle;
  }
  return direction === 1
    ? (navigation.steps[low]?.id ?? null)
    : (navigation.steps[low - 1]?.id ?? null);
}

/**
 * The id of the previous or next clip with content in the visible set, or null at the
 * ends. From a clip the filter hides, the nearest visible clip in that direction.
 */
export function walkTarget(
  clips: readonly ClipItem[],
  visible: readonly VisibleClip[],
  openClipId: string,
  direction: -1 | 1
): string | null {
  return targetFromNavigation(createQuickLookNavigation(clips, visible), openClipId, direction);
}
