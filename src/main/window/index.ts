import { loadWindowBounds } from './bounds.js';
import { createWindow } from './creation.js';

// Re-export all window functionality
export * from './bounds';
export * from './settings';
export * from './creation';

// Main initialization function for window system
export async function initializeWindowSystem(): Promise<void> {
  // Load window bounds first
  await loadWindowBounds();
  
  // Create the main window
  await createWindow();
}
