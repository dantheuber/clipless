---
type: architecture
title: Three-Process Electron Architecture
tags:
  - electron
  - architecture
  - ipc
status: stable
generated:
  by: claude-code/fable-5
  at: 2026-08-23T16:44:19.633Z
verified:
  by: claude-code/fable-5
  at: 2026-08-23T14:00:00Z
---

Clipless uses the standard Electron three-process split, built with electron-vite:

- **Main process** (`src/main/`): system integration -- clipboard polling, [Secure Storage](../systems/secure-storage.md), [global hotkeys](../systems/hotkeys.md), window management (two windows: main and settings, with persisted bounds; the [Tools Launcher](../systems/tools-launcher.md) window was removed in 1.9.0), system tray, auto-updates via electron-updater, HTML and RTF text extraction and HTML sanitising at capture ([clipboard monitoring](../systems/clipboard-monitoring.md)), and small app services under `src/main/app/` (`app-restart`, `open-app-path`).
- **Preload** (`src/preload/`): a typed context bridge. ALL renderer-to-main communication goes through `window.api.*` methods defined here. IPC channels are organized by domain: clipboard, settings (`settings-changed` answers `{ ok, failed, message }`), storage, templates, search-terms, quick-tools, group-colours, `open-external-urls` (http and https only), `html-sanitize`, `update-state`.
- **Renderer** (`src/renderer/`): React 19 app with two entry points (`main.tsx`, `settings-main.tsx`) and matching HTML files. State lives in React Context providers ([Clips Provider](../systems/clips-provider.md), the scan index, theme, language detection). The settings window mounts the scan index and theme providers but not the clips provider.

Data flow for a copy: user copies -> main process detects via [250ms polling](../systems/clipboard-monitoring.md) -> reads clipboard (extracting text from HTML and RTF) -> emits `clipboard-changed` IPC event -> renderer updates state via ClipsProvider and scans the new clip in the renderer ([Quick Clips](../systems/quick-clips.md)) -> debounced save back to encrypted storage via IPC.

Shared TypeScript interfaces, constants and pure logic live in `src/shared/` and are imported by all three processes: the scanner (`scan.ts`), tool URL fan-out (`tools.ts`), the template engine (`templates.ts`), readiness wording, the built-in pattern library, the colour bucket and the OS-reserved shortcut list. Pure code is shared so both windows and the main process cannot disagree about a scan or a template; see [Quick look engineering calls](../decisions/quick-look-engineering-calls.md).
