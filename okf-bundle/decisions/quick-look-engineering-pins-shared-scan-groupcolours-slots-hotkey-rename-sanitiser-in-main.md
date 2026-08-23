---
type: decision
title: "Quick look engineering: pins, shared scan, groupColours slots, hotkey
  rename, sanitiser in main"
tags:
  - quick-clips
  - quick-tools
  - storage
  - ipc
  - security
  - hotkeys
  - templates
timestamp: 2026-08-22T23:41:31.807Z
status: stable
---

Locked 2026-08-22, not implemented. The engineering choices behind section 17 of `docs/specs/quick-look-redesign.md` and the four-step order in `docs/specs/implementation-plan.md`. Every file and line there was checked against the source at commit `4155514`. Design context: [Tools Launcher replaced by quick look](tools-launcher-window-replaced-by-quick-look-and-pin-tray.md), [settings Tools tab](settings-for-search-terms-tools-and-templates-master-detail-inspector.md), [settings shell](settings-shell-general-and-hotkeys-left-rail-immediate-apply-keycap-recorder.md), [outliers](quick-look-outliers-search-bar-status-bar-other-clip-types-live-list.md).

Choices and why:

- **Clips get an `id`.** `ClipItem` has no identity today (`src/shared/types.ts:14-23`); `StoredClip.timestamp` is re-stamped on every save (`src/main/storage/clips.ts:15`). The reader, the copied marker and pin pruning all need to follow a clip while rows shift, so `id` is assigned with `crypto.randomUUID()` in the renderer's clip creators (`providers/clips/utils.ts`) and backfilled by `migrateData` on load. Locks stay keyed by index because a lock is a slot property (the insertion loop at `state.ts:151-169` skips locked slots).
- **Pins are a `group|value` map in the clips provider**, memory only, never stored (pins do not persist across restarts). One set of writers (`togglePins`, `setPins`, `clearPins`); pruning is an effect on `[clips, scanIndex]` that names the reason (edit, delete, rotation) from the diff against the previous clips array.
- **One scan, in the renderer, no IPC.** `scanText(text, terms)` in `src/shared/scan.ts`, pure, regexes compiled with `gd` so named groups carry positions, cached per clip id in a `ScanIndexProvider`, cleared when the main process broadcasts `quick-clips-config-changed`. This replaces the per-row 300ms `quick-clips-scan-text` IPC in `usePatternDetection.ts` and the settings Test Patterns call. Why renderer: chips need positions synchronously, and the settings editor must scan an unsaved pattern against the sample; the two must be the same function so chips and previews cannot disagree. Tool fan-out (`buildToolUrls`) and the template engine move to `src/shared/` for the same reason; opening tabs goes through a new `open-external-urls` IPC that accepts `http:` and `https:` only (today `shell.openExternal` takes anything, `quick-clips.ts:149-151`).
- **`groupColours` stores a slot index, not a hex**, keyed by group, in `templates.enc` beside the search terms, exported with the Quick Clips config (version `2.0.0`, import gains `mode: merge | replace`). The bucket is twelve `{ dark, light }` pairs in `src/shared/groupColours.ts`; the renderer sets `--slot-0` to `--slot-11` per theme and nothing references a hex. The resolver is override, then named default, then lowest free slot. Spec section 4's "hash the group name" sentence is superseded by this and left unedited.
- **One `BUILTIN_PATTERNS`** in `src/shared/builtinPatterns.ts`, the eight entries of the live copy (`SearchTermsSection.tsx:10-49`, TLD-aware domain regex, GUID) with group names `ip`, `email`, `domain`, `url`, `phone`, `mac`, `guid`, `ipv6`. Users' existing terms keep their old group names; they are user data.
- **Hotkey rename `openToolsLauncher` to `quickLook`**, migrated in `normalizeSettings` (`src/main/storage/settings.ts:7-14`), the one funnel every settings read passes through, with a per-action deep merge against the defaults. There is no schema version or migration hook anywhere else (`storageVersion` is written and never read, `index.ts:194-200`); `meta.json` gets `storageVersion: 2` so the next change has a number to branch on.
- **Updater state is an enum in main** (`idle, checking, available, downloading, downloaded, upToDate, error`), pushed as `update-state` to every window. Today main holds no state and the settings renderer substring-matches a prose string (`UpdaterControl.tsx:49-53`).
- **HTML-to-text, RTF-to-text and the sanitiser run in the main process.** Extraction at capture (`monitoring.ts`), stored as `ClipItem.text`, so the renderer never parses markup for rows or scans. `htmlparser2` for HTML text, a hand-written tokenizer for RTF, `sanitize-html` (same parser underneath) for the rendered view with the spec's allowlist; exposed as `html-sanitize`, called only when the user opens the rendered view, and the result goes only into a sandboxed iframe's `srcdoc` with the CSP meta prepended. Main so the only code that handles raw clipboard markup is the process that already holds it, and so the hostile-clip unit test runs in node.
- **Sample text** persists as `UserSettings.toolsSampleText` in `settings.enc`, outside the Quick Clips config export. **The settings window** gets `minWidth: 720, minHeight: 440` and becomes resizable, which closes the narrow-layout question.
- **Notifications**: only the hotkey copy keeps an OS notification; `notify-clip-copied` and "Template Generated" go, toasts replace them. A `Toast` component is new; none exists today.
- **Removal list** (spec 17.6) confirmed by grep: the launcher window files, its four IPC channels and preload methods, `ClipOptions.tsx` (with `react-outside-click-handler`), the image popover, `QuickClipsManager.tsx` and `useNativeContextMenu.ts` (both imported by nothing), `UpdateBanner`, the settings components named in 15.7, the eleven `alert()`/`confirm()` calls. There is no orphaned CSS file under `src/renderer`; every stylesheet goes with its component.

Things found in the code that the design assumed (spec 17.8): no clips-window stylesheet uses the CSS variables in `base.css` (265 `isLight` branches in 48 files); `faEye` and `faCopy` are unregistered and `ClipContextMenu.tsx:118` already renders a missing icon; the inline editor's 500ms live save defeats Esc; the storage save queue drops a save that arrives while one is in flight (`storage/index.ts:253-257`); `ClipContextMenu`'s disabled items still fire their handlers; `settings.html` has no CSP; the macOS defaults for Copy clip 3 and 4 are the screenshot shortcuts and will trip the OS-reserved advisory (defaults left alone, flagged).

Order: step 1 vocabulary and storage, step 2 clips window, step 3 settings window, step 4 delete the launcher. Each leaves the app working; after step 2 no button reaches the launcher.
