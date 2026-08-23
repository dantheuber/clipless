---
type: architecture
title: Three-Process Electron Architecture
tags:
  - electron
  - architecture
  - ipc
timestamp: 2026-07-10T00:53:06.398Z
---

Clipless uses the standard Electron three-process split, built with electron-vite:

- **Main process** (`src/main/`): system integration -- clipboard polling, [Secure Storage](/systems/secure-storage.md), [global hotkeys](/systems/hotkeys.md), window management (three window types: main, settings, tools launcher, with persisted bounds), system tray, and auto-updates via electron-updater.
- **Preload** (`src/preload/`): a typed context bridge. ALL renderer-to-main communication goes through `window.api.*` methods defined here. IPC channels are organized by domain: clipboard, settings, storage, templates, search-terms, quick-tools.
- **Renderer** (`src/renderer/`): React 19 app with two entry points (`main.tsx`, `settings-main.tsx`) and matching HTML files. State lives in React Context providers ([Clips Provider](/systems/clips-provider.md), theme, language detection).

Data flow for a copy: user copies -> main process detects via [250ms polling](/systems/clipboard-monitoring.md) -> reads clipboard -> emits `clipboard-changed` IPC event -> renderer updates state via ClipsProvider -> debounced save back to encrypted storage via IPC.

Shared TypeScript interfaces and constants live in `src/shared/` and are imported by all three processes.
