import { ElectronAPI } from '@electron-toolkit/preload';
import type {
  AppPathName,
  GroupColours,
  HotkeySettings,
  QuickClipsConfig,
  QuickClipsImportMode,
  QuickTool,
  SearchTerm,
  Template,
  UpdateState,
  SettingsApplyResult,
  StorageStats,
  UserSettings,
} from '../shared/types';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      platform: NodeJS.Platform;
      arch: string;
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
      settingsChanged: (settings: UserSettings) => Promise<SettingsApplyResult>;
      restartApp: () => Promise<void>;
      openAppPath: (name: AppPathName) => Promise<string>;
      onSettingsUpdated: (callback: (settings: UserSettings) => void) => () => void;
      hotkeysGetDefaults: () => Promise<HotkeySettings>;
      // Storage APIs
      onStorageReady: (callback: () => void) => () => void;
      storageGetClips: () => Promise<any[]>;
      storageSaveClips: (clips: any[], lockedIndices: Record<number, boolean>) => Promise<boolean>;
      storageGetSettings: () => Promise<UserSettings>;
      storageSaveSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
      storageGetStats: () => Promise<StorageStats>;
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
      onToggleSearch: (callback: () => void) => () => void;
      onOpenQuickLook: (callback: (payload: { pending: boolean }) => void) => () => void;
    };
  }
}
