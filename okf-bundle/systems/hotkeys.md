---
type: system
title: Global Hotkeys
tags:
  - hotkeys
  - main-process
timestamp: 2026-08-23T02:07:09.311Z
---

Global hotkeys (`src/main/hotkeys/`) use Electron's `globalShortcut` and work even when Clipless is minimized. The module uses a registry/actions/manager pattern:

- `registry.ts` -- `HotkeyRegistry`: low-level register/unregister against `globalShortcut`, tracks what is currently bound
- `actions.ts` -- `HotkeyActions`: the handlers (focus window, copy clip N back to clipboard with correct format conversion, quick look)
- `manager.ts` -- `HotkeyManager`: coordinator; handles initialization, settings changes, and orchestrates registration
- `index.ts` -- exports the singleton `hotkeyManager`

Defaults (verified in `src/main/storage/defaults.ts`): the hotkey system is **globally DISABLED by default** (`enabled: false` master toggle). Individual bindings, all `CommandOrControl+Shift+...`: `+V` focus window, `+1` through `+5` copy the five most recent clips, `+T` quick look on the newest clip (`quickLook`), `+F` focus clip search. All user-configurable in Settings -> Hotkeys and persisted via [Secure Storage](/systems/secure-storage.md). `DEFAULT_HOTKEY_SETTINGS` is the one copy; the settings window reads it over the `hotkeys-get-defaults` IPC.

**Rename and migration (step 1 of the quick look plan, 2026-08-23).** The action `openToolsLauncher` became `quickLook`. Until step 2 lands its body still opens the [Tools Launcher](/systems/tools-launcher.md) window. A stored `hotkeys.openToolsLauncher` is moved to `quickLook` by `normalizeHotkeys` in `src/main/storage/settings.ts`, which every settings read passes through; it also deep-merges each action with its default so a map saved by an older build that lacks an action no longer throws in the manager. It is a no-op once applied; `storage.getSettings` persists the result only when it differs from what was stored. There is no other settings schema version; `meta.json` carries `storageVersion: 2` (nothing branches on it yet).

The registry/actions/manager split is the house pattern for main-process modules: separate low-level OS binding from action logic from coordination, exposing a singleton with a stable public API. `hotkeyManager.cleanup()` runs on `before-quit`.

The OS-reserved combinations the recorder warns about (spec 15.6) are a hand-maintained per-platform list in `src/shared/osReservedShortcuts.ts`.
