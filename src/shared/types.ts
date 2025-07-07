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
  searchTerms: SearchTerm[];
  quickTools: QuickTool[];
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
 * Result of pattern matching on clipboard content
 */
export interface PatternMatch {
  searchTermId: string;
  searchTermName: string;
  captures: Record<string, string>; // capture group name -> extracted value
}

/**
 * Quick Clips configuration export/import format
 */
export interface QuickClipsConfig {
  searchTerms: SearchTerm[];
  tools: QuickTool[];
  version: string;
}

/**
 * Search term management operations
 */
export interface SearchTermOperations {
  create: (name: string, pattern: string) => Promise<SearchTerm>;
  update: (id: string, updates: Partial<SearchTerm>) => Promise<SearchTerm>;
  delete: (id: string) => Promise<void>;
  reorder: (searchTerms: SearchTerm[]) => Promise<void>;
  getAll: () => Promise<SearchTerm[]>;
  test: (pattern: string, testText: string) => Promise<PatternMatch[]>;
}

/**
 * Quick tool management operations
 */
export interface QuickToolOperations {
  create: (name: string, url: string, captureGroups: string[]) => Promise<QuickTool>;
  update: (id: string, updates: Partial<QuickTool>) => Promise<QuickTool>;
  delete: (id: string) => Promise<void>;
  reorder: (tools: QuickTool[]) => Promise<void>;
  getAll: () => Promise<QuickTool[]>;
  validateUrl: (url: string, captureGroups: string[]) => Promise<{ isValid: boolean; errors: string[] }>;
}

/**
 * Quick Clips scanning operations
 */
export interface QuickClipsOperations {
  scanText: (text: string) => Promise<PatternMatch[]>;
  openTools: (matches: PatternMatch[], toolIds: string[]) => Promise<void>;
  exportConfig: () => Promise<QuickClipsConfig>;
  importConfig: (config: QuickClipsConfig) => Promise<void>;
}
