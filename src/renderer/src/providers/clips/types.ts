import React from 'react';

/**
 * Supported clipboard types based on Electron's clipboard API
 */
export type ClipType = 'text' | 'html' | 'image' | 'rtf' | 'bookmark';

/**
 * Represents a single clipboard item with its content and type
 */
export interface ClipItem {
  type: ClipType;
  content: string;
  title?: string; // for bookmark type
  url?: string; // for bookmark type
  language?: string; // detected programming language
  isCode?: boolean; // whether the content appears to be code
}

/**
 * Context type for the ClipsProvider
 */
export type ClipsContextType = {
  clips: ClipItem[];
  setClips: React.Dispatch<React.SetStateAction<ClipItem[]>>;
  getClip: (index: number) => ClipItem;
  toggleClipLock: (index: number) => void;
  isClipLocked: (index: number) => boolean;
  clipboardUpdated: (newClip: ClipItem) => void;
  readCurrentClipboard: () => Promise<void>;
  copyClipToClipboard: (index: number) => Promise<void>;
  clipCopyIndex: number | null;
  emptyClip: (index: number) => void;
  updateClip: (index: number, updatedClip: ClipItem) => void;
  setMaxClips: React.Dispatch<React.SetStateAction<number>>;
  maxClips: number;
};

/**
 * Internal state interface for clipboard tracking
 */
export interface ClipboardState {
  content: string;
  type: string;
}
