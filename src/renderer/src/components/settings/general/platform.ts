const PLATFORM_NAMES: Record<string, string> = {
  linux: 'Linux',
  win32: 'Windows',
  darwin: 'macOS',
};

export function platformLine(platform: string, arch: string): string {
  return `${PLATFORM_NAMES[platform] ?? platform} ${arch}`;
}
