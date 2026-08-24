import React from 'react';
import type { ClipItem } from '../../../../shared/types';
import type { PinsByGroup } from '../../../../shared/tools';
import type { PinMap } from './pins';
import type { QuickLookPosition, QuickLookState, QuickLookView, VisibleClip } from './quickLook';

export type { ClipItem, ClipType } from '../../../../shared/types';

export type ClipsDataContextType = {
  clips: ClipItem[];
  filteredClips: VisibleClip[];
  searchTerm: string;
  pinnedOnly: boolean;
  isFiltering: boolean;
  imagesNotSearched: number;
};

export type ClipsActionsContextType = {
  setClips: React.Dispatch<React.SetStateAction<ClipItem[]>>;
  getClip: (index: number) => ClipItem;
  emptyClip: (index: number) => void;
  updateClip: (index: number, updatedClip: ClipItem) => void;
  toggleClipLock: (index: number) => void;
  isClipLocked: (index: number) => boolean;
  clipboardUpdated: (newClip: ClipItem) => void;
  readCurrentClipboard: () => Promise<void>;
  copyClipToClipboard: (index: number) => Promise<void>;
};

export type ClipsMetaContextType = {
  clipCopyId: string | null;
  maxClips: number;
  setMaxClips: React.Dispatch<React.SetStateAction<number>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setPinnedOnly: React.Dispatch<React.SetStateAction<boolean>>;
  isSearchVisible: boolean;
  setIsSearchVisible: React.Dispatch<React.SetStateAction<boolean>>;
  hideSearch: () => void;
};

export type ClipsContextType = ClipsDataContextType &
  ClipsActionsContextType &
  ClipsMetaContextType;

export type ClipsPinsContextType = {
  pins: PinMap;
  pinsByGroup: PinsByGroup;
  isPinned: (key: string) => boolean;
  togglePins: (keys: readonly string[]) => void;
  setPins: (keys: readonly string[], on: boolean) => void;
  clearPins: () => void;
  droppedNotice: string | null;
  dismissDroppedNotice: () => void;
};

export type ClipsQuickLookContextType = {
  quickLook: QuickLookState;
  openClip: ClipItem | null;
  position: QuickLookPosition | null;
  openQuickLook: (clipId: string, returnFocusIndex: number | null) => void;
  closeQuickLook: () => void;
  walkQuickLook: (direction: -1 | 1) => void;
  setView: (view: QuickLookView) => void;
  setEditing: (editing: boolean) => void;
  toggleWrap: () => void;
  openNewest: () => void;
  focusRequest: { index: number; seq: number } | null;
  requestRowFocus: (index: number) => void;
};

export interface ClipboardState {
  content: string;
  type: string;
}
