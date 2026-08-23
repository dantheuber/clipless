---
type: decision
title: Non-Blocking Startup
tags:
  - startup
  - performance
  - storage
generated:
  by: human:dantheuber
  at: 2026-07-10T01:02:26.053Z
---

Decision: the window must appear immediately at launch; encrypted storage loads in the background. Verified in `src/main/app/index.ts` and `src/main/storage/index.ts`.

How it works:

1. `initializeApp` creates the window system FIRST (`initializeWindowSystem`), then kicks off `storage.initialize()` without awaiting the data load.
2. `window-bounds.json` is deliberately UNENCRYPTED so window position/size restore without waiting for `safeStorage`.
3. `SecureStorage.initialize()` returns immediately with default in-memory data (`isInitialized = true`) and runs `loadDataInBackground()` (which also performs any [legacy migration](../decisions/domain-split-storage.md)).
4. When background load completes, the `onBackgroundLoadComplete` callback: re-applies window settings (transparency, always-on-top), sends the `storage-ready` IPC event so the renderer re-fetches real data, reconciles the OS login-item state with the persisted autoStart setting, and only THEN runs the automatic update check (`runAutomaticUpdateCheck`, errors swallowed so unsigned macOS builds never surface failures).

Gotcha for anyone touching startup: code running between window creation and `storage-ready` sees DEFAULT settings, not the user's real ones. Anything that depends on real settings must wait for the ready event (renderer: `window.api.onStorageReady`).

Related: the app holds a single-instance lock; a second launch focuses/restores the existing window via the `second-instance` event.
