import { loadWindowBounds } from './bounds.js';
import { createWindow } from './creation.js';

export * from './bounds';
export * from './settings';
export * from './creation';

export async function initializeWindowSystem(): Promise<void> {
  await loadWindowBounds();

  await createWindow();
}
