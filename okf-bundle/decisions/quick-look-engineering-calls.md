---
type: decision
title: Quick look engineering calls
tags:
  - quick-clips
  - quick-tools
  - storage
  - ipc
  - security
  - hotkeys
  - templates
  - testing
status: stable
generated:
  by: claude-code/fable-5
  at: 2026-08-23T16:43:25.505Z
sources:
  - id: spec
    title: docs/specs/quick-look-redesign.md section 17 and
      docs/specs/implementation-plan.md
    resource: https://github.com/dantheuber/clipless/blob/main/docs/specs/implementation-plan.md
  - id: pr
    title: "PR #146 (the four implementation steps collapsed into one)"
    resource: https://github.com/dantheuber/clipless/pull/146
---

The engineering choices behind the [quick look redesign](tools-launcher-window-replaced-by-quick-look-and-pin-tray.md) and the [settings redesign](settings-window-redesign.md), shipped 2026-08-23 in 1.9.0.[^pr] Spec section 17 set most of them;[^spec] the rest were settled by the code during the four implementation steps (vocabulary and storage, clips window, settings window, delete the launcher). Each entry is a choice that a later change could silently undo, with the reason it was made.

## Data and storage

- **Clips have an `id`** (`crypto.randomUUID()` in the renderer's clip creators, backfilled by `migrateData` on load, required on every fixture). The reader, the copied marker and pin pruning follow a clip while rows shift. Locks stay keyed by index because a lock is a slot property.
- **Pins are a `group|value` map in the clips provider**, memory only, never stored. One set of writers (`togglePins`, `setPins`, `clearPins`); `usePinPruning` runs on `[clips, scanIndex]` and names the reason from the diff against the previous clips array. Delete is recognised by its shape (one slot became an empty clip while every other slot kept its id) because `emptyClip` gives the row a new id. The fourth reason, "after the search terms changed", is not in the spec: a pin can vanish because the terms changed while the clip did not.
- **`groupColours` stores a bucket slot index, not a hex**, keyed by group, in `templates.enc` beside the search terms; the resolver is override, then named default, then lowest free slot (`src/shared/groupColours.ts`). Nothing references a hex; the renderer sets `--slot-0` to `--slot-11` per theme.
- **Config export is version `2.0.0`; import takes `merge` or `replace`.** Replace replaces the lists (terms, tools, templates) as well as the colour map, because a replace that only touched colours would be the same as merge for everything else. Merge appends the lists and keeps existing colours, adding missing ones.
- **Hotkey action `openToolsLauncher` became `quickLook`**, migrated in `normalizeHotkeys` (`src/main/storage/settings.ts`), the one funnel every settings read passes through, with a per-action deep merge against the defaults. `getSettings()` in `storage-integration.ts` returns the defaults on failure, not `{}`, because `maxClips` and the hotkey map must exist downstream.
- **`meta.json` `storageVersion` is meant to be 2** so the next change has a number to branch on, but nothing reads it and two constants disagree: `src/main/storage/migration.ts` exports `CURRENT_STORAGE_VERSION = 2` and `src/main/storage/index.ts` keeps a private `CURRENT_STORAGE_VERSION = 1` for its own writes. Unify before anything branches on it.
- **Sample text** persists as `UserSettings.toolsSampleText` in `settings.enc`, outside the config export.

## Scanning, tools and templates

- **One scan, in the renderer, no IPC.** `scanText(text, terms)` in `src/shared/scan.ts`, pure, regexes compiled with `gd` so named groups carry positions, cached per clip id in `ScanIndexProvider`, cleared on `quick-clips-config-changed`. Chips need positions synchronously and the settings editor must scan an unsaved pattern against the sample; both must be the same function so chips and previews cannot disagree. The main-process scanner and the `quick-clips-scan-text` IPC are gone.
- **Nothing is scanned until the terms have loaded** (`terms` is null until `search-terms-get-all` answers). The alternative was two scans per clip on every launch.
- **Tool fan-out (`src/shared/tools.ts`) and the template engine (`src/shared/templates.ts`) are shared code** for the same reason. Tabs open through `open-external-urls`, which accepts `http:` and `https:` only (the old path passed anything to `shell.openExternal`).
- **A multi-token tool appears in every tray group row whose group it uses**, with the same multiplier; Open all counts its URLs once. `useToolUrls` is the one place this is decided.
- **Chips come only from search terms.** A bookmark's URL is a chip only when a term matches it (spec 10, nothing is highlighted the user did not configure, wins over the wording of 16 rule 6); the row scans `title + '\n' + url`.
- **A clip template means no named tokens**: `templateReadiness` returns `clip-template` when `extractTemplateTokens(content).named` is empty. A template with both named and positional tokens is match-driven. A pipe token (`ticket|user`) is an orphan only when none of its alternatives has a producer.
- **One `BUILTIN_PATTERNS`** (`src/shared/builtinPatterns.ts`, eight entries with a name, a description and a pattern; group names `ip`, `email`, `domain`, `url`, `phone`, `mac`, `guid`, `ipv6`). Users' existing terms keep their old group names; they are user data.
- **A template copy lands as a new clip**: the pill writes the clipboard with `set-clipboard-text` and the monitor captures it, as the launcher's copy did. The toast is the confirmation.

## Markup, images and security

- **HTML-to-text, RTF-to-text and the sanitiser run in the main process**, so the only code that handles raw clipboard markup is the process that already holds it, and the hostile-clip unit test runs in node. Extraction happens at capture (`htmlparser2` walk for HTML, a hand-written tokenizer for RTF; `&nbsp;` and `\~` collapse to a space, the one space after an RTF control word is its delimiter, HTML line breaks are whitespace except inside `pre`) and is stored as `ClipItem.text`; a regex strip would have left entity text, script bodies and style rules for the scanner to chip. `html-sanitize` (`sanitize-html`) runs only when the user opens the rendered view and the result goes only into a sandboxed iframe's `srcdoc` with the CSP meta prepended; its `removed` map keys tag and attribute names together (`style: 2` for a `<style>` element plus a `style=` attribute).
- **Image clips record `imageWidth`, `imageHeight` and `imageBytes` at capture** so the row can say "1280 x 720, 412 KB" without loading the full image; older clips estimate from the thumbnail.
- **Chips and the editor overlay tokenise with `refractor` directly**, per line (`components/quick-look/tokens.ts`); `react-syntax-highlighter` is gone. `tsconfig.web.json` uses `moduleResolution: bundler` so refractor's `exports` subpaths type-check.

## Windows and settings plumbing

- **The reader draws inside the list area**, not over the window, so the tray, search bar and status bar stay usable. **The Esc stack is emergent**: the editor, the dialog and the search input each handle Esc on themselves, the context menu on `document` in the capture phase, `ConfirmDialog` on `window` in the capture phase with `stopImmediatePropagation`; whichever has focus or is topmost wins without a registry.
- **One write path for settings, in the renderer.** `SettingsProvider` loads once per window and `commit(patch, keys)` is the only writer, through `settings-changed`, which answers `{ ok, failed, message }`. A refused change puts the control back and re-sends the previous values, so storage, the login item and the registered shortcuts agree with what the window shows. Each commit owns only its status keys. A refused accelerator on a changed row rolls the write back; on an unchanged row (master turned on with a default taken by another app) it is reported and the master stays on, or nobody could turn hotkeys on. The main process does no rollback.
- **Recording reads letters and digits from `event.code`** (Shift+1 is `1`, not `!`). Ctrl on Windows and Linux and Cmd on macOS store as `CommandOrControl`; Ctrl on macOS is `Control`, Win/Super is `Super` and does not count as the required modifier.
- **The settings window mounts no ClipsProvider and no LanguageDetectionProvider.** Its chips are `ValueChip` (no pin), the sample's fallback is the newest clip read once through `storage-get-clips`, and the pure match helpers live in `components/clips/clip/matches.tsx` so settings never imports the clips barrel ([coverage gotcha](../gotchas/coverage-is-100-of-the-files-tests-import-not-of-the-tree.md)).
- **Two IPC channels beyond the spec**: `app-restart` (flush the save queue, mark quitting, relaunch; the replace import needed one) and `open-app-path` (`data` or `logs`, for About). Both under `src/main/app/`.
- **Lowering Clips to keep keeps locked clips**: `shrinkClips` drops the oldest unlocked first and re-indexes the locks.
- **The Tools tab's selection check runs on config reloads, not on selection** (`ToolsData.version` bumps per load): a just-saved item is selected before the reload that carries it lands, and checking on every render dropped it to the overview in the real app while unit tests passed by microtask luck.
- **Updater state is an enum in main** (`idle, checking, available, downloading, downloaded, upToDate, error`) pushed as `update-state`; a dev build's check sets `upToDate`. Before this the renderer substring-matched a prose string.
- **Notifications**: only the hotkey copy keeps an OS notification; everything else is a `Toast`.
- **`base.css` went without a fold.** No live rule outside the launcher used its variables; the `body` typography the main window took from it moved into `assets/main.css` reading `var(--sans)` and `var(--text)`.

## Test harness

- `CLIPLESS_PLAINTEXT_STORAGE=1` makes the e2e and screenshot suites run on Linux, see [E2E on Linux](../gotchas/e2e-on-linux-playwright-forces-the-basic-password-store.md). Under that wrapper the work area reads 0 x 0 and every window opens at its minimum size, so layout specs set their size explicitly.
- Size e2e windows with `setContentSize`, not `setSize`: on Windows `setSize` includes the 16 px frame and `innerWidth` reads 884 for 900.
- A click-away to close a menu must land on the status bar; (5, 5) is row 1's number cell in the redesigned window, which copies the clip and toasts.
- `validate-pr` refuses a `package.json` version that is already tagged, so a feature PR bumps the version.
