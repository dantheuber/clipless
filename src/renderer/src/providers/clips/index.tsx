import {
  createContext,
  useContext,
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { DEFAULT_MAX_CLIPS } from '../constants';
import { useLanguageDetection } from '../languageDetection';
import { useScanIndex } from '../scan';
import { useToast } from '../../components/Toast';
import { pinKey } from '../../../../shared/readiness';
import {
  ClipItem,
  ClipsDataContextType,
  ClipsActionsContextType,
  ClipsMetaContextType,
  ClipsPinsContextType,
  ClipsQuickLookContextType,
  ClipsContextType,
  ClipboardState,
} from './types';
import { clipText, updateClipsLength } from './utils';
import { useClipsStorage } from './storage';
import { useClipboardOperations } from './clipboard';
import { useClipState } from './state';
import {
  EMPTY_PINS,
  type PinMap,
  clearPins as clearPinMap,
  nextPinnedAt,
  pinsByGroup as groupPins,
  setPins as setPinKeys,
  togglePins as togglePinKeys,
} from './pins';
import { usePinPruning } from './usePinPruning';
import { useOpenQuickLookSignal } from './useOpenQuickLookSignal';
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

// eslint-disable-next-line react-refresh/only-export-components
export const ClipsDataContext = createContext<ClipsDataContextType | null>(null);
// eslint-disable-next-line react-refresh/only-export-components
export const ClipsActionsContext = createContext<ClipsActionsContextType | null>(null);
// eslint-disable-next-line react-refresh/only-export-components
export const ClipsMetaContext = createContext<ClipsMetaContextType | null>(null);
// eslint-disable-next-line react-refresh/only-export-components
export const ClipsPinsContext = createContext<ClipsPinsContextType | null>(null);
// eslint-disable-next-line react-refresh/only-export-components
export const ClipsQuickLookContext = createContext<ClipsQuickLookContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useClipsData = (): ClipsDataContextType => {
  const ctx = useContext(ClipsDataContext);
  if (!ctx) throw new Error('useClipsData must be used within ClipsProvider');
  return ctx;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useClipsActions = (): ClipsActionsContextType => {
  const ctx = useContext(ClipsActionsContext);
  if (!ctx) throw new Error('useClipsActions must be used within ClipsProvider');
  return ctx;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useClipsMeta = (): ClipsMetaContextType => {
  const ctx = useContext(ClipsMetaContext);
  if (!ctx) throw new Error('useClipsMeta must be used within ClipsProvider');
  return ctx;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useClipsPins = (): ClipsPinsContextType => {
  const ctx = useContext(ClipsPinsContext);
  if (!ctx) throw new Error('useClipsPins must be used within ClipsProvider');
  return ctx;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useQuickLook = (): ClipsQuickLookContextType => {
  const ctx = useContext(ClipsQuickLookContext);
  if (!ctx) throw new Error('useQuickLook must be used within ClipsProvider');
  return ctx;
};

/**
 * Convenience hook that merges the three original contexts (backwards compat)
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useClips = (): ClipsContextType => {
  const data = useClipsData();
  const actions = useClipsActions();
  const meta = useClipsMeta();
  return { ...data, ...actions, ...meta };
};

export function ClipsProvider({ children }: { children: React.ReactNode }) {
  // the array of clip values
  const [clips, setClips] = useState<ClipItem[]>(updateClipsLength([], DEFAULT_MAX_CLIPS));
  // the clip whose content was last copied back to the clipboard; follows the clip by id
  const [clipCopyId, setClipCopyId] = useState<string | null>(null);
  // the maximum number of clips to store
  const [maxClips, setMaxClips] = useState<number>(DEFAULT_MAX_CLIPS);

  // track locked clips by their index with boolean values
  const [lockedClips, setLockedClips] = useState<Record<number, boolean>>({});

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pinnedOnly, setPinnedOnly] = useState<boolean>(false);
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);

  // Pins and the reader (spec 17.1)
  const [pins, setPinMap] = useState<PinMap>(EMPTY_PINS);
  const [droppedNotice, setDroppedNotice] = useState<string | null>(null);
  const [quickLook, setQuickLook] = useState<QuickLookState>(INITIAL_QUICK_LOOK);
  const [focusRequest, setFocusRequest] = useState<{ index: number; seq: number } | null>(null);

  // Track if we're still loading initial data to prevent saves during load
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);

  // state to track when hotkey operations are happening
  const [isHotkeyOperation, setIsHotkeyOperation] = useState<boolean>(false);
  const [lastCopiedContent, setLastCopiedContent] = useState<ClipboardState | null>(null);

  // Use refs to always have access to the current state in callbacks
  const clipsRef = useRef(clips);
  const isHotkeyOperationRef = useRef(isHotkeyOperation);
  const lastCopiedContentRef = useRef(lastCopiedContent);
  const pinsRef = useRef(pins);

  clipsRef.current = clips;
  isHotkeyOperationRef.current = isHotkeyOperation;
  lastCopiedContentRef.current = lastCopiedContent;
  pinsRef.current = pins;

  // Use language detection settings from the context
  const { isCodeDetectionEnabled } = useLanguageDetection();
  const { getScan, version: scanVersion } = useScanIndex();
  const toast = useToast();

  // Use storage hook for loading/saving data
  useClipsStorage(
    clips,
    lockedClips,
    maxClips,
    isInitiallyLoading,
    setClips,
    setLockedClips,
    setMaxClips,
    setIsInitiallyLoading
  );

  // Use state management hook for clip operations
  const {
    getClip,
    emptyClip,
    updateClip,
    toggleClipLock,
    isClipLocked,
    isDuplicateOfMostRecent,
    clipboardUpdated,
  } = useClipState(clips, setClips, maxClips, lockedClips, setLockedClips);

  // Use clipboard operations hook
  const { readCurrentClipboard, copyClipToClipboard: writeClipToClipboard } =
    useClipboardOperations(
      isCodeDetectionEnabled,
      isDuplicateOfMostRecent,
      clipboardUpdated,
      getClip,
      setClipCopyId,
      setIsHotkeyOperation,
      setLastCopiedContent,
      clipsRef,
      isHotkeyOperationRef,
      lastCopiedContentRef
    );

  // Every copy from the window toasts; the OS notification is for hotkey copies only (rule 8)
  const copyClipToClipboard = useCallback(
    async (index: number): Promise<void> => {
      const copied = await writeClipToClipboard(index);
      if (copied) toast(`Copied clip ${index + 1} to the clipboard`);
    },
    [writeClipToClipboard, toast]
  );

  // Listen for toggle-search IPC from main process
  const hideSearch = useCallback(() => {
    setIsSearchVisible(false);
    setSearchTerm('');
    setPinnedOnly(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setIsSearchVisible((prev) => {
      if (prev) {
        setSearchTerm('');
        setPinnedOnly(false);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!window.api?.onToggleSearch) return;
    return window.api.onToggleSearch(toggleSearch);
  }, [toggleSearch]);

  // Reset search state when window is hidden; pins and the reader survive a hide (rule 13)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) hideSearch();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [hideSearch]);

  // Filter clips: substring on the clip's text, images excluded; the pinned toggle keeps
  // clips that contain a pinned value (rule 2)
  const { filteredClips, imagesNotSearched } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term && !pinnedOnly) {
      return {
        filteredClips: clips.map((clip, index) => ({ clip, originalIndex: index })),
        imagesNotSearched: 0,
      };
    }
    let images = 0;
    const visible = clips.reduce<VisibleClip[]>((acc, clip, index) => {
      if (term) {
        if (clip.type === 'image') {
          if (clip.content) images++;
          return acc;
        }
        if (!clipText(clip).toLowerCase().includes(term)) return acc;
      }
      if (pinnedOnly) {
        const scan = getScan(clip);
        if (!scan || !scan.matches.some((m) => pins.has(pinKey(m.group, m.value)))) return acc;
      }
      acc.push({ clip, originalIndex: index });
      return acc;
    }, []);
    return { filteredClips: visible, imagesNotSearched: images };
    // scanVersion re-reads the cache when a deferred scan lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, searchTerm, pinnedOnly, pins, getScan, scanVersion]);

  const isFiltering = searchTerm.trim().length > 0 || pinnedOnly;

  // Pin writers (spec 17.1): one set, no component holds its own pin state
  const togglePins = useCallback((keys: readonly string[]) => {
    setPinMap((current) => togglePinKeys(current, keys, nextPinnedAt(current)));
  }, []);
  const setPins = useCallback((keys: readonly string[], on: boolean) => {
    setPinMap((current) => setPinKeys(current, keys, on, nextPinnedAt(current)));
  }, []);
  const clearPins = useCallback(() => {
    setPinMap(clearPinMap());
  }, []);
  const isPinned = useCallback((key: string) => pins.has(key), [pins]);
  const pinsByGroup = useMemo(() => groupPins(pins), [pins]);

  // Pruning: drop pins whose value no longer appears in any clip's scan, with the reason
  // read from the diff against the previous clips array. One notice per change.
  const onPrune = useCallback((pruned: PinMap, notice: string) => {
    setPinMap(pruned);
    setDroppedNotice(notice);
  }, []);
  usePinPruning(clips, getScan, scanVersion, pinsRef, onPrune);
  const dismissDroppedNotice = useCallback(() => setDroppedNotice(null), []);

  // The reader (spec 17.1): tracks a clip by id
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

  // When the open clip rotates out of the list, the reader closes with a toast (rule 7)
  useEffect(() => {
    if (quickLook.openClipId !== null && position !== null && position.index === -1) {
      toast('The clip rotated out of the list, so the reader closed');
      closeQuickLook();
    }
  }, [quickLook.openClipId, position, toast, closeQuickLook]);

  // The hotkey and the status bar button open row 1; a filter hiding it is cleared first
  const filteredRef = useRef(filteredClips);
  filteredRef.current = filteredClips;
  const openNewest = useCallback(() => {
    const first = clipsRef.current[0];
    if (!first || !hasContent(first)) {
      toast('Nothing to look at yet', 'Copy something and try again');
      return;
    }
    if (!filteredRef.current.some((v) => v.originalIndex === 0)) {
      setSearchTerm('');
      setPinnedOnly(false);
      toast('Filter cleared', 'Quick look opened on row 1');
    }
    setQuickLook((current) => openOn(current, first.id, 0));
  }, [toast]);

  // open-quick-look from the main process, after any pending clipboard change has landed
  useOpenQuickLookSignal(openNewest);

  // Split context values for granular re-rendering
  const dataValue = useMemo(
    () => ({ clips, filteredClips, searchTerm, pinnedOnly, isFiltering, imagesNotSearched }),
    [clips, filteredClips, searchTerm, pinnedOnly, isFiltering, imagesNotSearched]
  );

  const actionsValue = useMemo(
    () => ({
      setClips,
      getClip,
      emptyClip,
      updateClip,
      toggleClipLock,
      isClipLocked,
      clipboardUpdated,
      readCurrentClipboard,
      copyClipToClipboard,
    }),
    [
      setClips,
      getClip,
      emptyClip,
      updateClip,
      toggleClipLock,
      isClipLocked,
      clipboardUpdated,
      readCurrentClipboard,
      copyClipToClipboard,
    ]
  );

  const metaValue = useMemo(
    () => ({
      clipCopyId,
      maxClips,
      setMaxClips,
      setSearchTerm,
      setPinnedOnly,
      isSearchVisible,
      setIsSearchVisible,
      hideSearch,
    }),
    [clipCopyId, maxClips, isSearchVisible, hideSearch]
  );

  const pinsValue = useMemo(
    () => ({
      pins,
      pinsByGroup,
      isPinned,
      togglePins,
      setPins,
      clearPins,
      droppedNotice,
      dismissDroppedNotice,
    }),
    [
      pins,
      pinsByGroup,
      isPinned,
      togglePins,
      setPins,
      clearPins,
      droppedNotice,
      dismissDroppedNotice,
    ]
  );

  const quickLookValue = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return (
    <ClipsDataContext.Provider value={dataValue}>
      <ClipsActionsContext.Provider value={actionsValue}>
        <ClipsMetaContext.Provider value={metaValue}>
          <ClipsPinsContext.Provider value={pinsValue}>
            <ClipsQuickLookContext.Provider value={quickLookValue}>
              {children}
            </ClipsQuickLookContext.Provider>
          </ClipsPinsContext.Provider>
        </ClipsMetaContext.Provider>
      </ClipsActionsContext.Provider>
    </ClipsDataContext.Provider>
  );
}

// Re-export all the types and utilities for consumers
// eslint-disable-next-line react-refresh/only-export-components
export * from './types';
// eslint-disable-next-line react-refresh/only-export-components
export * from './utils';
