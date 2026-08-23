---
type: decision
title: "Settings shell, General and Hotkeys: left rail, immediate apply, keycap
  recorder"
tags:
  - ux
  - settings
  - hotkeys
  - storage
  - updater
timestamp: 2026-08-22T21:16:53.071Z
status: stable
---

Decision (2026-08-22, locked in the spec, not implemented): the General and Hotkeys tabs take the shell of the locked Tools tab (see [the Tools decision](settings-for-search-terms-tools-and-templates-master-detail-inspector.md)) so the three tabs read as one product. Spec: `docs/specs/quick-look-redesign.md` section 15. Prototype: `docs/specs/settings-shell-variations.html`, variation C, which also carries the review of the current `Settings.tsx`, `UserSettings`, `StorageSettings`, `UpdaterControl`, `Versions` and `HotkeyManager` code. The page first recommended E (a stack with a jump bar); on review C, the dense no-scroll grid, was chosen, and its three bottom panels were reworked to stack their content rather than wrap a one-line layout.

Shell:

- Left rail (132px, 96px at 720 wide) with General, Hotkeys, Tools, and the app version at the bottom of the rail. Top tabs are out: they would add a strip above every tab and the Tools frame could not drop in unchanged. The separate Versions card goes.
- True-black scale, Inter plus monospace, the Tools prototype's buttons, toggles (no ON/OFF text), footer links, status dots and toasts.
- Both themes. Every colour goes through one variable set and the light theme swaps the set; each prototype has a theme button showing both. Group colours carry a darker light-theme value per bucket slot. The forty-odd `isLight` branches collapse into that variable set rather than being restyled one by one.
- Window 900 x 600 by default; everything holds at 720 x 440 by collapsing the grid to one column and scrolling inside the pane, never by hiding controls.

Models, one rule: immediate apply when the control is the whole change, Save when several fields make one change.

- General applies immediately. Each control has its own inline status ("saving", "saved" with undo, "not saved, retry" that puts the control back). No global spinner, no disabling of other controls. Storage actions are operations and act at once.
- Hotkeys applies immediately. "saved" means the shortcut is registered with the OS. A recording in progress is the one draft; Esc cancels; the old binding stays live until the new one is accepted.
- Tools keeps Save, per its spec. Variation D (Save everywhere) was rejected because a theme toggle that does nothing until Save is a broken toggle.

General (variation C):

- No scroll at 900 x 600. Application and Window side by side as two panels; Storage, Updates and About as three short panels across the bottom. Rows show the label and the control; the description is the label's tooltip, so labels must carry their meaning alone.
- The bottom panels stack. Storage: the clip count large, "of N clips" beside it, a full-width usage bar against `maxClips` (amber at 90%), then "4 locked" and "212 KB on disk" on one line, refresh link in the header line. Updates: the check-on-start toggle, a status line (dot, one line, one line of detail), then the button. About: version, runtime on two short lines, then release notes, data folder and log links.
- Clips to keep commits on Enter or blur, validates inline (15 to 100), and asks once when the new limit is below the current count, naming the number deleted and that locked clips stay. The three second debounce goes.
- Export, import and clear all data are footer links. Clear all confirms with the counts and size it deletes. `alert()` and `confirm()` go; results are toasts, failures are inline text.
- Updates is one group, and the updater exposes a state enum instead of a display string. On macOS the panel shows a releases link and no button, because the builds are unsigned (see the macOS gotcha).
- Start with the system is hidden on Linux rather than shown disabled. Transparency's two sub-rows are dimmed when transparency is off.

Hotkeys (variation C):

- Master toggle first; off dims the table and blocks recording rather than hiding it.
- A table: action, shortcut, status, on, reset. The keycap is the recorder: click it, press the combination, done. Held modifiers echo live. A press with no modifier shows "needs Ctrl, Shift or Alt" under the keycap. A combination held by another Clipless row blocks acceptance, names the row, and offers swap; an existing duplicate shows a red dot on both rows. OS-reserved combinations (short, hand-maintained, per platform) show an amber line and are accepted.
- Per-row reset appears on hover when the key differs from the default; "reset all to defaults" is a footer link. Defaults come from the same `DEFAULT_HOTKEY_SETTINGS` the main process uses.
- Stored as Electron accelerators; shown as Ctrl / Alt / Shift on Windows and Linux, Cmd / Opt / Shift on macOS. One display function.
- "Quick look on newest clip" replaces "Open Tools Launcher for Latest Clip" at Ctrl+Shift+T (spec section 9). Order: Show Clipless, Quick look, Search clips, Copy clip 1 to 5.

Open (spec 15.8): whether "Code detection" needs a longer label once descriptions are tooltips; the no-scroll fit holds only for today's control count; the contents of the OS-reserved list.

Icons everywhere in these screens are the FontAwesome set the app already registers (`src/renderer/src/fontawesome.ts`); no emoji.
