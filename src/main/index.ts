import { app } from 'electron';
import { initializeApp, setupAppEvents, initializeServices } from './app';

// Enforce a single running instance. Acquiring the lock fails when another
// Clipless instance is already running (e.g. the user relaunches it, or
// autostart fires while it's already open). In that case quit immediately and
// let the existing instance surface its window via the 'second-instance'
// handler wired in setupAppEvents().
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
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
}
