import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Runs the poll against the real `data` module (only Electron is mocked) so the image
 * fingerprint used by the poll cache and by the copy-back skip is the production one.
 */

type MockImage = Electron.NativeImage & { dataUrl: string };
const imagesByDataUrl = new Map<string, MockImage>();

vi.mock('electron', () => ({
  app: { getPath: vi.fn().mockReturnValue('/mock/userData') },
  BrowserWindow: vi.fn(),
  clipboard: {
    readText: vi.fn().mockReturnValue(''),
    readHTML: vi.fn().mockReturnValue(''),
    readRTF: vi.fn().mockReturnValue(''),
    readImage: vi.fn(),
    readBookmark: vi.fn().mockReturnValue({ title: '', url: '' }),
  },
  nativeImage: {
    createFromDataURL: vi.fn((dataUrl: string) => imagesByDataUrl.get(dataUrl) ?? emptyImage()),
  },
}));

vi.mock('../storage/image-store', () => ({
  saveImage: vi.fn().mockResolvedValue('data:image/png;base64,thumb'),
}));

vi.mock('../storage/search-terms', () => ({
  generateId: vi.fn(() => `id-${imagesByDataUrl.size}-${Math.random()}`),
}));

import { clipboard } from 'electron';
import { saveImage } from '../storage/image-store';
import { clearImageCache } from './data';
import {
  initializeClipboardMonitoring,
  checkClipboard,
  setSkipNextImageChange,
  stopClipboardMonitoring,
} from './monitoring';

function emptyImage(): MockImage {
  return {
    dataUrl: '',
    isEmpty: () => true,
    toDataURL: () => '',
    getSize: () => ({ width: 0, height: 0 }),
    toBitmap: () => Buffer.alloc(0),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/** A 64x64 BGRA image whose top-left 16 pixels (64 bytes) are `corner`, the rest `fill`. */
function screenshot(dataUrl: string, fill: number, corner = 0x7f): MockImage {
  const bitmap = Buffer.alloc(64 * 64 * 4, fill);
  bitmap.fill(corner, 0, 64);
  const image = {
    dataUrl,
    isEmpty: () => false,
    toDataURL: vi.fn(() => dataUrl),
    getSize: () => ({ width: 64, height: 64 }),
    toBitmap: () => Buffer.from(bitmap),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as MockImage;
  imagesByDataUrl.set(dataUrl, image);
  return image;
}

function putImage(image: MockImage): void {
  vi.mocked(clipboard.readText).mockReturnValue('');
  vi.mocked(clipboard.readImage).mockReturnValue(image);
}

function putText(text: string): void {
  vi.mocked(clipboard.readText).mockReturnValue(text);
  vi.mocked(clipboard.readImage).mockReturnValue(emptyImage());
}

function savedDataUrls(): string[] {
  return vi.mocked(saveImage).mock.calls.map(([, dataUrl]) => dataUrl);
}

describe('clipboard poll with the real image fingerprint', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = { isDestroyed: () => false, webContents: { send: vi.fn() } } as any;
  const shot1 = () => screenshot('data:image/png;base64,shot1', 0x01);
  const shot2 = () => screenshot('data:image/png;base64,shot2', 0x02);

  beforeEach(() => {
    vi.clearAllMocks();
    imagesByDataUrl.clear();
    clearImageCache();
    putText('baseline');
    initializeClipboardMonitoring(win);
  });

  afterEach(() => {
    stopClipboardMonitoring();
  });

  it('captures two same-size screenshots that share a corner, taken back to back', async () => {
    putImage(shot1());
    await expect(checkClipboard(win)).resolves.toBe(true);
    putImage(shot2());
    await expect(checkClipboard(win)).resolves.toBe(true);

    expect(savedDataUrls()).toEqual(['data:image/png;base64,shot1', 'data:image/png;base64,shot2']);
  });

  it('saves the second screenshot, not the first, when text was copied in between', async () => {
    putImage(shot1());
    await checkClipboard(win);
    putText('some text');
    await expect(checkClipboard(win)).resolves.toBe(true);
    putImage(shot2());
    await expect(checkClipboard(win)).resolves.toBe(true);

    expect(savedDataUrls()).toEqual(['data:image/png;base64,shot1', 'data:image/png;base64,shot2']);
  });

  it('does not let the copy-back skip swallow a different same-size screenshot', async () => {
    const first = shot1();
    putImage(first);
    await checkClipboard(win);

    // The app copies the first screenshot back, but a new one lands on the clipboard
    // before the next poll
    setSkipNextImageChange(first.dataUrl);
    putImage(shot2());
    await expect(checkClipboard(win)).resolves.toBe(true);

    expect(savedDataUrls()).toEqual(['data:image/png;base64,shot1', 'data:image/png;base64,shot2']);
  });

  it('still skips the copy-back of the image itself and caches its data URL', async () => {
    const first = shot1();
    putImage(first);
    await checkClipboard(win);
    putText('between');
    await checkClipboard(win);

    // The copy-back is read as a re-encoded PNG whose pixels match the stored image
    const reencoded = screenshot('data:image/png;base64,shot1-reencoded', 0x01);
    setSkipNextImageChange(first.dataUrl);
    putImage(reencoded);
    await expect(checkClipboard(win)).resolves.toBe(false);
    expect(savedDataUrls()).toEqual(['data:image/png;base64,shot1']);

    // The same pixels stay on the clipboard: later polls see no change and reuse the cached
    // data URL instead of re-running toDataURL
    await expect(checkClipboard(win)).resolves.toBe(false);
    await expect(checkClipboard(win)).resolves.toBe(false);
    expect(savedDataUrls()).toEqual(['data:image/png;base64,shot1']);
    expect(
      vi.mocked(first.toDataURL).mock.calls.length +
        vi.mocked(reencoded.toDataURL).mock.calls.length
    ).toBe(1);
  });
});
