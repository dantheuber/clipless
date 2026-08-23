---
type: system
title: Global Hotkeys
tags:
  - hotkeys
  - main-process
timestamp: 2026-08-23T05:47:02.151Z
---

Global hotkeys (`src/main/hotkeys/`) use Electron's `globalShortcut` and work even when Clipless is minimized. The module uses a registry/actions/manager pattern:

- `registry.ts` -- `HotkeyRegistry`: low-level register/unregister against `globalShortcut`, tracks what is currently bound
- `actions.ts` -- `HotkeyActions`: the handlers (focus window, copy clip N back to clipboard with correct format conversion, quick look)
- `manager.ts` -- `HotkeyManager`: coordinator; handles initialization, settings changes, and orchestrates registration
- `index.ts` -- exports the singleton `hotkeyManager`

Defaults (verified in `src/main/storage/defaults.ts`): the hotkey system is **globally DISABLED by default** (`enabled: false` master toggle). Individual bindings, all `CommandOrControl+Shift+...`: `+V` focus window, `+1` through `+5` copy the five most recent clips, `+T` quick look on the newest clip (`quickLook`), `+F` focus clip search. All user-configurable in Settings -> Hotkeys and persisted via [Secure Storage](/systems/secure-storage.md). `DEFAULT_HOTKEY_SETTINGS` is the one copy; the settings window reads it over the `hotkeys-get-defaults` IPC.

**Registration results (step 3 of the quick look plan, 2026-08-22).** `registerHotkeys()` and `onSettingsChanged()` return `{ ok, failed: string[] }`, the accelerators `globalShortcut` refused (a second row on the same accelerator is refused by the registry, so only one fires). The `settings-changed` IPC passes that on as `SettingsApplyResult` so the settings Hotkeys tab can say "not saved, retry" on the right row; the renderer rolls a refused change back by re-sending the previous map. Registration is still unregister-all then register-all from the stored settings; the old binding is therefore unregistered for the few milliseconds between a refused new key and the rollback write.

**The settings tab (spec 15.6).** A table with the keycaps as the recorder (`components/settings/hotkeys/`): `display.ts` turns an accelerator into Ctrl/Alt/Shift or Cmd/Opt/Shift and never shows the raw string; `recording.ts` builds the accelerator from key events (letters and digits from `event.code`); `conflicts.ts` finds the other row holding a combination, swaps both rows, flags duplicates left by an import on both rows, and asks `osReservedShortcuts.ts` for the advisory line. The master toggle off dims the table and blocks recording; it never hides it.

**Quick look (step 2 of the quick look plan, 2026-08-23).** `quickLook()` runs the clipboard poll once through `checkClipboardNow()` (`src/main/clipboard/monitoring.ts`), shows and focuses the main window, and sends `open-quick-look` with `{ pending }`, where `pending` says whether that poll sent a `clipboard-changed`. The renderer (`providers/clips/useOpenQuickLookSignal.ts`) opens the reader on row 1 at once when nothing is pending, and otherwise after the next `clipboard-changed` has landed, with no timeout, so a copy made just before the hotkey is what the reader shows. A filter that hides row 1 is cleared first with a toast. The status bar's quick look button is the same action. The hotkey copy notification names the clip's first line, not "Clip N", because the window may be hidden; it is the only OS notification left, and every copy from the window toasts instead.

**Rename and migration (step 1, 2026-08-23).** The action `openToolsLauncher` became `quickLook`. A stored `hotkeys.openToolsLauncher` is moved to `quickLook` by `normalizeHotkeys` in `src/main/storage/settings.ts`, which every settings read passes through; it also deep-merges each action with its default so a map saved by an older build that lacks an action no longer throws in the manager. It is a no-op once applied; `storage.getSettings` persists the result only when it differs from what was stored. There is no other settings schema version; `meta.json` carries `storageVersion: 2` (nothing branches on it yet).

The registry/actions/manager split is the house pattern for main-process modules: separate low-level OS binding from action logic from coordination, exposing a singleton with a stable public API. `hotkeyManager.cleanup()` runs on `before-quit`.

The OS-reserved combinations the recorder warns about (spec 15.6) are a hand-maintained per-platform list in `src/shared/osReservedShortcuts.ts`.
