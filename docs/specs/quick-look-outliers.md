# Quick look redesign: the outliers

Status: superseded 2026-08-22. The rules in section 3 are now section 16.1 of
[quick-look-redesign.md](quick-look-redesign.md), locked, with the same numbering; the open
questions in section 4 are decided in its section 16.2; the engineering follow-through is its
section 17. This file stays as the record of what was reviewed and where it lived in the code at
the time. Prototype: [quick-look-outliers-prototype.html](quick-look-outliers-prototype.html) (open
in a browser; no build step).

Method: every user-facing feature of the clips window was listed from the renderer
(`src/renderer/src`) and the main process (`src/main`) and checked against spec sections 1 to 13
and `quick-look-prototype.html`. Section 1 is the coverage table. Section 2 takes each gap,
says what exists today with file references, what the spec leaves unsaid, and what the prototype
proposes. Section 3 is the list of rules ready to fold into the spec. Section 4 is what is still
open.

## 1. Coverage

Line numbers were re-checked against the source on 2026-08-22; corrections are in the "Where it
lives" column. The "Now in the spec" column points at the section of quick-look-redesign.md that
covers the feature.

| Feature today | Where it lives | Now in the spec | Was the gap |
| --- | --- | --- | --- |
| Search and filter bar | `components/SearchBar.tsx:20-25`, `providers/clips/index.tsx:163-185` | 16.1 rules 2, 3, 4; 16.2 (position) | Position in the bottom stack, behaviour with chips, pins and the reader, keyboard handoff, Esc order. See 2.1 |
| Status bar buttons: search, tools launcher, settings | `components/StatusBar.tsx:36-44, 65-90` | 16.1 rule 5 | Rocket's replacement, search on-state, settings. See 2.2 |
| Update banner | `components/UpdateBanner.tsx`, after search, before status (`App.tsx:22-24`) | 16.1 rule 1; 17.2 (updater state) | Fourth strip under the list. See 2.3 |
| Image clips: thumbnail, hover popover, lazy full image | `clip/ImageClip.tsx:52-86` (popover), `:118-133` (portal), `:30-50` (lazy load) | 16.1 rule 6; 17.6 | Reader for images; popover breaks the "inside the window" rule. See 2.4 |
| HTML and RTF clips: type label plus raw source | `clip/HtmlClip.tsx:13-18`, `clip/RtfClip.tsx:14-19` | 16.1 rule 6; 16.2 (extraction); 17.4 | What to scan, what to show. See 2.4 |
| Bookmark clips: title and URL, read only | `clip/BookmarkClip.tsx:14-21` | 16.1 rule 6 | Chips on the URL; the reader. See 2.4 |
| Only text clips are editable | `clip/TextClip.tsx:80-86` | 16.1 rule 6 | Enter on a non-text row. See 2.4 |
| Clip templates (positional `{c1}` tokens) | Launcher window only, `QuickClipsScanner.tsx:444-463, 643-664` | 16.1 rule 10; 16.2 (`{c1}`) | The launcher goes, so the feature has no screen. See 2.5 |
| New clip insertion, locked slots, rotation | `providers/clips/state.ts:151-169`, `utils.ts:68-83` | 16.1 rule 7; 17.1 (identity, pruning) | Reader and pins while the list moves. See 2.6 |
| Copied-clip marker (green `clipboard-check` in the number cell) | `clip/ClipWrapper.tsx:91`, colour `Clip.module.css:82-84`, index at `providers/clips/index.tsx:67` | 16.1 rules 7, 8; 17.1 | Keep it; tie the reader's copy to it. See 2.7 |
| OS notifications on copy and on template text | `main/notifications/index.ts`, `clipboard/ipc.ts:108-110, 162-177`, `hotkeys/actions.ts:76` | 16.1 rule 8; 17.7 | Two notices for one action. See 2.7 |
| Row 1 cannot be locked or deleted | `state.ts:28-34, 63-69, 86-94`; `storage.ts:48, 56-58` | 16.1 rule 9 | Disabled state and its reason. See 2.8 |
| No minimum window size | `main/window/creation.ts:156-250` (no `minWidth` anywhere in `src/main`) | 16.1 rule 11; 14.8 (settings minimum) | Narrow widths. See 2.9 |
| Light theme, transparency, opaque when focused | `providers/theme.tsx:32-51`, `main/window/settings.ts:14-69` | 16.1 rule 12; 16.2 (contrast pass); 17.8 (variable set) | Light theme for chips, tray, reader. See 2.10 |
| Global hotkeys: show window, copy 1 to 5, launcher, search | `main/hotkeys/actions.ts:23-48, 53-80, 142-161, 173-195` | 16.1 rule 3; 17.2 (rename), 17.3 (hotkey body) | Hotkey while a filter is active. See 2.11 |
| Search bar reset when the window hides | `providers/clips/index.tsx:151-160` | 16.1 rule 13; 12 | Pins and reader across a hide. See 2.12 |
| Delete empties the row in place | `state.ts:28-41` | 16.1 rule 14 | Name versus behaviour. See 2.13 |
| Virtualised list, hidden scrollbar | `clips/Clips.tsx:22-27` (`@tanstack/react-virtual`), `Clips.module.css:8-19` | 17.1 (focus return) | Implementation note only. See 2.13 |
| Clip row: one line, cog menu, context menu, number cell copy, lock glyph, pattern badge | `clip/*`; badge at `ClipWrapper.tsx:96-103` | 2, 4; 17.6 | None |
| Inline edit: Enter commits, Shift+Enter newline, Esc cancels, debounced live save | `clip/TextClip.tsx:55-118` (500ms at `:66`) | 4; 17.8 (live save goes) | None, but note the 500ms live save fires before Esc can revert |
| Syntax highlighting in the editor, language detection | `clip/SyntaxHighlightedCode.tsx`; detection at capture in `providers/clips/utils.ts:15-30` | 4, 5 | None |
| Empty rows padded to max clips | `utils.ts:68-83` | 5 | None |
| Duplicate guard against the top clip | `state.ts:102-122` | Unaffected | None |
| Tray icon menu: Show, Settings, Quit | `main/tray.ts:16-42` | Unaffected | None |
| Settings window | sections 14 and 15 | Covered | None |

## 2. The outliers

### 2.1 Search and filter bar

Today. The bar is hidden until the status bar button or Ctrl+Shift+F toggles it
(`StatusBar.tsx:65-74`, `hotkeys/actions.ts:142-161`). It sits above the status bar
(`App.tsx:18-24`: list, search, update banner, status). It filters by case-insensitive substring
on content (bookmarks also on title and URL), always excludes image clips, keeps each row's real
number, and shows "No clips match" when nothing matches (`providers/clips/index.tsx:163-185`,
`Clips.tsx:16-37`). Escape in the input clears the term and hides the bar (`SearchBar.tsx:20-25`).
The bar is hidden and cleared whenever the window hides (`index.tsx:151-160`). Search hits are not
highlighted in the rows.

The spec. Section 6 says the tray "survives scrolling, filtering, and quick look opening and
closing". That is the only mention. Not said: where the bar goes once the tray exists, whether the
reader walks the filtered rows or all of them, what the reader shows when a filter change hides the
open clip, which Esc wins when the reader and the filter are both active, how focus moves from the
input to the rows, and whether the single-letter reader keys (`p`, `e`, `c`, `t`, `w`) can collide
with typing.

Proposed (prototype frame 2). The contract stays. Additions: hits get a soft `mark` so they never
look like chips; chips stay clickable in filtered rows; the count line reads "3 of 8" and names what
was not searched ("1 image not searched"); a "pinned" toggle shows only clips that contain a pinned
value, which is the cross-clip case the tray exists for; hiding the bar always clears the filter so
an invisible filter cannot persist. Keyboard: `/` from a row opens search; Down or Enter in the
input focuses the first visible row; Down past the last row returns to the input when the bar is
under the list; Esc is one stack, innermost first (context menu, edit, reader, filter text, search
bar). Reader keys are only live while the reader has focus, so they never reach the input.

Reader and filter: the position slot reads "2 / 3 filtered"; Up and Down walk the visible set. If
the filter changes and hides the open clip, the reader stays on it, the slot reads "hidden by
filter", and Up and Down jump to the nearest visible clip.

Alternative shown in frame 1: the bar under the title bar, like a find bar. It frees the bottom but
moves the input away from the button that opens it, and the first result is then hidden behind the
bar when the list is scrolled to the top. Leaning bottom.

### 2.2 Status bar buttons

Today. Three 28px buttons at the right: search toggle (with an on-state), rocket "Open Tools
Launcher" (always on clip 1's content, `StatusBar.tsx:36-44`), settings. Left side: "N / max clips"
and "k locked" when any are locked (`StatusBar.tsx:48-62`).

The spec. The prototype status bar shows the counts and a "Space: quick look" hint, no buttons.
Section 2 removes the launcher window but does not say what the rocket becomes.

Proposed (every frame). Keep three buttons: search (on-state while the bar is open), quick look on
the newest clip (the rocket's replacement, same action as Ctrl+Shift+T), settings. Counts as today;
in narrow windows they drop their words (clipboard icon "8/25", lock icon "1"). The hint text goes;
the buttons carry their hotkeys in tooltips. Icons are the FontAwesome set the app already
registers (`fontawesome.ts`: magnifying-glass, lock, clipboard, clipboard-check, screwdriver-wrench,
circle-arrow-up, xmark, trash, copy); the eye for quick look is the one addition, from the same set.
No emoji anywhere.

### 2.3 Update banner and the bottom stack

Today. When an update has downloaded, a banner slides up between the search bar and the status bar
with "Version X available", "Restart now" and a dismiss (`UpdateBanner.tsx`, `UpdateBanner.module.css:1-27`).
Dismissal is component state and resets on the next push.

The spec. Not mentioned. With the tray, the worst case is four strips under the list: tray, search,
banner, status. In a 300px window that leaves less than half the height for rows.

Proposed (frame 1). Stack order from the bottom: status bar, search bar, tray, list. The update
becomes a pill in the status bar (the circle-arrow-up icon, "1.9.0 ready", "Restart") rather than a strip; it is the one
status the window needs to carry for days, and a pill survives a short window. In a window under
360px tall the tray opens collapsed to one line: "Launch tray · 3 values: ip x2, ticket · Open all
(4 tabs) · expand". That also answers spec open question 12.3 (collapse versus internal scroll):
collapse by default on short windows, scroll internally when expanded.

### 2.4 Image, HTML, RTF and bookmark clips

Today. Image rows show a 28px thumbnail, "Image (PNG)" and a size; hovering portals a 320px preview
over the list, clamped to the viewport, and lazy-loads the full image from the image store
(`ImageClip.tsx:30-86`). HTML and RTF rows show a grey type label and the raw source as text
(`HtmlClip.tsx:13-18`, `RtfClip.tsx:14-19`). Bookmark rows show "Bookmark: title - url" and are not
clickable (`BookmarkClip.tsx:14-21`). None of the four is editable; only `TextClip` has an editor.
Pattern scanning today runs on `clip.content`, which for HTML and RTF is the markup.

The spec. The row (4) and the reader (5) are written for text: line gutter, syntax colouring, chips
in the text, edit in place. "Enter enters edit" has no answer for a row that cannot be edited. The
tools-launcher decision says full content is shown only in quick look, inside the window, which
the hover popover breaks.

Proposed (frame 3).

- Images: the row shows the thumbnail, a format tag and "1280 × 720 · 412 KB". The reader fits the
  image to the content pane on a checkerboard; the side column lists format, pixels, size and
  where it is stored; edit and wrap are greyed with a reason in the tooltip; copy works and loads
  the full image as today. The hover popover goes. No chips, no dots, no pins; the eye still shows
  on hover so the reader is reachable.
- HTML and RTF: the row shows a type tag and the extracted text, not the markup. Scanning runs on
  the extracted text so chips land on values, not inside tags. The reader has a text view (chips,
  pins, gutter) and a source view (no chips, no pins, side column says why); HTML also has a
  rendered view. Extraction needs a small main-process helper for each format; today neither
  exists.
- Rendered HTML is hostile input. Anything can land on the clipboard, including a page fragment
  with scripts, a tracking pixel, an overlay or a `javascript:` link, so the rendered view must
  never execute code or touch the network. Rules, all of them, not a choice of one:
  - The source is parsed with an inert parser (`DOMParser`, or the sanitiser in the main process).
    It is never assigned to `innerHTML` of the live window, not even briefly.
  - An allowlist keeps formatting tags only (p, br, headings, lists, b, i, em, strong, code, pre,
    blockquote, table cells, span, div, a). `script`, `style`, `iframe`, `object`, `embed`, `link`,
    `meta`, `base`, `svg`, `math`, `form` and every input, `video`, `audio` and `img` are removed;
    an image leaves a "[image removed]" marker. Unknown tags are unwrapped, their text kept.
  - Every attribute is dropped except `title` and, on `a`, an `href` that starts with `http:`,
    `https:` or `mailto:`. No `style`, no `class`, no `id`, no `on*`, no `data-*`.
  - The result renders inside an `iframe` with an empty `sandbox` attribute (no scripts, no forms,
    no popups, opaque origin), `referrerpolicy="no-referrer"`, and a `Content-Security-Policy` of
    `default-src 'none'; style-src 'unsafe-inline'` so that even a sanitiser miss cannot load or
    run anything. Links inside the frame are inert; the URL is a chip in the text view and goes
    through the tray like any other.
  - The side column lists what was removed, so a clip that was cut down says so instead of looking
    incomplete. Text stays the default view; rendered is opt-in per open.
  The prototype's frame 3 carries a clip built to test this (script, `onerror` image, frame,
  page-hiding stylesheet, fixed overlay, `javascript:` link). The same rules apply to any future
  "rendered" view for RTF or Markdown.
- Bookmarks: the row shows a "link" tag, the title plain and the URL as a `url` chip. The reader
  shows title and URL on two lines. Scanning runs on title plus URL, as search does today.
- Enter on a non-text row opens the reader instead of an editor. Clicking the line on a non-text
  row does nothing (cursor stays default).
- Text search still skips images, and the count line says so.

### 2.5 Clip templates lose their only screen

Today. Templates with only positional tokens (`{c1}` is row 1, `{c2}` row 2, and so on,
`main/storage/templates.ts:95-98`) appear only in the launcher window's "Clip Templates" accordion
(`QuickClipsScanner.tsx:437-464`). There is no other way to run one.

The spec. Section 4: "Clip templates get a 'Fill template' submenu here in a later pass; not part of
this spec." Section 7 and the decision keep them out of the tray and the reader. Removing the
launcher before the later pass strands the feature.

Proposed (frame 5). Ship the submenu with the redesign, not after it: "Fill clip template" in the
context menu on every row, listing each positional template with a preview filled from rows 1, 2,
3 and the usual copy toast. Which row was right-clicked does not matter because `{c1}` is row 1 by
definition. Whether `{c1}` should instead mean "the row I clicked" is open (section 4); it would be
a behaviour change to the template engine.

### 2.6 The list moves: new clips, rotation, locked slots

Today. A copy in any app inserts at row 1 and shifts every unlocked clip down; locked clips hold
their index; the last unlocked clip falls off when the list is at max (`state.ts:151-169`,
`utils.ts:68-83`). Deleting empties the row in place. The hotkey copy marker points at an index, not
a clip.

The spec. Section 6 drops pins that vanish after an edit. Nothing on pins whose clip rotated out or
was deleted, on a reader that is open when row numbers change, or on the marker.

Proposed (frame 5). The reader tracks a clip, not an index: when a new clip lands, the header
renumbers in place (with a short flash) and the walk continues from the same clip; when the open
clip rotates out, the reader closes with a toast. Pins whose value no longer appears in any clip
are dropped with the tray notice from section 6, and the notice says why: "after the edit",
"deleted with clip 4", "rotated out of the list". The copied marker follows its clip too.

### 2.7 Copy feedback: marker, toast, OS notification

Today. Clicking the number cell copies the clip, turns the cell into a green tick until the next copy
(`ClipWrapper.tsx:91`), and fires an OS notification "Clip N copied to clipboard" if notifications
are on (`clipboard/ipc.ts:108-110`). Hotkey copies do the same from the main process
(`hotkeys/actions.ts:76`). Generating template text fires "Template Generated" (`ipc.ts:170-175`).

The spec. Section 7 makes the toast mandatory for template copies. With the notification still
wired, a template copy would notify twice.

Proposed. Number cell and reader copy set the tick as today and show a toast. The OS notification
fires only for hotkey copies, because the window may be hidden and a toast would not be seen. The
"Template Generated" notification goes; the toast replaces it.

### 2.8 Row 1

Today. Row 1 cannot be locked, emptied or (in the custom context menu) sent to the launcher
(`state.ts:28-41, 63-69`, `ClipContextMenu.tsx:117-154`). It is always the insertion target and the
duplicate guard's reference.

The spec. Section 4 lists Copy, Quick look, Lock/Unlock, Delete with no exception.

Proposed (frame 5). Lock and Delete are disabled on row 1 with the reason beside them ("row 1 is the
live clipboard"). Quick look, chips and pins work on row 1 like any row; the old restriction on
scanning row 1 has no reason to survive.

### 2.9 Narrow windows

Today. No `minWidth` or `minHeight` (`creation.ts:156-249`). A 380px strip beside a browser is a
real layout.

The spec. Frames at 900 x 520 and 700 x 300; the reader's side column is 220px (170px in the short
frame) and the tray row is a three-column grid.

Proposed (frame 4). Under about 480px wide: the status bar shows counts only; tray groups stack
(name, values, tools on their own lines) so tool buttons stay full size; the reader's matches
column folds under the content as a strip that opens on click; the reader header keeps every
button and drops the size text; the search bar hides its count line.

### 2.10 Light theme and transparency

Today. The clips window has a complete light theme (`isLight` branches in every component,
`theme.tsx`), transparency with "opaque when focused" (`window/settings.ts:14-69`), and the native
window background follows the theme to avoid a white flash (`window/background.ts`).

The spec. Section 4 wants chip colours that pass contrast on both themes; the prototype and section
15 are dark only and leave the settings light theme open (15.8).

Proposed (theme button at the top of every prototype, including the quick look, settings Tools
and settings shell pages, which were dark only until this pass). The clips window keeps its light
theme. Group colours get a second set for light backgrounds (same hues, darker: `#b91c1c` for ip
and so on); everything else maps through the same variables as dark, and a frame sets its own
`color` so nothing inherits a dark-theme value from the page. Transparency needs no design change:
the dimmer and the reader are inside the window and fade with it. Spec 15.2 now says both themes;
the former open question in 15.8 is closed.

### 2.11 Hotkeys while a filter is active

Today. Ctrl+Shift+T reads the live clipboard and opens the launcher; Ctrl+Shift+1 to 5 copy by index
(`hotkeys/actions.ts:53-80, 173-195`).

The spec. Section 9 opens quick look on the newest clip. Not said: what happens when a filter hides
row 1.

Proposed. The hotkey opens row 1; if a filter hides row 1, the filter is cleared first and a toast
says so. Copy 1 to 5 keep indexing the real rows, which is what the row numbers show even when
filtered.

### 2.12 Window hide

Today. Hiding the window clears and hides the search bar (`index.tsx:151-160`).

The spec. Open question 12.2 leans against persisting pins across restarts.

Proposed. Hide clears the search bar as today. Pins, the tray and an open reader survive a hide
(the user often hides the window to go read the tab it opened) and are lost on quit.

### 2.13 Smaller items

- Delete. Today's "empty" replaces the row with an empty clip and shifts nothing
  (`state.ts:36-38`). The spec calls the item Delete. Keep the behaviour (locked-slot logic depends
  on indices staying put) and keep the name; the reader and Up/Down skip empty rows so the hole is
  not visible in the walk. If removal-and-shift is wanted, that is a separate decision.
- Virtualisation. The list is virtualised (`Clips.tsx:22-27`); a row the reader returns focus to may
  be unmounted. Implementation: scroll the row's index into view first, then focus.
- Inline edit. Today's 500ms live save means Esc may not fully revert (`TextClip.tsx:55-69,
  110-117`). The spec says "Esc cancels"; the live save should go or Esc should restore the
  pre-edit content explicitly.
- Hotkeys are off by default (`defaults.ts:5`). The quick look hotkey in section 9 only helps users
  who turned them on; the status bar button in 2.2 is the path for everyone else.
- The native context menu hook (`useNativeContextMenu.ts`) is dead code; the React menu is what
  ships. The spec's menu can be built on either; the prototype assumes the React one.

## 3. Rules to fold into the spec

Numbered to match the "Proposed rules" list at the foot of the prototype.

1. Stack order from the bottom: status bar, search bar, tray, list. The update is a status bar
   pill, never a strip. Under 360px tall the tray opens collapsed to one line.
2. Search keeps its contract (substring, images excluded, real row numbers, "No clips match").
   Hits get a soft mark; chips stay chips and stay clickable. The count line names what was not
   searched. A "pinned" toggle filters to clips containing a pinned value. Hiding the bar clears
   the filter.
3. The reader walks the visible set and says "n / m filtered". A filter change that hides the open
   clip leaves the reader on it with "hidden by filter"; Up and Down jump to the nearest visible
   clip. The quick look hotkey opens row 1, clearing a filter that hides it.
4. Esc is one stack: context menu, edit, reader, filter text, search bar.
5. Status bar buttons: search (on-state), quick look on the newest clip, settings.
6. Types: images get a fitted viewer with no chips, no edit, no wrap, and lose the hover popover;
   HTML and RTF scan and show extracted text, with source (and rendered for HTML) views that have
   no chips; bookmarks show the title plain and the URL as a chip. Enter on a non-text row opens
   the reader. Rendered HTML never runs code: inert parse, tag and attribute allowlist, sandboxed
   iframe with `default-src 'none'`, removed elements listed beside it.
7. The reader tracks a clip, not an index. Pins are dropped with a reason when their value leaves
   every clip by edit, delete or rotation. The copied marker follows its clip.
8. Copy feedback: tick plus toast in the window; OS notification only for hotkey copies; the
   template notification goes.
9. Row 1: Lock and Delete disabled with the reason shown; everything else works.
10. Clip templates: "Fill clip template" submenu in the context menu, shipped with the redesign.
11. Under 480px wide: counts-only status bar, stacked tray groups, folded matches column, full
    header.
12. Light theme stays, in the clips window and in settings, with a light set of group colours; every
    prototype shows both.
13. Hide clears search; pins, tray and reader survive a hide and not a quit.
14. Delete keeps today's empty-in-place behaviour and name.

## 4. Open questions

All six were decided on 2026-08-22; the decisions and their reasons are in section 16.2 of
[quick-look-redesign.md](quick-look-redesign.md). In short: the search bar sits under the list;
`{c1}` stays row 1; extraction is real and runs in the main process; the "pinned" toggle stays;
the reader closes when its clip rotates out; the contrast pass ran and fixed three light values in
the bucket (lime, orange, and the twelfth slot, which had no light value).
