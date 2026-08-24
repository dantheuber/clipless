import React from 'react';
import type { ClipItem } from '../../../../shared/types';
import type { PinsByGroup } from '../../../../shared/tools';
import type { PinMap } from './pins';
import type { QuickLookPosition, QuickLookState, QuickLookView, VisibleClip } from './quickLook';

export type { ClipItem, ClipType } from '../../../../shared/types';

/**
 * Read-only clip data for rendering
 */
export type ClipsDataContextType = {
  clips: ClipItem[];
  filteredClips: VisibleClip[];
  searchTerm: string;
  pinnedOnly: boolean;
  /** true while the search term or the pinned toggle hides anything */
  isFiltering: boolean;
  /** image clips a text search skipped, for the count line (spec 16 rule 2) */
  imagesNotSearched: number;
};

/**
 * Stable action functions that rarely change identity
 */
export type ClipsActionsContextType = {
  setClips: React.Dispatch<React.SetStateAction<ClipItem[]>>;
  getClip: (index: number) => ClipItem;
  emptyClip: (index: number) => void;
  updateClip: (index: number, updatedClip: ClipItem) => void;
  toggleClipLock: (index: number) => void;
  isClipLocked: (index: number) => boolean;
  clipboardUpdated: (newClip: ClipItem) => void;
  readCurrentClipboard: () => Promise<void>;
  /** Copies the clip and toasts; every clipboard write from the window toasts (rule 8) */
  copyClipToClipboard: (index: number) => Promise<void>;
};

/**
 * UI state and setters
 */
export type ClipsMetaContextType = {
  clipCopyId: string | null; // the clip whose content was last copied back; follows the clip
  maxClips: number;
  setMaxClips: React.Dispatch<React.SetStateAction<number>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setPinnedOnly: React.Dispatch<React.SetStateAction<boolean>>;
  isSearchVisible: boolean;
  setIsSearchVisible: React.Dispatch<React.SetStateAction<boolean>>;
  /** Close the bar and clear the filter with it, so an invisible filter cannot persist */
  hideSearch: () => void;
};

/**
 * Pins: memory only, keyed group|value (spec 17.1)
 */
export type ClipsPinsContextType = {
  pins: PinMap;
  pinsByGroup: PinsByGroup;
  isPinned: (key: string) => boolean;
  togglePins: (keys: readonly string[]) => void;
  setPins: (keys: readonly string[], on: boolean) => void;
  clearPins: () => void;
  /** The tray's one-line notice for the last change that dropped pins, or null */
  droppedNotice: string | null;
  dismissDroppedNotice: () => void;
};

/**
 * The reader's state and the actions that move it (spec 17.1)
 */
export type ClipsQuickLookContextType = {
  quickLook: QuickLookState;
  /** The open clip, or null when the reader is closed */
  openClip: ClipItem | null;
  position: QuickLookPosition | null;
  walkTargets: { up: string | null; down: string | null };
  openQuickLook: (clipId: string, returnFocusIndex: number | null) => void;
  closeQuickLook: () => void;
  /** Up (-1) or Down (1) to the neighbouring clip with content; no-op at the ends */
  walkQuickLook: (direction: -1 | 1) => void;
  setView: (view: QuickLookView) => void;
  setEditing: (editing: boolean) => void;
  toggleWrap: () => void;
  /** The hotkey and the status bar button: row 1, clearing a filter that hides it */
  openNewest: () => void;
  /** Set on close so the list can scroll the row back into view and focus it */
  focusRequest: { index: number; seq: number } | null;
  /** Ask the list to scroll a row (by its real index) into view and focus it */
  requestRowFocus: (index: number) => void;
};

/**
 * Combined context type (backwards compat convenience)
 */
export type ClipsContextType = ClipsDataContextType &
  ClipsActionsContextType &
  ClipsMetaContextType;

/**
 * Internal state interface for clipboard tracking
 */
export interface ClipboardState {
  content: string;
  type: string;
}
