# Quick look redesign: implementation plan

Status: locked 2026-08-22, not started. Built from
[quick-look-redesign.md](quick-look-redesign.md) sections 1 to 17; section 17 has the file-level
detail and every line reference, this file orders the work. Four steps. Each ships on its own,
leaves the app working, and is a pull request against `main`.

The bar for "done" on every step, from the repo's own rule (OKF gotcha
`e2e-tests-touch-system-clipboard`): `npm run lint`, `npm run typecheck`, `npx vitest run --coverage`
and `npx playwright test` all clean, then `graphify update .` and an OKF log entry. The e2e suite
launches the real app and reads and writes the OS clipboard, so do not hold anything sensitive in
the clipboard while it runs, and expect it overwritten after.

Step numbering here matches section 17's references to "step N".

## Step 1. Vocabulary and storage

What it changes: the data model and the shared code that both windows will build on, with no
visible UI change beyond the hotkey row's new name. After it ships the launcher window still
opens, from the same buttons, so nothing the user does today stops working.

Files touched:

- `src/shared/types.ts`: `ClipItem.id`, `ClipItem.text`, `HotkeySettings.quickLook` (replacing
  `openToolsLauncher`), `TemplatesData.groupColours`, `QuickClipsConfig.groupColours` and version
  `'2.0.0'`, `UserSettings.toolsSampleText`, `UpdateState`, `ScanResult`, `Match`.
- New shared modules: `src/shared/groupColours.ts` (slots, defaults, `resolveGroupSlot`),
  `src/shared/builtinPatterns.ts` (the one library, eight entries, new group names),
  `src/shared/scan.ts` (`scanText`), `src/shared/tools.ts` (`toolTokens`, `toolReady`,
  `buildToolUrls`), `src/shared/templates.ts` (the engine moved from
  `src/main/storage/templates.ts:55-101`), `src/shared/readiness.ts` (`templateReadiness`,
  `configReadiness`), `src/shared/osReservedShortcuts.ts`.
- `src/main/storage/settings.ts`: hotkey rename migration and per-action deep merge in
  `normalizeSettings`. `src/main/storage/defaults.ts`: `quickLook` key. `src/main/storage/index.ts`:
  `getGroupColours`, `setGroupColours`, group pruning on save, import `mode`, `storageVersion: 2`
  in `meta.json`, the save queue fix (17.8). `src/main/storage/migration.ts`: backfill `id` and
  `text` on load. `src/main/storage/templates.ts`: import the engine from shared.
- `src/main/hotkeys/types.ts`, `manager.ts:102-115`, `actions.ts:173-195`: rename only; the
  action body still opens the launcher window until step 2.
- `src/main/updater/index.ts`: the `UpdateState` enum, `update-state` push, `get-update-state`.
  `src/renderer/src/components/UpdateBanner.tsx` and `components/settings/UpdaterControl.tsx`
  switch to it (the banner stays until step 2; the substring matching goes now).
- New main modules: `src/main/clipboard/extract-html.ts`, `extract-rtf.ts`, `sanitize-html.ts`
  (17.4). `src/main/clipboard/monitoring.ts:55-80`: set `text` for `html` and `rtf` clips before
  sending. `checkClipboardNow()` export.
- `src/main/clipboard/quick-clips.ts`: `exportQuickClipsConfig` includes `groupColours` and
  version 2; `openToolsForMatches` delegates to `src/shared/tools.ts` so the launcher keeps working
  with the one fan-out.
- `src/main/clipboard/ipc.ts`, `src/main/ipc/index.ts`, `src/preload/index.ts`,
  `src/preload/index.d.ts`: the new channels below; `on*` methods return unsubscribe functions.
- `src/renderer/src/providers/clips/utils.ts:7-60`: every creator assigns `id`; `createHtmlClip`
  and `createRtfClip` carry `text`. `providers/clips/types.ts:6-20`: delete the duplicated clip
  types, import from shared. `providers/clips/index.tsx`, `clipboard.ts`: `clipCopyId` replaces
  `clipCopyIndex` (the marker follows its clip from here on).
- New `src/renderer/src/providers/scan.tsx` (`ScanIndexProvider`, `getScan`); `hooks/usePatternDetection.ts`
  becomes a thin wrapper over it so `ClipWrapper.tsx:32` keeps its badge without IPC. Its test
  moves to the provider.
- `src/renderer/src/components/settings/quickclips/SearchTermsSection.tsx:10-49`: import
  `BUILTIN_PATTERNS` from shared; `components/settings/hotkeys/useHotkeyManager.ts:5-50`: defaults
  from `hotkeys-get-defaults`, label "Quick look on newest clip".
- Deleted now, because nothing imports them: `src/renderer/src/components/settings/QuickClipsManager.tsx`,
  `src/renderer/src/hooks/useNativeContextMenu.ts`, the `show-clip-context-menu` handler
  (`src/main/ipc/index.ts:114-160`) and the three preload methods only it used, and the preload
  methods with no caller (17.6, last paragraph).
- `package.json`: add `htmlparser2`, `sanitize-html`, `@types/sanitize-html`.

New IPC: `group-colours-get`, `group-colours-set`, `hotkeys-get-defaults`, `html-sanitize`,
`update-state` (push), `get-update-state`, `quick-clips-config-changed` (push). Changed:
`quick-clips-import-config` takes `{ config, mode }`.

Tests to add (unit, vitest `node` and `renderer` projects):

- `src/shared/scan.test.ts`: positions from the `d` flag, group order by first appearance,
  overlapping terms, disabled terms skipped, a bad pattern reported and skipped, an empty-matching
  pattern cannot loop, the 256 KB threshold flag.
- `src/shared/groupColours.test.ts`: override, default, next free slot, wrap at twelve, stability
  across term order.
- `src/shared/tools.test.ts`: every case from the `openToolsForMatches` describe in
  `src/main/clipboard/quick-clips.test.ts` rewritten against `buildToolUrls`, plus `toolReady` for
  pipe tokens and the exact tab count.
- `src/shared/templates.test.ts`: the cases from `src/main/storage/templates.test.ts` moved.
- `src/shared/readiness.test.ts`: ready, needs with pin-from-clip keys, needs without, clip
  template, "first of N"; the four config wordings.
- `src/main/storage/settings.test.ts` (new file): `openToolsLauncher` moved to `quickLook`, a map
  missing a key deep-merged, an already-migrated map untouched.
- `src/main/storage/migration.test.ts`: `id` and `text` backfilled, existing ones kept.
- `src/main/clipboard/extract-html.test.ts`, `extract-rtf.test.ts`: block breaks, entities, skipped
  script and style, `\'hh`, `\uN` with `\uc`, skipped destinations, nested groups.
- `src/main/clipboard/sanitize-html.test.ts`: the hostile clip from the outliers prototype (script,
  `onerror` image, iframe, page-hiding style, fixed overlay, `javascript:` link) as a fixture; assert
  the output contains no `<script`, `<style`, `<iframe`, `on` attributes or `javascript:`, keeps
  the invoice text, emits "[image removed]", and reports the removed counts.
- `src/main/updater/index.test.ts`: state transitions from each event and the `update-state` push.
- `src/renderer/src/providers/scan.test.tsx`: one scan per clip, re-scan on content change only,
  clear on `quick-clips-config-changed`.

Acceptance minimums satisfied: 14.7 "One `BUILTIN_PATTERNS`; `QuickClipsManager.tsx` removed";
15.7 "the quick look row" (by name); 15.5 "the updater exposes a state enum"; 14.4 `groupColours`
stored and exported. Nothing visible in the clips window changes.

Risky parts:

- The hotkey rename runs on real user data the first time the app starts. The migration is one
  function with a test, but `normalizeSettings` is also called on every read, so it must be a
  no-op the second time.
- Old clips get `id` and `text` on load and are saved back; the first save after upgrade rewrites
  `clips.enc` in full. An older build reading the new file ignores the extra fields (the validator
  at `migration.ts:30-44` keeps unknown keys).
- `{a|b}` readiness becomes "any alternative pinned". Today's launcher shows such a tool when any
  group is present, so behaviour for existing users does not change, but the rule is now written
  down and tested.
- The `d` regex flag needs V8 with `hasIndices`; Electron 42 has it. Nothing else in the app uses
  it, so there is no fallback to write.
- Text extraction at capture runs on every HTML copy. A page-sized paste is a few hundred KB of
  markup; `htmlparser2` handles that in milliseconds, but it runs on the main process's poll, so
  the test suite should include a 1 MB fixture with a timing assertion.

## Step 2. Clips window

What it changes: chips, pins, the tray, quick look, the search bar, the status bar, the context
menu with the clip template submenu, and the other clip types. After it ships no button opens the
launcher window; its code is dead until step 4. Sections 4 to 10 and 16 in full.

Files touched:

- `src/renderer/src/assets/theme.css` (new, the one variable set for both windows; `main.tsx` and
  `settings-main.tsx` import it), `fontawesome.ts` (17.8 icons).
- `src/renderer/src/App.tsx`: stack order list, tray, search bar, status bar; `ToastProvider`.
- `providers/clips/pins.ts` (new), `providers/clips/index.tsx` (pins context, quick look state,
  pinned filter in `filteredClips`, the `open-quick-look` listener), `providers/clips/state.ts`
  (pruning effect with reasons, the `clipCopyIndex` reset at `:149` removed).
- `components/Toast.tsx` (new).
- `components/clips/Clips.tsx` (row focus, keyboard: Up, Down, Space, `p`, Enter, `/`; focus
  return through `scrollToIndex`), `clip/ClipWrapper.tsx` (dots, lock, eye; `ClipOptions` and the
  badge removed), `clip/Chip.tsx` (new), `clip/TextClip.tsx` (chips in the collapsed line, no chips
  while editing, live save removed, Esc restores), `clip/ImageClip.tsx` (popover and portal
  removed, format tag and dimensions), `clip/HtmlClip.tsx`, `clip/RtfClip.tsx`, `clip/BookmarkClip.tsx`
  (type tag, extracted text or title plus URL chip), `clip/ClipContextMenu.tsx` (Copy, Quick look,
  Lock, Delete with real disabled state and the row 1 reason; Fill clip template submenu).
- `components/quick-look/` (new): `QuickLook.tsx` (dialog, focus trap, Esc stack, keys),
  `Header.tsx`, `Content.tsx` (lines with gutter, Prism tokens split at match offsets, wrap),
  `SideColumn.tsx` (groups, counts, pin all, hover link), `Footer.tsx` (hints, pills, pinned count,
  Launch), `ImageView.tsx`, `SourceView.tsx`, `RenderedView.tsx` (the sandboxed iframe),
  `Editor.tsx` (the existing textarea plus overlay at reader size).
- `components/tray/` (new): `Tray.tsx` (header, collapse under 360px, internal scroll at 34%),
  `TrayGroup.tsx` (values as removable chips, tool buttons with multipliers, stacked under 480px),
  `TrayFooter.tsx` (template line, Open all with the exact count, the dropped-pins notice).
- `components/TemplatePills.tsx` (new, shared by the tray footer and the reader footer).
- `components/SearchBar.tsx` (mark on hits, count line, pinned toggle, `/`, Down and Enter
  handoff, one-level Esc), `components/StatusBar.tsx` (search on-state, quick look button, settings,
  update pill from `update-state`, counts-only under 480px), `components/UpdateBanner.*` deleted.
- `src/main/hotkeys/actions.ts:173-195`: `quickLook()` body (check clipboard now, focus, send
  `open-quick-look`). `src/main/clipboard/ipc.ts`: `open-external-urls` with the scheme check;
  `notify-clip-copied` and `templates-generate-text` handlers removed with their preload methods.
  `src/main/clipboard/quick-clips.ts:51-157`: `openToolsForMatches` and `quick-clips-open-tools`
  removed (no caller once the status bar and menus open quick look; the launcher window cannot be
  reached).
- `package.json`: drop `react-outside-click-handler`.
- `e2e/tools.spec.ts:258-361`: the two launcher describes rewritten for quick look (below).

New IPC: `open-quick-look` (push), `open-external-urls`. Removed: `notify-clip-copied`,
`templates-generate-text`, `quick-clips-open-tools`, `quick-clips-scan-text` stays until step 3
(the old Test Patterns tab still calls it).

Tests to add:

- Unit: `providers/clips/pins.test.ts` (toggle, set, clear, `pinnedAt` order, pruning after an
  edit, a delete and a rotation with the right reason each time); `providers/clips/quickLook.test.ts`
  (open by id, renumber when a clip lands above, close with toast when the id disappears, walk
  skips empty and filtered rows, "hidden by filter"); `components/clips/clip/Chip.test.tsx` (click
  pins and never enters edit, double-click selects text, pinned styling); `components/TemplatePills.test.tsx`
  (ready, needs with pin-from-clip, needs inert with tooltip, first-of-N toast text);
  `components/quick-look/RenderedView.test.tsx` (iframe has `sandbox=""`,
  `referrerpolicy="no-referrer"`, `srcdoc` begins with the CSP meta, the source string is never
  assigned anywhere but `srcdoc`); `components/SearchBar.test.tsx` (count line wording, pinned
  toggle disabled with no pins, Esc one level); `components/Toast.test.tsx`;
  `components/clips/clip/ClipContextMenu.test.tsx` (row 1 items disabled with reason, submenu
  lists positional templates with previews from rows 1 to 3, empty state).
- E2E (`e2e/quick-look.spec.ts`, new; workers stay at 1): copy text with an IP and an email, the row
  shows two chips and two dots; click a chip, the tray appears with one group and a tool button;
  pin a second IP, the button reads "x2" and Open all says the count; the eye and Space open the
  reader, Esc closes it and focus is on the row; Up and Down walk; type a filter, the reader says
  "n / m filtered"; right-click row 2 shows Quick look and the submenu; right-click row 1 shows Lock
  and Delete disabled. Clipboard-writing cases in one serial describe at the end, each asserting
  the toast: number cell copy, `c` in the reader, a ready template pill. HTML rendered view: put
  the hostile clip on the clipboard, open the reader, switch to rendered, assert the frame's
  `sandbox` attribute and that `page.on('request')` saw nothing from the frame.
- The existing `e2e/context-menu.spec.ts` is updated for the new items.

Acceptance minimums satisfied: section 13, every bullet except the first (the launcher code is
unreachable but still present; step 4 closes it); section 16.3 in full.

Risky parts:

- Focus return on a virtualised row (17.1). `scrollToIndex` then focus on the next frame; test it
  with a 100-clip list where the opened row is far from the viewport.
- The reader and the tray inside a transparent window. Both are DOM inside the window, so they
  fade with it; check the dimmer colour on the light theme with 50% transparency.
- The hotkey race (17.3): `checkClipboardNow()` runs the poll body once, but the renderer inserts
  the clip asynchronously. The `open-quick-look` handler waits for the next `clipboard-changed`
  only if `checkClipboardNow()` reported a change; a flag in the push payload avoids a timeout.
- Chips inside Prism tokens. Tokenise per line, then split text nodes at match offsets; a match
  that spans a token boundary splits both tokens. The unit test needs a JSON clip where an IP sits
  inside a string token.
- The Esc stack meets `ConfirmDialog` (Clips to keep confirm, delete confirm). The dialog owns Esc
  while open; it is the innermost level.
- Scanning every clip for tray readiness and the pinned filter is 100 scans at most, cached by
  id; the first load scans all of them once. With the 256 KB threshold that is bounded.
- Removing the live save changes editing for people who relied on it; the spec says Esc cancels,
  so this is a fix, but it is user-visible.

## Step 3. Settings window

What it changes: the shell, General, Hotkeys and Tools as sections 14 and 15 describe. The clips
window is unchanged.

Files touched:

- `src/renderer/src/Settings.tsx` (rail, pane, title bar, footer, one loading state, one
  `ToastProvider`), `Settings.module.css` and `assets/settings.css` replaced by `theme.css` plus
  `settings/shell/Shell.module.css`.
- `components/settings/shell/` (new): `Rail.tsx`, `Pane.tsx`, `Footer.tsx`, `Status.tsx` (the one
  saving, saved, not saved slot), `Tooltip.tsx`.
- `components/settings/general/` (new): `General.tsx` (two panels plus three, one column under
  720), `Application.tsx`, `Window.tsx`, `Storage.tsx` (count, usage bar, locked, size),
  `Updates.tsx` (from `update-state`), `About.tsx`, `useSetting.ts` (per-control status map with
  undo and retry), `ClipsToKeep.tsx` (commit on Enter or blur, inline validation, confirm with
  counts), `ClearAll.tsx`, `ImportPreview.tsx`.
- `components/settings/hotkeys/` rewritten: `Hotkeys.tsx` (master toggle, table), `Recorder.tsx`
  (keycaps as recorder, live modifiers, validation, conflict with swap), `display.ts` (accelerator
  to platform key names), `conflicts.ts`, `useHotkeys.ts`. `GlobalToggle.tsx`, `HotkeyHeader.tsx`,
  `HotkeyInstructions.tsx`, `HotkeyList.tsx`, `LoadingState.tsx`, `SavingIndicator.tsx`,
  `useHotkeyManager.ts`, `HotkeyManager.tsx` and `HotkeyManager.module.css` deleted.
- `components/settings/tools/` (new): `Tools.tsx`, `ListPane.tsx`, `Inspector.tsx`, `Overview.tsx`,
  `SearchTermEditor.tsx`, `ToolEditor.tsx`, `TemplateEditor.tsx`, `Uses.tsx`, `StartFrom.tsx`,
  `Bucket.tsx`, `TokenPicker.tsx`, `SampleText.tsx`, `ExportImport.tsx`, `useToolsData.ts` (one load
  of terms, tools, templates, colours, sample). `ToolsManager.tsx`, `TemplateManager.tsx` and its
  CSS, `quickclips/*`, `QuickClipsManager.module.css` deleted.
- `components/settings/usersettings/`: `ToggleSwitch.tsx` stays; `LoadingState.tsx`,
  `SavingIndicator.tsx`, `ErrorState.tsx`, `CloseButton.tsx`, `SettingItem.tsx`, `UserSettings.tsx`,
  `ApplicationSettings.tsx`, `WindowSettings.tsx`, `useUserSettings.ts` replaced by the general
  folder. `StorageSettings.tsx`, `storagesettings/*`, `UpdaterControl.*`, `Versions.*` deleted.
- `src/main/window/creation.ts:34-96`: 900 x 600, resizable, `minWidth: 720, minHeight: 440`.
- `src/main/hotkeys/registry.ts:24-45` and `manager.ts:35-65`: registration results returned to
  the caller so `settings-changed` can answer "not saved" per row; `src/main/ipc/index.ts:35-69`
  returns `{ ok, failed: string[] }`.
- `src/main/clipboard/ipc.ts`: `quick-clips-scan-text` and `search-terms-test` handlers removed
  (no caller after the Test Patterns tab goes); `scanTextForPatterns` and
  `src/main/clipboard/search-terms.ts:83-102` removed with their tests.
- `settings.html`: the same CSP as `index.html`.

New IPC: none beyond step 1; `settings-changed` gains the registration result.

Tests to add:

- Unit: `hotkeys/display.test.ts` (every modifier on each platform, raw string never returned),
  `hotkeys/conflicts.test.ts` (conflict found, swap writes both rows, OS reserved advisory per
  platform, duplicate after import flags both), `hotkeys/Recorder.test.tsx` (modifier echo, first
  non-modifier completes, no-modifier message keeps recording, Esc cancels, old binding untouched
  until accept), `general/ClipsToKeep.test.tsx` (Enter and blur commit, out of range message, below
  count asks with numbers), `general/useSetting.test.ts` (saving, saved with undo, not saved with
  retry and rollback, no cross-control disabling), `tools/readiness` (through
  `src/shared/readiness.test.ts`, already there), `tools/SearchTermEditor.test.tsx` (validation
  cases from 14.4, chips from the pattern under edit), `tools/ToolEditor.test.tsx` (orphan wavy,
  tab count from the sample, picker contents), `tools/Bucket.test.tsx` (shared swatch marked, reset),
  `tools/ExportImport.test.tsx` (counts preview, merge and replace calls with `mode`, inline
  failure), `tools/StartFrom.test.tsx` (already added, re-enable on disabled duplicate).
- E2E: `e2e/settings.spec.ts` extended (rail, three tabs, version in the rail, 720 x 440 layout
  with no hidden control); `e2e/tools.spec.ts` settings describes rewritten for the inspector
  (create a term from the library, see chips against the sample, make a tool with a picked token,
  see the tab count, delete with the dependents named). Hotkey recording is not driven end to end:
  accepting a combination registers a real global shortcut on the developer's machine; the e2e
  test records, sees the conflict line, and presses Esc.

Acceptance minimums satisfied: 14.7 in full, 15.7 in full.

Risky parts:

- Reporting a refused registration per row means the main process has to say which accelerator
  failed; `registry.registerHotkey` returns a boolean today and `registerHotkeys` drops it. The
  swap case registers two in sequence and must roll back the first if the second fails.
- Import with replace restarts the app (15.5); the confirm text must say so and the restart must
  flush storage first (the save queue fix from step 1).
- The per-control status model is new code on every row; the `useSetting` hook is the only place
  that touches `storage-save-settings`, so a failure path tested once covers all rows.
- The Tools tab is the largest single piece of UI in the redesign. Build it data-first
  (`useToolsData`, readiness, the resolver) with tests before any layout.

## Step 4. Remove the launcher window

What it changes: deletes the dead launcher code and its window plumbing. No user-visible change.

Files touched (17.6, the two launcher lists): `src/renderer/tools-launcher.html`,
`tools-launcher-main.tsx`, `ToolsLauncher.tsx`, `components/clips/QuickClipsScanner.tsx`,
`QuickClipsScanner.module.css`, `QuickClipsScanner.test.tsx`, `quickClipsSelection.ts`,
`assets/base.css` (after its variables are in `theme.css`); `electron.vite.config.ts:31`;
`src/main/window/creation.ts:20,30-32,98-154`; `src/main/ipc/index.ts:10-11,81-95`;
`src/preload/index.ts:138-149` and `index.d.ts:82-89`; `src/main/hotkeys/types.ts:8,15`;
`src/main/hotkeys/actions.test.ts:338-403` and `manager.test.ts:171-220,313` for anything still
naming the launcher; `src/main/clipboard/quick-clips.ts` keeps only the export and import functions
(rename the file `quick-clips-config.ts`). `graphify-out` and the OKF `systems/tools-launcher`
concept are updated to say the window is gone.

New IPC: none. Removed: `open-tools-launcher`, `close-tools-launcher`, `tools-launcher-ready`,
`tools-launcher-initialize`.

Tests: `e2e/app-launch.spec.ts` gains one case: press the quick look status bar button and assert
`app.windows()` has no window whose URL contains `tools-launcher`. `npm run typecheck` is the real
test of this step; every removed preload method has a type mirror.

Acceptance minimums satisfied: section 13, first bullet ("No Tools Launcher window exists").

Risky parts: none worth the name. The launcher is also named outside `src`: `README.md` (5
mentions), `site/docs/index.html` (10), `screenshots/capture.spec.ts` (8) and
`screenshots/helpers.ts` (3). Update all four in the same pull request, and re-run
`npm run screenshots` since the capture spec drives the launcher window.

## Order and what each step leaves behind

| After step | Launcher window | Chips and tray | Reader | Settings | Storage format |
| --- | --- | --- | --- | --- | --- |
| 1 | opens as today | no | no | old UI, new hotkey name | new (ids, text, colours, v2 export) |
| 2 | unreachable | yes | yes | old UI | same |
| 3 | unreachable | yes | yes | new | same |
| 4 | gone | yes | yes | new | same |

Steps 2 and 3 can run in parallel on separate branches once step 1 has merged; they share only
`theme.css`, which step 2 creates, so step 3 branches from step 2's first commit or creates the
file itself and reconciles on merge. Step 4 waits for both.
