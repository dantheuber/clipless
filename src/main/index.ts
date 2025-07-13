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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
