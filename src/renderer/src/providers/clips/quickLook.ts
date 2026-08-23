import type { ClipItem } from '../../../../shared/types';
import { clipText } from './utils';

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
  return clip.type === 'image' ? clip.content.length > 0 : clipText(clip).trim().length > 0;
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

export function quickLookPosition(
  clips: readonly ClipItem[],
  visible: readonly VisibleClip[],
  openClipId: string,
  filtering: boolean
): QuickLookPosition {
  const index = clips.findIndex((clip) => clip.id === openClipId);
  const steps = walkable(visible);
  const visibleIndex = steps.findIndex(({ clip }) => clip.id === openClipId);
  const hidden = index >= 0 && visibleIndex < 0;
  const label = hidden
    ? 'hidden by filter'
    : `${visibleIndex + 1} / ${steps.length}${filtering ? ' filtered' : ''}`;
  return { index, visibleIndex, visibleCount: steps.length, hidden, label };
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
  const steps = walkable(visible);
  const at = steps.findIndex(({ clip }) => clip.id === openClipId);
  if (at >= 0) {
    return steps[at + direction]?.clip.id ?? null;
  }
  const row = clips.findIndex((clip) => clip.id === openClipId);
  if (row < 0) return null;
  const nearest =
    direction === 1
      ? steps.find((s) => s.originalIndex > row)
      : [...steps].reverse().find((s) => s.originalIndex < row);
  return nearest?.clip.id ?? null;
}
