---
type: decision
title: "Quick look step 3 calls: hotkey rollback in the renderer, no
  ClipsProvider in settings, a restart IPC, e2e windows open at their minimum"
tags:
  - settings
  - hotkeys
  - quick-clips
  - ipc
  - testing
  - ux
timestamp: 2026-08-23T05:46:45.469Z
status: stable
---

Step 3 of `docs/specs/implementation-plan.md` (the settings window of spec sections 14 and 15) shipped on branch `t3code/quick-look-step-3` as PR #148 on 2026-08-22, stacked on the [step 2 calls](quick-look-step-2-calls-chips-only-from-terms-tools-in-every-group-row-they-use-image-size-at-capture-plaintext-storage-under-test.md) and the [step 1 calls](quick-look-step-1-calls-replace-mode-scan-after-terms-load-clip-template-means-no-named-tokens.md). These are the calls the spec left to the code, so step 4 builds on the same reading.

- **One write path for settings, in the renderer.** `SettingsProvider` (`components/settings/general/SettingsProvider.tsx`) loads the settings once for the window and `commit(patch, keys)` is the only thing that writes them, through `settings-changed`. A change applies to its control at once; when the main process says no, the provider puts the control back *and re-sends the previous values*, so storage, the login item and the registered shortcuts agree with what the window shows. Each commit owns only its status keys, so two saves run side by side and nothing is ever disabled by another control (15.3). `storage-save-settings` is no longer called by settings code at all; the clips window's theme and language providers still call it.
- **`settings-changed` answers `{ ok, failed, message }`.** The hotkey manager collects the accelerators `globalShortcut` refused (`HotkeyRegistrationResult`), and `applyAutoStart` returns whether the OS now holds the requested login-item state. A refused accelerator on a *changed* row makes that row "not saved" and rolls the write back; a refused accelerator on an *unchanged* row (turning the master on with one default taken by another app) is reported on that row and the master stays on, or nobody could ever turn hotkeys on. A swap writes both rows in one commit and rolls both back when either fails. The main process does no rollback itself.
- **Recording reads letters and digits from the physical key** (`event.code`), so Shift+1 records as `1`, not `!`. Ctrl on Windows and Linux and Cmd on macOS both store as `CommandOrControl`; Ctrl on macOS stores as `Control` and Win/Super as `Super`, which does not count as the required modifier.
- **Settings mounts no ClipsProvider and no LanguageDetectionProvider.** The term editor's chips are a `ValueChip` (the chip look, no pin; pinning in settings means nothing), the sample text's fallback is the newest clip read once through `storage-get-clips`, and `visibleMatches` and `markHits` moved to `components/clips/clip/matches.tsx` so settings never imports the clips barrel (see the coverage gotcha).
- **Two IPC channels the spec does not list**: `app-restart` (flush the save queue, mark quitting, relaunch; the replace import of 15.5 needed one and nothing called `storage.flush()` before) and `open-app-path` (`data` or `logs`, for the About panel). Both are small tested modules under `src/main/app/`.
- **Lowering Clips to keep keeps locked clips.** The clips provider used to truncate the array at the new limit, locks included, which would have made the 15.5 dialog lie. `shrinkClips` (`providers/clips/utils.ts`) drops the oldest unlocked clips first and re-indexes the locks; only when the locked clips alone exceed the limit do the oldest of those go, and the dialog says so with the numbers.
- **The selection check in the Tools tab runs on config reloads, not on selection.** A just-saved item is selected before the `quick-clips-config-changed` reload that carries it lands; checking on every render dropped it to the overview in the real app (the unit tests passed by microtask luck). `ToolsData.version` bumps per load and the check keys on it.
- **The Tools tab's data is the scan provider's.** `useToolsData` reads terms, tools, templates and `groupColours` from `useScanIndex()` (which gained `loaded` and `groupColours`), so settings and the clips window cannot disagree; the sample text is the `toolsSampleText` setting, saved on blur, and the sample's scan is `scanText` with the same terms.
- **`faWrench` stays registered** until step 4 deletes the launcher window that renders it; the other four icons with no caller went.
- **Under the Playwright x11 wrapper on this machine `screen.getPrimaryDisplay().workAreaSize` is 0 x 0** and Electron opens every new window at its minimum size (the settings window appears at 720 x 440, not 900 x 600). A real display is fine; the layout e2e test sets 900 x 600 itself. See the [Linux e2e gotcha](../gotchas/e2e-on-linux-playwright-forces-the-basic-password-store.md).
- **Not done in step 3, on purpose:** the launcher window files, `base.css`, `openToolsLauncher` and the launcher IPC (step 4); the 14.6 planned additions (tray preview in the overview, Problems filter, library suggestions); `clear all` does not re-register hotkeys in the main process on its own (the settings window re-applies the defaults with an empty commit after it); the Hotkeys tab cannot show registrations refused at app start, only those refused by a change.

## Verification

On 2026-08-22: 915 unit tests in 84 files, 100% statements, branches, functions and lines on every file a test imports; lint (0 errors) and typecheck clean; the Playwright suite 35 of 35 on Linux with the wrapper recipe and `CLIPLESS_PLAINTEXT_STORAGE=1` (30 existing, 5 new in `e2e/settings.spec.ts`, the three settings describes of `e2e/tools.spec.ts` rewritten for the inspector). Hotkey recording is not driven to acceptance end to end: accepting registers a real global shortcut on the developer's machine; the case records, sees the conflict line and presses Esc.
