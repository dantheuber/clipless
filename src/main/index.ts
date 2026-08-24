import './dev-profile'; // must stay first: redirects userData for dev builds before any other module captures a path derived from it

import { app } from 'electron';
import { initializeApp, setupAppEvents, initializeServices } from './app';

if (!app.requestSingleInstanceLock()) {
  app.quit(); // another instance is already running; it surfaces its window via the 'second-instance' handler in setupAppEvents()
} else {
  app.whenReady().then(async () => {
    await initializeApp();

    setupAppEvents();

    initializeServices();
  });
}
