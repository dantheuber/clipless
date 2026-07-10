---
type: system
title: Global Hotkeys
tags:
  - hotkeys
  - main-process
timestamp: 2026-07-10T01:02:38.332Z
---

Global hotkeys (`src/main/hotkeys/`) use Electron's `globalShortcut` and work even when Clipless is minimized. The module uses a registry/actions/manager pattern:

- `registry.ts` -- `HotkeyRegistry`: low-level register/unregister against `globalShortcut`, tracks what is currently bound
- `actions.ts` -- `HotkeyActions`: the handlers (focus window, copy clip N back to clipboard with correct format conversion)
- `manager.ts` -- `HotkeyManager`: coordinator; handles initialization, settings changes, and orchestrates registration
- `index.ts` -- exports the singleton `hotkeyManager`

Defaults (verified in `src/main/storage/defaults.ts`): the hotkey system is **globally DISABLED by default** (`enabled: false` master toggle). Individual bindings, all `CommandOrControl+Shift+...`: `+V` focus window, `+1` through `+5` copy the five most recent clips, `+T` open [Tools Launcher](/systems/tools-launcher.md), `+F` focus clip search. All user-configurable in Settings -> Hotkeys and persisted via [Secure Storage](/systems/secure-storage.md).

The registry/actions/manager split is the house pattern for main-process modules: separate low-level OS binding from action logic from coordination, exposing a singleton with a stable public API. `hotkeyManager.cleanup()` runs on `before-quit`.
