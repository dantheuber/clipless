import type { ClipItem } from '../../../../shared/types';
import { clipText } from './utils';

export type QuickLookView = 'text' | 'source' | 'rendered';

export interface QuickLookState {
  openClipId: string | null;
  view: QuickLookView;
  editing: boolean;
  returnFocusIndex: number | null;
  wrap: boolean;
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

export function walkable(visible: readonly VisibleClip[]): VisibleClip[] {
  return visible.filter(({ clip }) => hasContent(clip));
}

export interface QuickLookPosition {
  index: number;
  visibleIndex: number;
  visibleCount: number;
  hidden: boolean;
  label: string;
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
