/**
 * The full backup file the General footer exports and imports (spec 15.5): what it holds,
 * how it is named, and how sizes read.
 */

export interface BackupSummary {
  clips: number;
  locked: number;
  settings: boolean;
  shortcuts: number;
  terms: number;
  tools: number;
  templates: number;
}

const count = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

/**
 * What a backup holds, or the reason it cannot be read.
 */
export function summarizeBackup(text: string): { summary: BackupSummary } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'Not a JSON file.' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'Not a Clipless backup: expected an object with clips and settings.' };
  }
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.clips) && !record.settings) {
    return { error: 'Not a Clipless backup: it has neither clips nor settings.' };
  }
  const clips = Array.isArray(record.clips) ? record.clips : [];
  const settings =
    record.settings && typeof record.settings === 'object'
      ? (record.settings as Record<string, unknown>)
      : null;
  const hotkeys =
    settings?.hotkeys && typeof settings.hotkeys === 'object'
      ? (settings.hotkeys as Record<string, unknown>)
      : null;
  return {
    summary: {
      clips: clips.length,
      locked: clips.filter((c) => (c as { isLocked?: boolean })?.isLocked === true).length,
      settings: settings !== null,
      shortcuts: hotkeys ? Object.keys(hotkeys).filter((k) => k !== 'enabled').length : 0,
      terms: count(record.searchTerms),
      tools: count(record.quickTools),
      templates: count(record.templates),
    },
  };
}

/**
 * The text of a picked file. Blob.text is missing in some embedders, so fall back to a
 * FileReader.
 */
export function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('could not read the file'));
    reader.readAsText(file);
  });
}

export function backupFileName(date: Date): string {
  return `clipless-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Save text as a file through the browser's download path. Returns its byte size.
 */
export function downloadText(name: string, text: string, type = 'application/json'): number {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return blob.size;
}
