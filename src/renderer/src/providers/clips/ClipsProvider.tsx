import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_MAX_CLIPS } from '../constants';
import { useLanguageDetection } from '../languageDetection';
import { useScanIndex } from '../scan';
import { useToast } from '../../components/useToast';
import { ClipItem, ClipboardState } from './types';
import { updateClipsLength } from './utils';
import { useClipsStorage } from './storage';
import { useClipboardOperations } from './clipboard';
import { useClipState } from './state';
import { ClipsContexts } from './ClipsContexts';
import { useClipFiltering } from './filtering';
import { usePins } from './usePins';
import { useQuickLookState } from './useQuickLook';

export function ClipsProvider({ children }: { children: React.ReactNode }) {
  const [clips, setClips] = useState<ClipItem[]>(updateClipsLength([], DEFAULT_MAX_CLIPS));
  const [clipCopyId, setClipCopyId] = useState<string | null>(null);
  const [maxClips, setMaxClips] = useState<number>(DEFAULT_MAX_CLIPS);
  const [lockedClips, setLockedClips] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pinnedOnly, setPinnedOnly] = useState<boolean>(false);
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
  const [isHotkeyOperation, setIsHotkeyOperation] = useState<boolean>(false);
  const [lastCopiedContent, setLastCopiedContent] = useState<ClipboardState | null>(null);
  const clipsRef = useRef(clips);
  const isHotkeyOperationRef = useRef(isHotkeyOperation);
  const lastCopiedContentRef = useRef(lastCopiedContent);

  clipsRef.current = clips;
  isHotkeyOperationRef.current = isHotkeyOperation;
  lastCopiedContentRef.current = lastCopiedContent;
  const { isCodeDetectionEnabled } = useLanguageDetection();
  const { getScan, version: scanVersion } = useScanIndex();
  const toast = useToast();

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

  const {
    getClip,
    emptyClip,
    updateClip,
    toggleClipLock,
    isClipLocked,
    isDuplicateOfMostRecent,
    clipboardUpdated,
  } = useClipState(clips, setClips, maxClips, lockedClips, setLockedClips);

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

  const copyClipToClipboard = useCallback(
    async (index: number): Promise<void> => {
      const copied = await writeClipToClipboard(index);
      if (copied) toast(`Copied clip ${index + 1} to the clipboard`);
    },
    [writeClipToClipboard, toast]
  );

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

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) hideSearch();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [hideSearch]);

  const pinState = usePins(clips, getScan, scanVersion);
  const { filteredClips, imagesNotSearched, isFiltering } = useClipFiltering(
    clips,
    searchTerm,
    pinnedOnly,
    pinState.pins,
    getScan,
    scanVersion
  );
  const quickLookState = useQuickLookState(clips, filteredClips, isFiltering, toast, hideSearch);

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

  return (
    <ClipsContexts
      data={dataValue}
      actions={actionsValue}
      meta={metaValue}
      pins={pinState}
      quickLook={quickLookState}
    >
      {children}
    </ClipsContexts>
  );
}
