import { createContext, useContext, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_MAX_CLIPS } from '../constants';
import { useLanguageDetection } from '../languageDetection';
import { ClipItem, ClipsContextType, ClipboardState } from './types';
import { updateClipsLength } from './utils';
import { useClipsStorage } from './storage';
import { useClipboardOperations } from './clipboard';
import { useClipState } from './state';

export const ClipsContext = createContext({});

export const useClips = (): ClipsContextType => useContext(ClipsContext) as ClipsContextType;

export function ClipsProvider({ children }: { children: React.ReactNode }) {
  // the array of clip values
  const [clips, setClips] = useState<ClipItem[]>(updateClipsLength([], DEFAULT_MAX_CLIPS));
  const [clipCopyIndex, setClipCopyIndex] = useState<number | null>(null);
  // the maximum number of clips to store
  const [maxClips, setMaxClips] = useState<number>(DEFAULT_MAX_CLIPS);

  // track locked clips by their index with boolean values
  const [lockedClips, setLockedClips] = useState<Record<number, boolean>>({});

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);

  // Track if we're still loading initial data to prevent saves during load
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);

  // state to track when hotkey operations are happening
  const [isHotkeyOperation, setIsHotkeyOperation] = useState<boolean>(false);
  const [lastCopiedContent, setLastCopiedContent] = useState<ClipboardState | null>(null);

  // Use refs to always have access to the current state in callbacks
  const clipsRef = useRef(clips);
  const isHotkeyOperationRef = useRef(isHotkeyOperation);
  const lastCopiedContentRef = useRef(lastCopiedContent);

  clipsRef.current = clips;
  isHotkeyOperationRef.current = isHotkeyOperation;
  lastCopiedContentRef.current = lastCopiedContent;

  // Use language detection settings from the context
  const { isCodeDetectionEnabled } = useLanguageDetection();

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
  } = useClipState(clips, setClips, maxClips, lockedClips, setLockedClips, setClipCopyIndex);

  // Use clipboard operations hook
  const { readCurrentClipboard, copyClipToClipboard } = useClipboardOperations(
    isCodeDetectionEnabled,
    isDuplicateOfMostRecent,
    clipboardUpdated,
    getClip,
    setClipCopyIndex,
    setIsHotkeyOperation,
    setLastCopiedContent,
    clipsRef,
    isHotkeyOperationRef,
    lastCopiedContentRef
  );

  // Listen for toggle-search IPC from main process
  const toggleSearch = useCallback(() => {
    setIsSearchVisible((prev) => !prev);
  }, []);

  useEffect(() => {
    if (window.api?.onToggleSearch) {
      window.api.onToggleSearch(toggleSearch);
    }
    return () => {
      if (window.api?.removeToggleSearchListeners) {
        window.api.removeToggleSearchListeners();
      }
    };
  }, [toggleSearch]);

  // Reset search state when window is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsSearchVisible(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Filter clips based on search term
  const filteredClips = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return clips.map((clip, index) => ({ clip, originalIndex: index }));
    }
    return clips.reduce<{ clip: ClipItem; originalIndex: number }[]>((acc, clip, index) => {
      if (clip.type === 'image') return acc;
      if (clip.type === 'bookmark') {
        if (
          clip.content.toLowerCase().includes(term) ||
          (clip.title && clip.title.toLowerCase().includes(term)) ||
          (clip.url && clip.url.toLowerCase().includes(term))
        ) {
          acc.push({ clip, originalIndex: index });
        }
        return acc;
      }
      if (clip.content.toLowerCase().includes(term)) {
        acc.push({ clip, originalIndex: index });
      }
      return acc;
    }, []);
  }, [clips, searchTerm]);

  const providerValue = useMemo(
    () => ({
      // clips management
      clips,
      setClips,
      getClip,
      emptyClip,
      updateClip,
      // clip locking
      toggleClipLock,
      isClipLocked,
      // clipboard management
      clipboardUpdated,
      readCurrentClipboard,
      copyClipToClipboard,
      clipCopyIndex,
      // max clips management
      setMaxClips,
      maxClips,
      // search
      searchTerm,
      setSearchTerm,
      isSearchVisible,
      setIsSearchVisible,
      filteredClips,
    }),
    [
      clips,
      setClips,
      getClip,
      emptyClip,
      updateClip,
      toggleClipLock,
      isClipLocked,
      clipboardUpdated,
      readCurrentClipboard,
      copyClipToClipboard,
      clipCopyIndex,
      setMaxClips,
      maxClips,
      searchTerm,
      setSearchTerm,
      isSearchVisible,
      setIsSearchVisible,
      filteredClips,
    ]
  );

  return <ClipsContext.Provider value={providerValue}>{children}</ClipsContext.Provider>;
}

// Re-export all the types and utilities for consumers
export * from './types';
export * from './utils';
