---
type: decision
title: "Quick look outliers: search bar, status bar, other clip types, live list"
tags:
  - ux
  - quick-tools
  - quick-clips
  - search
  - templates
  - security
timestamp: 2026-08-22T23:41:02.489Z
status: stable
---

Locked 2026-08-22, not implemented. A review of every user-facing feature of the clips window against the [quick look redesign](tools-launcher-window-replaced-by-quick-look-and-pin-tray.md) found the spec silent on the rest of the window. The review stays at `docs/specs/quick-look-outliers.md` (superseded, kept as the record of what was checked); the rules are now section 16 of `docs/specs/quick-look-redesign.md`, locked, with the same numbering as the prototype `docs/specs/quick-look-outliers-prototype.html`. Engineering follow-through is in [Quick look engineering](quick-look-engineering-pins-shared-scan-groupcolours-slots-hotkey-rename-sanitiser-in-main.md).

The rules, in short:

- Stack from the bottom: status bar, search bar, tray, list. The update is a status bar pill, never a strip. Under 360px tall the tray opens collapsed to one line.
- Search keeps its contract (substring, images excluded, real row numbers, "No clips match"). Hits get a soft mark, never a chip. A "pinned" toggle filters to clips containing a pinned value. Hiding the bar clears the filter. The reader walks the visible set and says "n / m filtered". Esc is one stack: context menu, edit, reader, filter text, search bar.
- Status bar buttons: search (on-state), quick look on the newest clip (replaces the launcher rocket), settings.
- Images get a fitted viewer in the reader, no chips, no edit, no wrap; the hover popover goes. HTML and RTF scan and show extracted text, with source and (HTML) rendered views that have no chips. Bookmarks show the title plain and the URL as a chip. Enter on a non-text row opens the reader.
- Rendered HTML never runs code: inert parse, never assigned to the live document, tag and attribute allowlist, `img` replaced by "[image removed]", iframe with `sandbox=""`, `referrerpolicy="no-referrer"` and CSP `default-src 'none'; style-src 'unsafe-inline'`, removed elements listed beside it, text view the default.
- Clip templates get a "Fill clip template" context menu submenu shipped with the redesign.
- The reader tracks a clip by identity, not index; pins are dropped with a reason (edit, delete, rotation); the copied marker follows its clip.
- Copy feedback: toast in the window; OS notification only for hotkey copies; the "Template Generated" notification goes.
- Row 1 cannot be locked or deleted and the menu says why. Under 480px wide the status bar shows counts only, tray groups stack, the reader's matches column folds. Light theme stays everywhere. Hide clears search; pins, tray and reader survive a hide and not a quit. Delete keeps empty-in-place.
- Icons are the FontAwesome solid set registered in `src/renderer/src/fontawesome.ts`; the eye is the one addition. No emoji.

Decisions on the six open questions (spec 16.2):

- Search bar under the list, next to its button. The find-bar position hides the first result behind the bar when the list is scrolled to the top.
- `{c1}` stays row 1, as the engine defines it (`src/main/storage/templates.ts:95-98`); the settings preview fills from rows 1 to 3 and the submenu is the same on every row.
- HTML and RTF extraction is real and runs in the main process (`htmlparser2` walk for HTML, a hand-written tokenizer for RTF), at capture, stored as `ClipItem.text`. A regex strip would leave entity text, script bodies and style rules for the scanner to chip.
- The "pinned" toggle stays; a tray chip's one click already means remove.
- The reader closes with a toast when its clip rotates out; a frozen copy would offer edit, copy and lock on a clip that no longer exists.
- Contrast pass run with WCAG 2 luminance against the prototype row backgrounds. All twelve dark values pass (3:1 as border on every row, 4.5:1 as text on the panel). The light set had three defects, fixed in `settings-tools-prototype.html`: lime `#6da314` (2.39:1 on the hover row) became `#3f6212`; orange `#b45304` was the same colour as amber `#b45309` and became `#c2410c`; slot 12 `#2dd4bf` had no light value at all and got `#0f766e`. Rule that came out of it: in the clips window a group colour is only a border, dot, swatch or 25% tint behind normal text (3:1 bar); it is used as text only on panel backgrounds (4.5:1 bar).
