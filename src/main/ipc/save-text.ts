import { BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';

function isBareFileName(name: string): boolean {
  return (
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\') &&
    path.basename(name) === name
  );
}

export function setupTextExportIPC(): void {
  ipcMain.handle(
    'save-text-file',
    async (event, name: string, text: string): Promise<string | null> => {
      if (typeof name !== 'string' || !isBareFileName(name)) {
        throw new Error('Export file name must be a bare file name');
      }
      const parent = BrowserWindow.fromWebContents(event.sender);
      const options = {
        defaultPath: name,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      };
      const { canceled, filePath } = await (parent
        ? dialog.showSaveDialog(parent, options)
        : dialog.showSaveDialog(options));
      if (canceled || !filePath) return null;
      await fs.writeFile(filePath, text, 'utf8');
      return filePath;
    }
  );
}
