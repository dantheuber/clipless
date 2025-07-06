/**
 * Shared types for the Clipless application
 * Used across main, renderer, and preload processes
 */

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
  url?: string;   // for bookmark type
  language?: string; // detected programming language
  isCode?: boolean; // whether the content appears to be code
}

/**
 * Stored clip with metadata
 */
export interface StoredClip {
  clip: ClipItem;
  isLocked: boolean;
  timestamp: number;
}

/**
 * User settings and preferences
 */
export interface UserSettings {
  maxClips: number;
  startMinimized: boolean;
  autoStart: boolean;
  hotkey?: string;
  theme?: 'light' | 'dark' | 'system';
  codeDetectionEnabled?: boolean;
}

/**
 * Complete application data structure
 */
export interface AppData {
  clips: StoredClip[];
  settings: UserSettings;
  templates: Template[];
  version: string;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  clipCount: number;
  lockedCount: number;
  dataSize: number;
}

/**
 * Clipboard data as received from Electron API
 */
export interface ClipboardData {
  type: string;
  content: string;
}

/**
 * Bookmark data for clipboard operations
 */
export interface BookmarkData {
  text: string;
  html: string;
  title?: string;
  url?: string;
}

/**
 * Template for text generation with clipboard content
 */
export interface Template {
  id: string; // UUID
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  order: number;
}

/**
 * Template management operations
 */
export interface TemplateOperations {
  create: (name: string, content: string) => Promise<Template>;
  update: (id: string, updates: Partial<Template>) => Promise<Template>;
  delete: (id: string) => Promise<void>;
  reorder: (templates: Template[]) => Promise<void>;
  getAll: () => Promise<Template[]>;
  generateText: (templateId: string, clipContents: string[]) => Promise<string>;
}
