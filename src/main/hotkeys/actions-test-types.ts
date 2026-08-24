import type { Mock } from 'vitest';

export interface MockWindow {
  focus: Mock;
  isDestroyed: Mock;
  isMinimized: Mock;
  restore: Mock;
  show: Mock;
  webContents: { send: Mock };
}
