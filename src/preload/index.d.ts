import { ElectronAPI } from '@electron-toolkit/preload';
import type {
  GroupColours,
  HotkeySettings,
  QuickClipsConfig,
  QuickClipsImportMode,
  QuickTool,
  SearchTerm,
  Template,
  UpdateState,
} from '../shared/types';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      platform: NodeJS.Platform;
      checkForUpdates: () => Promise<any>;
      downloadUpdate: () => Promise<any>;
      quitAndInstall: () => Promise<void>;
      getUpdateState: () => Promise<UpdateState>;
      onUpdateState: (callback: (state: UpdateState) => void) => () => void;
      getCurrentClipboardData: () => Promise<{ type: string; content: string } | null>;
      setClipboardText: (text: string) => Promise<void>;
      setClipboardHTML: (html: string) => Promise<void>;
      setClipboardRTF: (rtf: string) => Promise<void>;
      getFullImage: (imageId: string) => Promise<string | null>;
      htmlSanitize: (html: string) => Promise<{ html: string; removed: Record<string, number> }>;
      setClipboardImage: (imageData: string) => Promise<void>;
      setClipboardBookmark: (bookmarkData: any) => Promise<void>;
      startClipboardMonitoring: () => Promise<boolean>;
      stopClipboardMonitoring: () => Promise<boolean>;
      onClipboardChanged: (
        callback: (clipData: { type: string; content: string; text?: string }) => void
      ) => () => void;
      onHotkeyClipCopied: (callback: (clipIndex: number) => void) => () => void;
      openSettings: (tab?: string) => Promise<void>;
      getAutoStartState: () => Promise<boolean | null>;
      settingsChanged: (settings: any) => Promise<boolean>;
      onSettingsUpdated: (callback: (settings: any) => void) => () => void;
      hotkeysGetDefaults: () => Promise<HotkeySettings>;
      // Storage APIs
      onStorageReady: (callback: () => void) => () => void;
      storageGetClips: () => Promise<any[]>;
      storageSaveClips: (clips: any[], lockedIndices: Record<number, boolean>) => Promise<boolean>;
      storageGetSettings: () => Promise<any>;
      storageSaveSettings: (settings: any) => Promise<boolean>;
      storageGetStats: () => Promise<{ clipCount: number; lockedCount: number; dataSize: number }>;
      storageExportData: () => Promise<string>;
      storageImportData: (jsonData: string) => Promise<boolean>;
      storageClearAll: () => Promise<boolean>;
      // Template APIs
      templatesGetAll: () => Promise<Template[]>;
      templatesCreate: (name: string, content: string) => Promise<any>;
      templatesUpdate: (id: string, updates: any) => Promise<any>;
      templatesDelete: (id: string) => Promise<void>;
      templatesReorder: (templates: any[]) => Promise<void>;
      // Quick Clips - Search Terms APIs
      searchTermsGetAll: () => Promise<SearchTerm[]>;
      searchTermsCreate: (name: string, pattern: string) => Promise<any>;
      searchTermsUpdate: (id: string, updates: any) => Promise<any>;
      searchTermsDelete: (id: string) => Promise<void>;
      // Quick Clips - Tools APIs
      quickToolsGetAll: () => Promise<QuickTool[]>;
      quickToolsCreate: (name: string, url: string, captureGroups: string[]) => Promise<any>;
      quickToolsUpdate: (id: string, updates: any) => Promise<any>;
      quickToolsDelete: (id: string) => Promise<void>;
      // Quick Clips - Scanning APIs
      quickClipsScanText: (text: string) => Promise<any[]>;
      openExternalUrls: (urls: string[]) => Promise<number>;
      quickClipsExportConfig: () => Promise<QuickClipsConfig>;
      quickClipsImportConfig: (
        config: QuickClipsConfig,
        mode?: QuickClipsImportMode
      ) => Promise<void>;
      onQuickClipsConfigChanged: (callback: () => void) => () => void;
      // Group colours
      groupColoursGet: () => Promise<GroupColours>;
      groupColoursSet: (groupColours: GroupColours) => Promise<GroupColours>;
      // Tools Launcher Window APIs
      openToolsLauncher: (clipContent: string) => Promise<void>;
      closeToolsLauncher: () => Promise<void>;
      toolsLauncherReady: () => Promise<void>;
      onToolsLauncherInitialize: (callback: (clipContent: string) => void) => () => void;
      onToggleSearch: (callback: () => void) => () => void;
      onOpenQuickLook: (callback: (payload: { pending: boolean }) => void) => () => void;
      removeAllListeners?: (channel: string) => void;
    };
  }
}
