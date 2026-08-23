import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.api for renderer tests
const createMockApi = () => ({
  platform: 'win32' as NodeJS.Platform,
  storageGetSettings: vi.fn().mockResolvedValue({
    maxClips: 100,
    startMinimized: false,
    autoStart: false,
    theme: 'system',
    windowTransparency: 0,
    transparencyEnabled: false,
    opaqueWhenFocused: true,
    alwaysOnTop: false,
    rememberWindowPosition: true,
    showNotifications: false,
    codeDetectionEnabled: true,
  }),
  storageSaveSettings: vi.fn().mockResolvedValue(undefined),
  getAutoStartState: vi.fn().mockResolvedValue(null),
  onSettingsUpdated: vi.fn().mockReturnValue(() => {}),
  quickClipsScanText: vi.fn().mockResolvedValue([]),
  onToggleSearch: vi.fn().mockReturnValue(() => {}),
  getUpdateState: vi.fn().mockResolvedValue({ status: 'idle' }),
  onUpdateState: vi.fn().mockReturnValue(() => {}),
  checkForUpdates: vi.fn().mockResolvedValue(null),
  downloadUpdate: vi.fn().mockResolvedValue(null),
  quitAndInstall: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(window, 'api', {
  value: createMockApi(),
  writable: true,
});
