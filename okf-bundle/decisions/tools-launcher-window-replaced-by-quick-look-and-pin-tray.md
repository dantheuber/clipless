---
type: decision
title: Tools Launcher Window Replaced by Quick Look and Pin Tray
tags:
  - quick-tools
  - launcher
  - ux
  - quick-clips
  - templates
timestamp: 2026-08-22T08:16:36.720Z
status: draft
---

Decision (2026-08-22, spec stage, not yet implemented): the separate Tools Launcher window goes away. Its job moves into the main clips window as three pieces: matched values rendered as clickable chips in each clip row, a quick look reader that shows one clip in full inside the window, and a launch tray under the list that turns the pinned set into tool tabs or template text.

Spec: `docs/specs/quick-look-redesign.md`. Interactive prototype: `docs/specs/quick-look-prototype.html`.

Rationale, from a UX review of the current window ([Tools Launcher](../systems/tools-launcher.md)):

- The common case (one IP, one tool) cost three decisions: tick the value, tick the tool, press Open Tools, with the button disabled until a tool was ticked. The new flow is click the value, click the tool.
- The window showed config-time detail (raw URL templates, "Supports: ip") at launch time and gave no preview of how many tabs would open, while the URL fan-out in `quick-clips.ts` opens one tab per value combination.
- Tool compatibility used "any required group selected" while templates used "every token selected", so multi-token tools could look available and then open nothing. The new rule is "every token pinned" for both.
- A 1000x700 fixed child window positioned off the main window, with keyboard support limited to Esc, was heavier than the decision it served.
- Cross-clip use (ticket from one clip, IP from another) was impossible. Pins are keyed by capture group and value, not by clip, so the tray can combine values from several clips and a template can be copied once all its tokens are pinned from anywhere.

Design rules that came out of the variant rounds and should hold during implementation:

- Every row stays one line at rest. Full content is only shown in quick look, which is DOM inside the main window and is sized from the window content area, never a popover that can leave it.
- Clicking a chip pins; clicking plain text still edits. Chips are not rendered while editing. Pins survive edits if the value is still present anywhere.
- The row's right edge carries only capture-group dots, the lock glyph, and a hover-revealed eye. The cog menu is removed; its actions live in the right-click context menu.
- Opening and closing quick look happen from the same control; Esc always closes; focus returns to the row.
- Anything that opens more than one tab states the count first. Template copies always toast, because a clipboard write has no visible result.
- Clip templates (positional `{c1}` tokens) are not match-driven and stay out of the tray and reader; they belong in the context menu.

Follow-up: the settings window for tools, templates and search terms is getting its own redesign pass to match this vocabulary (capture groups as the shared language, per-group colours, readiness rules). Locked as [Settings for search terms, tools and templates: master-detail inspector](settings-for-search-terms-tools-and-templates-master-detail-inspector.md).
