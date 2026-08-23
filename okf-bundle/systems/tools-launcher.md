---
type: system
title: Tools Launcher (removed)
tags:
  - quick-tools
  - launcher
  - window
  - history
timestamp: 2026-08-23T07:14:26.635Z
status: deprecated
---

The Tools Launcher window no longer exists. Step 4 of `docs/specs/implementation-plan.md` deleted it on 2026-08-23 (branch `t3code/quick-look-step-4`): `tools-launcher.html`, `tools-launcher-main.tsx`, `ToolsLauncher.tsx`, `QuickClipsScanner.tsx` with its CSS and selection helpers, `assets/base.css`, the `tools-launcher` build input, `createToolsLauncherWindow` and `getToolsLauncherWindow` in `src/main/window/creation.ts`, the `open-tools-launcher`, `close-tools-launcher` and `tools-launcher-ready` IPC handlers, the preload methods `openToolsLauncher`, `closeToolsLauncher`, `toolsLauncherReady`, `onToolsLauncherInitialize` and `removeAllListeners`, the `PatternMatch` type and the `faWrench` icon. The app has two renderer entry points, `main.tsx` and `settings-main.tsx`.

What replaced it, all inside the main window:

- Chips on every row for each enabled search term match, coloured by capture group, and the pin tray that fans pinned values out to compatible quick tools with Open all. See [Quick Clips](quick-clips.md) and the [quick look decision](../decisions/tools-launcher-window-replaced-by-quick-look-and-pin-tray.md).
- Quick look, the reader, opened by the row's eye, the status bar button, the context menu or the `quickLook` hotkey (the same default accelerator the launcher had; the settings migration renames the stored `openToolsLauncher` key, see [hotkeys](hotkeys.md)).
- Template pills in the status bar and the reader for [templates](templates.md).

What the launcher used to do, for reading old decisions: a separate 1000 x 700 window that scanned one clip against the search terms, listed the captures on the left and the compatible tools on the right, and opened every selected value in every selected tool through `shell.openExternal`. Tool URL generation (`src/shared/tools.ts`) and the config export and import (`src/main/clipboard/quick-clips-config.ts`) survive it.
