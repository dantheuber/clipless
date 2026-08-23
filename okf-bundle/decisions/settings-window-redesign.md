---
type: decision
title: "Settings window redesign: left rail, Tools inspector, immediate apply"
tags:
  - ux
  - settings
  - quick-clips
  - quick-tools
  - templates
  - hotkeys
status: stable
generated:
  by: claude-code/fable-5
  at: 2026-08-23T16:42:38.909Z
sources:
  - id: spec
    title: docs/specs/quick-look-redesign.md (sections 14 and 15)
    resource: https://github.com/dantheuber/clipless/blob/main/docs/specs/quick-look-redesign.md
  - id: variations
    title: docs/specs/settings-redesign-variations.html and
      docs/specs/settings-shell-variations.html
    resource: https://github.com/dantheuber/clipless/blob/main/docs/specs/settings-redesign-variations.html
---

Decided 2026-08-22, shipped 2026-08-23 in 1.9.0 with the [quick look redesign](tools-launcher-window-replaced-by-quick-look-and-pin-tray.md). The settings window was rebuilt as one product: a left rail with General, Hotkeys and Tools, the Tools tab a master-detail inspector over the capture-group vocabulary, General and Hotkeys applying each change at once. Spec sections 14 and 15.[^spec] Prototypes: `docs/specs/settings-tools-prototype.html`, `docs/specs/settings-shell-variations.html` (variation C).

## Why these shapes

- **Tools is an inspector** (variation E of five[^variations]): a list pane of every search term, tool and template (health dot, name, swatch strip of the groups it produces or needs) and an inspector with Edit and Uses. Edit keeps the sample text pinned above the editor and previews live (chips for a term, every resolved URL and the tab count for a tool, generated text for a template). Uses shows one item's relationships in both directions with the fix beside any token nobody produces. Tabs-plus-rail, groups-first, a flow board and a sample-first workbench all either hid the relationships or made the sample the whole page.
- **Left rail, not top tabs.** Top tabs would add a strip above every tab and the Tools frame could not drop in unchanged. The app version sits at the bottom of the rail; the separate Versions card went.
- **Immediate apply when the control is the whole change, Save when several fields make one change.** General and Hotkeys apply at once with per-control inline status ("saving", "saved", "not saved, retry" that puts the control back); Tools keeps Save. Save everywhere was rejected because a theme toggle that does nothing until Save is a broken toggle. A hotkey "saved" means the OS registered it; the old binding stays live until the new one is accepted.
- **Colour belongs to the capture group and nothing else.** A bucket of twelve fixed colours with a dark and a light value each, no hex input, stored as `groupColours` (group name to bucket slot) beside the search terms and exported with the config. Keying on the term would be wrong: one group can come from two terms, one term can produce two groups. Sharing a slot is allowed, never silent (the swatch is marked and named). The template pill's yellow and the tool pill's grey are type colours and stay out of the bucket.
- **One variable set, both themes.** Every colour goes through the theme variables and the light theme swaps the set; the forty-odd `isLight` branches collapsed into it rather than being restyled one by one.

## Rules that hold

- Tokens are picked from groups that have a producer. A typed token nothing produces is an orphan: wavy red in the preview, "never ready". Four readiness wordings, never merged: never ready (red), needs X with producer disabled (amber), sample lacks X (grey), ready on the sample (green). List dots reflect config readiness only.
- The library never runs on its own; "Start from" copies a built-in pattern in as a normal term; adding a disabled duplicate re-enables it; "already added" is matched by pattern body. Each card shows the group pill, the name, a short description and the regex.
- Nothing is stored until Save; Cancel leaves no record; Save is disabled while invalid; Delete names dependents. Clip templates (positional only) are labelled as such and never shown as match-driven.
- The scan that powers settings previews is the same `scanText` the clip list uses, so the two cannot disagree (see [Quick Clips](../systems/quick-clips.md)).
- General: no scroll at 900 x 600; labels carry their meaning alone (descriptions are tooltips); Clips to keep commits on Enter or blur, validates 15 to 100 and asks once when lowering below the current count, keeping locked clips; export, import and clear all data are footer links; `alert()` and `confirm()` are gone, results are toasts, failures inline. Updates is a state enum from the main process; on macOS the panel shows a releases link and no button ([unsigned builds](../gotchas/macos-unsigned-builds.md)). Start with the system is hidden on Linux.
- Hotkeys: master toggle first, off dims the table and blocks recording rather than hiding it; the keycap is the recorder; a combination held by another row names it and offers swap; OS-reserved combinations show an amber line and are accepted. Details in [Global Hotkeys](../systems/hotkeys.md).
- Window 900 x 600 by default, resizable, minimum 720 x 440; everything holds at the minimum by collapsing to one column and scrolling inside the pane, never by hiding controls.

## Questions the spec left open, and how they closed

- Sample text persists per user as `UserSettings.toolsSampleText` in `settings.enc`, outside the config export; absent means the newest clip.
- The pipe form `{a|b}`: tool URLs accept it, templates never parse it (token regex is `\w+`).
- The tray in the clips window does not offer the colour bucket; colour is set in settings only.
- "Code detection" kept its label.

## Still not built

- The planned additions from variation D (spec 14.6): a tray preview under the sample in the overview, a Problems filter on the list pane, library suggestions driven by the sample.
- "Clear all data" does not re-register hotkeys in the main process on its own; the settings window re-applies the defaults with an empty commit after it.
- The Hotkeys tab cannot show registrations refused at app start, only those refused by a change.
