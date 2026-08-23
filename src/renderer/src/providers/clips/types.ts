import React from 'react';
import type { ClipItem } from '../../../../shared/types';

export type { ClipItem, ClipType } from '../../../../shared/types';

/**
 * Read-only clip data for rendering
 */
export type ClipsDataContextType = {
  clips: ClipItem[];
  filteredClips: { clip: ClipItem; originalIndex: number }[];
  searchTerm: string;
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
  isSearchVisible: boolean;
  setIsSearchVisible: React.Dispatch<React.SetStateAction<boolean>>;
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
