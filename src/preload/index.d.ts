import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      checkForUpdates: () => Promise<any>;
      downloadUpdate: () => Promise<any>;
      quitAndInstall: () => Promise<void>;
      getClipboardText: () => Promise<string>;
      getClipboardHTML: () => Promise<string>;
      getClipboardRTF: () => Promise<string>;
      getClipboardImage: () => Promise<string | null>;
      getClipboardBookmark: () => Promise<{ title: string; url: string } | null>;
      getCurrentClipboardData: () => Promise<{ type: string; content: string } | null>;
      setClipboardText: (text: string) => Promise<void>;
      setClipboardHTML: (html: string) => Promise<void>;
      setClipboardRTF: (rtf: string) => Promise<void>;
      setClipboardImage: (imageData: string) => Promise<void>;
      setClipboardBookmark: (bookmarkData: any) => Promise<void>;
      notifyClipCopied: (index: number) => Promise<void>;
      startClipboardMonitoring: () => Promise<boolean>;
      stopClipboardMonitoring: () => Promise<boolean>;
      onClipboardChanged: (callback: (clipData: { type: string; content: string }) => void) => void;
      removeClipboardListeners: () => void;
      onHotkeyClipCopied: (callback: (clipIndex: number) => void) => void;
      removeHotkeyListeners: () => void;
      openSettings: (tab?: string) => Promise<void>;
      closeSettings: () => Promise<void>;
      getSettings: () => Promise<any>;
      settingsChanged: (settings: any) => Promise<boolean>;
      onSettingsUpdated: (callback: (settings: any) => void) => void;
      removeSettingsListeners: () => void;
      // Storage APIs
      storageGetClips: () => Promise<any[]>;
      storageSaveClips: (clips: any[], lockedIndices: Record<number, boolean>) => Promise<boolean>;
      storageGetSettings: () => Promise<any>;
      storageSaveSettings: (settings: any) => Promise<boolean>;
      storageGetStats: () => Promise<{ clipCount: number; lockedCount: number; dataSize: number }>;
      storageExportData: () => Promise<string>;
      storageImportData: (jsonData: string) => Promise<boolean>;
      storageClearAll: () => Promise<boolean>;
      // Template APIs
      templatesGetAll: () => Promise<any[]>;
      templatesCreate: (name: string, content: string) => Promise<any>;
      templatesUpdate: (id: string, updates: any) => Promise<any>;
      templatesDelete: (id: string) => Promise<void>;
      templatesReorder: (templates: any[]) => Promise<void>;
      templatesGenerateText: (
        templateId: string,
        clipContents: string[],
        captures?: Record<string, string>
      ) => Promise<string>;
      // Quick Clips - Search Terms APIs
      searchTermsGetAll: () => Promise<any[]>;
      searchTermsCreate: (name: string, pattern: string) => Promise<any>;
      searchTermsUpdate: (id: string, updates: any) => Promise<any>;
      searchTermsDelete: (id: string) => Promise<void>;
      searchTermsReorder: (searchTerms: any[]) => Promise<void>;
      searchTermsTest: (pattern: string, testText: string) => Promise<any[]>;
      // Quick Clips - Tools APIs
      quickToolsGetAll: () => Promise<any[]>;
      quickToolsCreate: (name: string, url: string, captureGroups: string[]) => Promise<any>;
      quickToolsUpdate: (id: string, updates: any) => Promise<any>;
      quickToolsDelete: (id: string) => Promise<void>;
      quickToolsReorder: (tools: any[]) => Promise<void>;
      quickToolsValidateUrl: (
        url: string,
        captureGroups: string[]
      ) => Promise<{ isValid: boolean; errors: string[] }>;
      // Quick Clips - Scanning APIs
      quickClipsScanText: (text: string) => Promise<any[]>;
      quickClipsOpenTools: (matches: any[], toolIds: string[]) => Promise<void>;
      quickClipsExportConfig: () => Promise<any>;
      quickClipsImportConfig: (config: any) => Promise<void>;
      // Tools Launcher Window APIs
      openToolsLauncher: (clipContent: string) => Promise<void>;
      closeToolsLauncher: () => Promise<void>;
      toolsLauncherReady: () => Promise<void>;
      onToolsLauncherInitialize: (callback: (clipContent: string) => void) => void;
      onToggleSearch: (callback: () => void) => void;
      removeToggleSearchListeners: () => void;
      removeAllListeners?: (channel: string) => void;
      // Native Context Menu APIs
      showClipContextMenu: (options: {
        index: number;
        isFirstClip: boolean;
        isLocked: boolean;
        hasPatterns: boolean;
      }) => Promise<void>;
      onContextMenuAction: (callback: (data: { action: string; index: number }) => void) => void;
      removeContextMenuListeners: () => void;
    };
  }
}
