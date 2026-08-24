import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClipItem } from '../../../../shared/types';
import {
  INITIAL_QUICK_LOOK,
  type QuickLookState,
  type QuickLookView,
  type VisibleClip,
  closeState,
  hasContent,
  openOn,
  quickLookPosition,
  walkTarget,
} from './quickLook';
import { useOpenQuickLookSignal } from './useOpenQuickLookSignal';

type Toast = (message: string, detail?: string) => void;

export function useQuickLookState(
  clips: ClipItem[],
  filteredClips: VisibleClip[],
  isFiltering: boolean,
  toast: Toast,
  clearFilter: () => void
) {
  const [quickLook, setQuickLook] = useState<QuickLookState>(INITIAL_QUICK_LOOK);
  const [focusRequest, setFocusRequest] = useState<{ index: number; seq: number } | null>(null);
  const clipsRef = useRef(clips);
  const filteredRef = useRef(filteredClips);
  clipsRef.current = clips;
  filteredRef.current = filteredClips;

  const openClip = useMemo(
    () =>
      quickLook.openClipId === null
        ? null
        : (clips.find((clip) => clip.id === quickLook.openClipId) ?? null),
    [clips, quickLook.openClipId]
  );
  const position = useMemo(
    () =>
      quickLook.openClipId === null
        ? null
        : quickLookPosition(clips, filteredClips, quickLook.openClipId, isFiltering),
    [clips, filteredClips, quickLook.openClipId, isFiltering]
  );

  const requestRowFocus = useCallback((index: number) => {
    setFocusRequest((request) => ({ index, seq: (request?.seq ?? 0) + 1 }));
  }, []);
  const openQuickLook = useCallback((clipId: string, returnFocusIndex: number | null) => {
    setQuickLook((current) => openOn(current, clipId, returnFocusIndex));
  }, []);
  const closeQuickLook = useCallback(() => {
    setQuickLook((current) => {
      if (current.returnFocusIndex !== null) requestRowFocus(current.returnFocusIndex);
      return closeState(current);
    });
  }, [requestRowFocus]);
  const walkQuickLook = useCallback(
    (direction: -1 | 1) => {
      if (quickLook.openClipId === null) return;
      const target = walkTarget(clips, filteredClips, quickLook.openClipId, direction);
      if (target !== null) setQuickLook((current) => openOn(current, target));
    },
    [clips, filteredClips, quickLook.openClipId]
  );
  const setView = useCallback((view: QuickLookView) => {
    setQuickLook((current) => ({ ...current, view }));
  }, []);
  const setEditing = useCallback((editing: boolean) => {
    setQuickLook((current) => ({ ...current, editing }));
  }, []);
  const toggleWrap = useCallback(() => {
    setQuickLook((current) => ({ ...current, wrap: !current.wrap }));
  }, []);

  useEffect(() => {
    if (quickLook.openClipId !== null && position !== null && position.index === -1) {
      toast('The clip rotated out of the list, so the reader closed');
      closeQuickLook();
    }
  }, [quickLook.openClipId, position, toast, closeQuickLook]);

  const openNewest = useCallback(() => {
    const first = clipsRef.current[0];
    if (!first || !hasContent(first)) {
      toast('Nothing to look at yet', 'Copy something and try again');
      return;
    }
    if (!filteredRef.current.some((visible) => visible.originalIndex === 0)) {
      clearFilter();
      toast('Filter cleared', 'Quick look opened on row 1');
    }
    setQuickLook((current) => openOn(current, first.id, 0));
  }, [clearFilter, toast]);

  useOpenQuickLookSignal(openNewest);

  return {
    quickLook,
    openClip,
    position,
    openQuickLook,
    closeQuickLook,
    walkQuickLook,
    setView,
    setEditing,
    toggleWrap,
    openNewest,
    focusRequest,
    requestRowFocus,
  };
}
