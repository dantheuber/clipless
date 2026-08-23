---
type: decision
title: Tools Launcher Window Replaced by Quick Look and Pin Tray
tags:
  - quick-tools
  - launcher
  - ux
  - quick-clips
  - templates
status: stable
generated:
  by: claude-code/fable-5
  at: 2026-08-23T16:42:10.920Z
sources:
  - id: spec
    title: docs/specs/quick-look-redesign.md (sections 1-13, 16, 17)
    resource: https://github.com/dantheuber/clipless/blob/main/docs/specs/quick-look-redesign.md
  - id: pr
    title: "PR #146, released as 1.9.0"
    resource: https://github.com/dantheuber/clipless/pull/146
---

Decided 2026-08-22, shipped 2026-08-23 in 1.9.0 (PR #146).[^pr] The separate Tools Launcher window is gone. Its job lives in the main clips window as three pieces: matched values rendered as clickable chips in each row, a quick look reader that shows one clip in full inside the window, and a pin tray under the list that turns the pinned set into tool tabs or template text. What the launcher was and the file list that went with it: [Tools Launcher (removed)](../systems/tools-launcher.md). How scanning, chips and the tray work now: [Quick Clips](../systems/quick-clips.md). The engineering choices behind it: [Quick look engineering calls](quick-look-engineering-calls.md). The settings window that followed: [Settings window redesign](settings-window-redesign.md).

Spec: `docs/specs/quick-look-redesign.md`.[^spec] Prototypes: `docs/specs/quick-look-prototype.html` and `docs/specs/quick-look-outliers-prototype.html`. `docs/specs/quick-look-outliers.md` is the superseded review of the rest of the window, kept as the record of what was checked.

## Why

- The common case (one IP, one tool) cost three decisions: tick the value, tick the tool, press Open Tools, with the button disabled until a tool was ticked. The new flow is click the value, click the tool.
- The window showed config-time detail (raw URL templates, "Supports: ip") at launch time and gave no preview of how many tabs would open, while the URL fan-out opens one tab per value combination.
- Tool compatibility used "any required group selected" while templates used "every token selected", so multi-token tools could look available and then open nothing. The rule is now "every token pinned" for both.
- A 1000x700 fixed child window positioned off the main window, with keyboard support limited to Esc, was heavier than the decision it served.
- Cross-clip use (ticket from one clip, IP from another) was impossible. Pins are keyed by capture group and value, not by clip, so the tray combines values from several clips.

## Rules that hold

- Every row stays one line at rest. Full content is only shown in quick look, which is DOM inside the list area of the main window (the tray, search bar and status bar stay usable while it is open), never a popover or a window that can leave it.
- Clicking a chip pins; clicking plain text still edits. Chips are not rendered while editing. Pins survive edits if the value is still present anywhere; otherwise they are dropped with a reason (after the edit, deleted with clip N, rotated out of the list, after the search terms changed).
- The row's right edge carries only capture-group dots, the lock glyph and a hover-revealed eye. The cog menu is gone; its actions live in the right-click context menu.
- Opening and closing quick look happen from the same control; Esc always closes; focus returns to the row. The reader tracks a clip by identity, not index, and closes with a toast when its clip rotates out (a frozen copy would offer edit, copy and lock on a clip that no longer exists).
- Anything that opens more than one tab states the count first. Template copies always toast, because a clipboard write has no visible result. Copy feedback is a toast in the window; the only OS notification left is the hotkey copy, because the window may be hidden.
- Clip templates (positional `{c1}` tokens, `{c1}` is row 1) are not match-driven and stay out of the tray and reader; they live in the context menu's "Fill clip template" submenu.
- The window stacks from the bottom: status bar (search, quick look on the newest clip, settings), search bar, tray, list. The search bar sits under the list next to its button because the find-bar position hid the first result when scrolled to the top. Search keeps its contract (substring, images excluded, real row numbers); hits get a soft mark, never a chip; a "pinned" toggle filters to clips containing a pinned value; hiding the bar clears the filter. Esc is one stack: context menu, edit, reader, filter text, search bar.
- Images get a fitted viewer in the reader, no chips, no edit. HTML and RTF scan and show extracted text, with source and (HTML) rendered views that have no chips. Rendered HTML never runs code: sanitised in the main process with an allowlist, `img` replaced by "[image removed]", shown in an iframe with `sandbox=""`, `referrerpolicy="no-referrer"` and CSP `default-src 'none'; style-src 'unsafe-inline'`, removed elements listed beside it, text view the default.
- Row 1 cannot be locked or deleted and the menu says why. Under 480px wide the status bar shows counts only and the reader's matches column folds; under 360px tall the tray opens collapsed. Pins, tray and reader survive a hide and not a quit.
- Group colour is a border, dot, swatch or 25% tint behind normal text in the clips window (3:1 contrast bar) and is used as text only on panel backgrounds (4.5:1 bar). All twelve bucket slots were checked with WCAG 2 luminance against both themes.
- Icons are the FontAwesome solid set registered in `src/renderer/src/fontawesome.ts`; no emoji.
