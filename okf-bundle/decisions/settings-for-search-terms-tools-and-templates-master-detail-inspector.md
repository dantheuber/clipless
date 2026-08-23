---
type: decision
title: "Settings for search terms, tools and templates: master-detail inspector"
tags:
  - ux
  - quick-clips
  - quick-tools
  - templates
  - settings
timestamp: 2026-08-22T20:25:07.199Z
status: stable
---

Decision (2026-08-22, locked in the spec, not implemented): Settings > Tools, where search terms, tools and templates are made, becomes a master-detail inspector built on the capture group vocabulary of the quick look redesign. Spec: `docs/specs/quick-look-redesign.md` section 14. Prototype: `docs/specs/settings-tools-prototype.html`. The five variations that led here (A tabs plus groups rail, B groups first, C flow board, D sample-first workbench, E inspector) and a review of the current settings code are in `docs/specs/settings-redesign-variations.html`; E was chosen on review.

Shape: a list pane of every search term, tool and template (health dot, name, swatch strip of the groups it produces or needs) and an inspector with Edit and Uses. Edit has the sample text pinned above the editor and previews live: chips for a term, every resolved URL and the exact tab count for a tool, generated text for a template. Uses is the relationship view for one item in both directions, with the fix next to any token nobody produces (enable the disabled producer, add the library pattern for that group, new term prefilled with the group). Nothing selected shows a health overview of every group. New search terms start from the library ("start from" cards with already-added state) or blank. Export and import are footer links; import previews counts and offers merge or replace.

Colour belongs to the capture group and nothing else:

- A bucket of twelve fixed colours (the prototype's six plus six more) that pass contrast on both themes. No hex input.
- Defaults: the prototype colours for `ip`, `email`, `ticket`, `domain`, `url`, `user`; any other group takes the next free colour when it first appears. The picker is for overriding.
- A swatch another group uses is marked and named on hover. Sharing is allowed, never silent.
- Stored as a `groupColours` map keyed by group name alongside search terms, exported with the config, dropped when the group disappears. Keying on the term would be wrong: one group can come from two terms, one term can produce two groups.
- The template pill's yellow and the tool pill's grey are type colours and stay out of the bucket.

Rules that came out of the variant rounds and must hold in implementation:

- Tokens are picked from groups that have a producer. A typed token nothing produces is an orphan: wavy red in the preview, "never ready" on the readiness line. Four readiness wordings, never merged: never ready (red), needs X with producer disabled (amber), sample lacks X (grey, readiness line only), ready on the sample (green). List dots reflect config readiness only.
- The library never runs on its own; adding copies a pattern in as a normal term with an enabled toggle; adding a disabled duplicate re-enables it. One `BUILTIN_PATTERNS` definition, group names in the new vocabulary. `QuickClipsManager.tsx` is dead code and goes.
- Nothing is stored until Save; Cancel leaves no record; Save is disabled while invalid. Delete names dependents.
- Clip templates (positional `{c1}` tokens) are labelled as such and never shown as match-driven.
- The scan that powers settings previews is the same scan the clip list uses for chips, so the two cannot disagree.

Planned additions from D, not in the prototype: the tray preview under the sample in the overview, a Problems filter on the list pane, library suggestions driven by the sample at the top of "start from".

Open: where the sample text persists (per user, not exported; defaults to the newest clip), the fate of the pipe form `{a|b}`, narrow-window collapse below 720px, and whether the tray in the clips window should offer the colour bucket (leaning no).

Next pass, done as a draft: the General and Hotkeys tabs take the same shell. See [Settings shell, General and Hotkeys](settings-shell-general-and-hotkeys-left-rail-immediate-apply-keycap-recorder.md) and `docs/specs/settings-shell-variations.html`.
