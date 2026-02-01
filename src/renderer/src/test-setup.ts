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
  onSettingsUpdated: vi.fn().mockReturnValue(() => {}),
  removeSettingsListeners: vi.fn(),
  quickClipsScanText: vi.fn().mockResolvedValue([]),
  onToggleSearch: vi.fn(),
  removeToggleSearchListeners: vi.fn(),
});

Object.defineProperty(window, 'api', {
  value: createMockApi(),
  writable: true,
});
