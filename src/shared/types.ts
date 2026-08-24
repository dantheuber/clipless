export type ClipType = 'text' | 'html' | 'image' | 'rtf' | 'bookmark';

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

export interface StoredClip {
  clip: ClipItem;
  isLocked: boolean;
  timestamp: number;
}

interface HotkeyConfig {
  enabled: boolean;
  key: string; // Key combination (e.g., 'CommandOrControl+Shift+C')
}

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

export interface UserSettings {
  maxClips: number;
  startMinimized: boolean;
  autoStart: boolean;
  hotkey?: string; // Legacy hotkey - will be migrated to hotkeys
  hotkeys?: HotkeySettings;
  theme?: 'light' | 'dark' | 'system';
  codeDetectionEnabled?: boolean;
  showLanguageLabel?: boolean; // row tag on code clips; only read while code detection is on
  windowTransparency?: number; // 0-100, 0 = fully opaque, 100 = fully transparent
  transparencyEnabled?: boolean;
  opaqueWhenFocused?: boolean;
  alwaysOnTop?: boolean;
  rememberWindowPosition?: boolean;
  showNotifications?: boolean;
  automaticUpdates?: boolean;
  toolsSampleText?: string; // settings Tools tab sample; absent means "use the newest clip"
}

export interface AppData {
  clips: StoredClip[];
  settings: UserSettings;
  templates: Template[];
  searchTerms: SearchTerm[];
  quickTools: QuickTool[];
  groupColours?: GroupColours;
  version: string;
}

export type GroupColours = Record<string, number>; // group name to colour slot index (0-11), never a hex

export interface TemplatesData {
  templates: Template[];
  searchTerms: SearchTerm[];
  quickTools: QuickTool[];
  groupColours?: GroupColours;
}

export interface StorageMeta {
  version: string;
  storageVersion: number;
}

export interface StorageStats {
  clipCount: number;
  lockedCount: number;
  dataSize: number;
}

export interface BookmarkData {
  text: string;
  html: string;
  title?: string;
  url?: string;
}

export interface Template {
  id: string; // UUID
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface SearchTerm {
  id: string; // UUID
  name: string;
  pattern: string; // Regular expression with named capture groups
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface QuickTool {
  id: string; // UUID
  name: string;
  url: string; // URL template with {captureGroupName} tokens
  captureGroups: string[]; // Which capture groups this tool can use
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface QuickClipsConfig {
  searchTerms: SearchTerm[];
  tools: QuickTool[];
  templates?: Template[];
  groupColours?: GroupColours; // added in config version 2.0.0; a version 1 file imports with none
  version: string;
}

export type QuickClipsImportMode = 'merge' | 'replace'; // merge keeps existing colours, adds missing; replace takes the file's map

export interface Match {
  group: string;
  value: string;
  start: number;
  end: number;
  termId: string;
}

export interface ScanResult {
  matches: Match[]; // sorted by start
  groups: string[]; // in order of first appearance
  errors: { termId: string; message: string }[]; // patterns that did not compile, skipped
  large: boolean; // text is above the on-demand scan threshold
}

type UpdateStatus =
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

export interface SettingsApplyResult {
  ok: boolean; // the write landed and every enabled shortcut registered
  failed: string[]; // accelerators the OS refused, so the Hotkeys tab can flag the right row
  message?: string; // why ok is false when no accelerator failed: the write, or the login item
}

export type AppPathName = 'data' | 'logs';
