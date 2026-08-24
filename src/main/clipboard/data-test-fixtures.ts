export function createMockImage(
  empty: boolean,
  dataUrl = '',
  width = 0,
  height = 0
): Electron.NativeImage {
  return {
    isEmpty: () => empty,
    toDataURL: () => dataUrl,
    getSize: () => ({ width, height }),
    toBitmap: () => Buffer.from('mock-bitmap-data-for-testing'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}
