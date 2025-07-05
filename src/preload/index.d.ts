import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      checkForUpdates: () => Promise<any>
      downloadUpdate: () => Promise<any>
      quitAndInstall: () => Promise<void>
      getClipboardText: () => Promise<string>
      getClipboardHTML: () => Promise<string>
      getClipboardRTF: () => Promise<string>
      getClipboardImage: () => Promise<string | null>
      getClipboardBookmark: () => Promise<{ title: string; url: string } | null>
      getCurrentClipboardData: () => Promise<{ type: string; content: string } | null>
      setClipboardText: (text: string) => Promise<void>
      setClipboardHTML: (html: string) => Promise<void>
      setClipboardRTF: (rtf: string) => Promise<void>
      setClipboardImage: (imageData: string) => Promise<void>
      setClipboardBookmark: (bookmarkData: any) => Promise<void>
      startClipboardMonitoring: () => Promise<boolean>
      stopClipboardMonitoring: () => Promise<boolean>
      onClipboardChanged: (callback: (clipData: { type: string; content: string }) => void) => void
      removeClipboardListeners: () => void
    }
  }
}
