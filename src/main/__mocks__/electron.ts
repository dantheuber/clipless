import { vi } from 'vitest';

export const clipboard = {
  readText: vi.fn().mockReturnValue(''),
  readHTML: vi.fn().mockReturnValue(''),
  readRTF: vi.fn().mockReturnValue(''),
  readImage: vi.fn().mockReturnValue({ isEmpty: () => true, toDataURL: () => '' }),
  readBookmark: vi.fn().mockReturnValue({ title: '', url: '' }),
  writeText: vi.fn(),
  writeHTML: vi.fn(),
  writeRTF: vi.fn(),
  writeImage: vi.fn(),
  writeBookmark: vi.fn(),
  write: vi.fn(),
};

export const safeStorage = {
  isEncryptionAvailable: vi.fn().mockReturnValue(true),
  encryptString: vi.fn((str: string) => Buffer.from(str)),
  decryptString: vi.fn((buf: Buffer) => buf.toString()),
};

export const globalShortcut = {
  register: vi.fn().mockReturnValue(true),
  unregister: vi.fn(),
  unregisterAll: vi.fn(),
  isRegistered: vi.fn().mockReturnValue(false),
};

export const nativeImage = {
  createFromDataURL: vi.fn().mockReturnValue({
    isEmpty: () => false,
    toDataURL: () => 'data:image/png;base64,test',
    getSize: () => ({ width: 100, height: 100 }),
  }),
};

export const BrowserWindow = vi.fn().mockImplementation(() => ({
  isVisible: vi.fn().mockReturnValue(true),
  isFocused: vi.fn().mockReturnValue(false),
  isMinimized: vi.fn().mockReturnValue(false),
  isDestroyed: vi.fn().mockReturnValue(false),
  show: vi.fn(),
  hide: vi.fn(),
  focus: vi.fn(),
  restore: vi.fn(),
  webContents: {
    send: vi.fn(),
  },
}));

export const shell = {
  openExternal: vi.fn().mockResolvedValue(undefined),
};

export const app = {
  getPath: vi.fn().mockReturnValue('/mock/path'),
  focus: vi.fn(),
};
