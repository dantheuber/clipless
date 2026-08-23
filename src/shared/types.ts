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
  id: string; // assigned by the renderer's clip creators; backfilled by migrateData on load
  type: ClipType;
  content: string;
  title?: string; // for bookmark type
  url?: string; // for bookmark type
  language?: string; // detected programming language
  isCode?: boolean; // whether the content appears to be code
  imageId?: string; // UUID for image clips stored as separate files
  thumbnailDataUrl?: string; // 200px-wide thumbnail data URL for image clips
  imageWidth?: number; // pixel size recorded at capture; older image clips have none
  imageHeight?: number;
  imageBytes?: number; // size of the stored image; older image clips estimate from the thumbnail
  text?: string; // extracted text for html and rtf clips; the scanner reads this, not the markup
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
 * Hotkey configuration for specific actions
 */
export interface HotkeyConfig {
  enabled: boolean;
  key: string; // Key combination (e.g., 'CommandOrControl+Shift+C')
}

/**
 * All hotkey settings
 */
export interface HotkeySettings {
  enabled: boolean; // Global enable/disable for all hotkeys
  focusWindow: HotkeyConfig;
  quickClip1: HotkeyConfig;
  quickClip2: HotkeyConfig;
  quickClip3: HotkeyConfig;
  quickClip4: HotkeyConfig;
  quickClip5: HotkeyConfig;
  quickLook: HotkeyConfig; // was openToolsLauncher; normalizeSettings migrates stored maps
  searchClips: HotkeyConfig;
}

/**
 * User settings and preferences
 */
export interface UserSettings {
  maxClips: number;
  startMinimized: boolean;
  autoStart: boolean;
  hotkey?: string; // Legacy hotkey - will be migrated to hotkeys
  hotkeys?: HotkeySettings;
  theme?: 'light' | 'dark' | 'system';
  codeDetectionEnabled?: boolean;
  windowTransparency?: number; // 0-100, 0 = fully opaque, 100 = fully transparent
  transparencyEnabled?: boolean;
  opaqueWhenFocused?: boolean;
  alwaysOnTop?: boolean;
  rememberWindowPosition?: boolean;
  showNotifications?: boolean;
  automaticUpdates?: boolean;
  toolsSampleText?: string; // settings Tools tab sample; absent means "use the newest clip"
}

/**
 * Complete application data structure
 */
export interface AppData {
  clips: StoredClip[];
  settings: UserSettings;
  templates: Template[];
  searchTerms: SearchTerm[];
  quickTools: QuickTool[];
  groupColours?: GroupColours;
  version: string;
}

/**
 * Capture group name to colour bucket slot (0 to 11). Never a hex value.
 */
export type GroupColours = Record<string, number>;

/**
 * Domain-specific storage for templates, search terms, quick tools and group colours
 */
export interface TemplatesData {
  templates: Template[];
  searchTerms: SearchTerm[];
  quickTools: QuickTool[];
  groupColours?: GroupColours;
}

/**
 * Storage metadata tracked in unencrypted meta.json
 */
export interface StorageMeta {
  version: string;
  storageVersion: number;
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
 * Search term for extracting data from clipboard content
 */
export interface SearchTerm {
  id: string; // UUID
  name: string;
  pattern: string; // Regular expression with named capture groups
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  order: number;
}

/**
 * Tool for opening web resources with extracted data
 */
export interface QuickTool {
  id: string; // UUID
  name: string;
  url: string; // URL template with {captureGroupName} tokens
  captureGroups: string[]; // Which capture groups this tool can use
  createdAt: number;
  updatedAt: number;
  order: number;
}

/**
 * Quick Clips configuration export/import format.
 * Version 2.0.0 adds groupColours; a version 1 file imports with none.
 */
export interface QuickClipsConfig {
  searchTerms: SearchTerm[];
  tools: QuickTool[];
  templates?: Template[];
  groupColours?: GroupColours;
  version: string;
}

/**
 * How an imported Quick Clips config meets the existing one.
 * merge keeps existing colours and adds missing ones; replace takes the file's map.
 */
export type QuickClipsImportMode = 'merge' | 'replace';

/**
 * One occurrence of a capture group value in a clip, with its position in the scanned text
 */
export interface Match {
  group: string;
  value: string;
  start: number;
  end: number;
  termId: string;
}

/**
 * Result of scanning one text with the enabled search terms
 */
export interface ScanResult {
  matches: Match[]; // sorted by start
  groups: string[]; // in order of first appearance
  errors: { termId: string; message: string }[]; // patterns that did not compile, skipped
  large: boolean; // text is above the on-demand scan threshold
}

/**
 * Auto-updater state held by the main process and pushed to every window
 */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'upToDate'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  version?: string;
  progress?: number; // 0 to 100 while downloading
  message?: string; // set when status is error
}

/**
 * What the main process answers to settings-changed. ok means the write landed and every
 * enabled shortcut registered. failed lists the accelerators the OS refused, so the
 * Hotkeys tab can say "not saved" on the right row. message says why ok is false when
 * no accelerator failed: the write itself, or the OS refusing the login item.
 */
export interface SettingsApplyResult {
  ok: boolean;
  failed: string[];
  message?: string;
}

/**
 * Folders the About panel can open
 */
export type AppPathName = 'data' | 'logs';
