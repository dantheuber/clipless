import { app } from 'electron';
import { initializeApp, setupAppEvents, initializeServices } from './app';

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize the main application
  await initializeApp();

  // Setup app event handlers
  setupAppEvents();

  // Initialize services (IPC, updater, etc.)
  initializeServices();
});
