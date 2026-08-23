# Clips window and tools launcher redesign: quick look

Status: locked 2026-08-22, not implemented. Sections 1 to 16 describe the intended UI and UX;
section 17 is the engineering section an implementer builds from, and
[implementation-plan.md](implementation-plan.md) orders the work. Every open question is closed;
sections 12, 14.8, 15.8 and 16.2 hold the decisions. Sections 1 to 13 cover the clips window and
launch tray; section 14 the Settings Tools tab; section 15 the Settings window shell and its General
and Hotkeys tabs; section 16 the rest of the clips window (search bar, status bar, other clip types,
the live list). Interactive prototypes (open in a browser; no build step):
[quick-look-prototype.html](quick-look-prototype.html) for the clips window,
[settings-tools-prototype.html](settings-tools-prototype.html) for the Tools tab,
[settings-shell-variations.html](settings-shell-variations.html) (variation C) for the shell, General
and Hotkeys.

[index.html](index.html) embeds all four prototypes on one page in the order a user meets them, with
one theme button for the lot.

Section 16 folds in the outliers review, [quick-look-outliers.md](quick-look-outliers.md), whose
prototype is [quick-look-outliers-prototype.html](quick-look-outliers-prototype.html). The review
file stays as the record of what was checked and is superseded by this document.

Rules that hold everywhere: icons are the FontAwesome solid set registered in
`src/renderer/src/fontawesome.ts` (the eye for quick look is the one addition, from the same set),
no emoji; both themes through one variable set swapped per theme, every colour bucket slot carrying a
dark and a light value of the same hue; rendered HTML never runs code (16, rule 6); anything that
opens more than one tab states the count first; every clipboard write toasts.

## 1. Goal

Replace the separate Tools Launcher window with an in-window flow built on the clip list:
matched values are highlighted in each clip, the user pins the values they care about, and a
launch tray turns the pinned set into browser tabs (tools) or clipboard text (templates). A
quick look reader shows any clip in full, inside the main window, with the same pinning.

The old window required: open window, tick values, tick tools, confirm. The new flow for the
common case (one IP, one tool) is: click the IP, click the tool. Everything else is built on
that.

## 2. What goes away

- The Tools Launcher window (`tools-launcher.html`, its own BrowserWindow, 1000x700 fixed).
- The cog options menu on each clip row. Its actions (copy, scan, lock, delete) already exist
  in the right-click context menu, which stays.
- The select-values, select-tools, confirm sequence and the disabled "Open Tools" button.
- Raw URL templates and "Supports: ip" text shown at launch time. Those belong in settings.
- The "any required group present" tool compatibility rule. See section 8.

## 3. Vocabulary

| Term | Meaning |
| --- | --- |
| Search term | A user-configured regex with named capture groups. Unchanged. |
| Capture group | A named group such as `ip`, `email`, `ticket`. The shared vocabulary between search terms, tools and templates. Unchanged. |
| Match | One occurrence of a capture group value in a clip. |
| Chip | The highlighted, clickable rendering of a match in the clip text. |
| Pin | A user selection of a (group, value) pair. Pins are keyed by group and value, not by position or clip, so pinning a value pins every occurrence of it in every clip. |
| Tray | The panel that lists the pinned set grouped by capture group and offers tools and templates against it. |
| Tool | A URL template with `{group}` tokens. Launching opens one tab per combination of pinned values. Unchanged in definition. |
| Template | A text template with `{group}` tokens. Running it copies generated text to the clipboard. Unchanged in definition. |
| Clip template | A template using only positional tokens (`{c1}`, `{c2}`). Not driven by matches; out of scope for the tray and reader. |
| Quick look | The in-window reader for a single clip. |

## 4. Clip row

The list stays a list. Every row is one line, 40px, regardless of content.

Content area:

- Multi-line content is collapsed to one line with whitespace normalised, as today.
- Code clips show a small language tag (`json`, `bash`) at the start of the line. The line
  itself is not syntax coloured.
- Every match is rendered as a chip: dashed outline, group colour, a `+` suffix. A pinned chip
  has a solid outline and a tick. Colour is assigned per capture group by hashing the group
  name into a fixed palette of six to eight colours that pass contrast on both themes.
- Clicking a chip pins or unpins it. It does not enter edit mode.
- Clicking plain text enters inline edit, exactly as today (textarea, syntax overlay for code,
  Enter commits, Shift+Enter newline, Esc cancels). Chips are not rendered while editing.
  Leaving edit re-scans the clip.
- Double-clicking a chip selects its text, for people who want to copy a substring.

Right edge, at rest: one small dot per capture group present in the clip, then the lock glyph
if the clip is locked. No text, no buttons.

Right edge, on hover or keyboard focus: an eye icon appears. Clicking it opens quick look.
The eye stays lit while its clip is open in quick look.

Number cell: click copies the clip to the clipboard, as today.

Context menu (right-click): Copy, Quick look, Lock/Unlock, Delete. "Scan" becomes "Quick look".
Clip templates get a "Fill template" submenu here in a later pass; not part of this spec.

Rows are keyboard focusable. Up/Down move focus, Space opens quick look, `p` pins every chip
in the row, Enter enters edit.

## 5. Quick look

A reader drawn inside the main window, over a dimmed list. It is not a separate window and it
never extends past the window content area.

Open: eye icon on a row, Space on a focused row, the context menu, or the global hotkey (see
section 9).

Close: Esc, the x in the header, or clicking the dimmed area. Focus returns to the row it was
opened from.

Sizing: inset from the window content area (roughly 4% left and right, below the title area,
above the status bar). Header and footer are fixed height; the body takes the rest and scrolls.
At small window sizes the footer drops its hints and the side column narrows. There is no
minimum window size at which quick look is disabled.

Layout:

- Header: previous and next clip buttons (greyed at the ends), clip number, language tag, line
  count and size, position ("5 / 6"), then pin all (with a "pinned/total" count and an
  on-state when everything is pinned), copy clip, edit, wrap, close.
- Body, left: the full clip with a line-number gutter, syntax colouring for code clips, chips
  on every match. Lines containing a match are faintly tinted. Horizontal scroll with the
  gutter sticky, or wrapped when wrap is on. Wrap is remembered for the session.
- Body, right: the clip's matches grouped by capture group in order of first appearance. Each
  group has its colour swatch, a count, and a "pin all" link for that group. Each value is a
  chip (same pinned styling as in the text) with an "xN" count if it occurs more than once.
  Hovering a value outlines every occurrence in the text and scrolls the first into view;
  hovering a chip in the text lifts its entry in the column. There is no separate "pinned"
  list; pinned state is visible on the chips themselves.
- Footer: keyboard hints, the templates strip (section 7), the pinned count, and a Launch
  button that states the tab count.

Edit inside quick look: the edit button (or `e`) swaps the content pane for the existing
editor at the same size. Esc leaves edit and keeps the reader open; a second Esc closes it.
Committing updates the clip, re-scans, and re-renders the reader in place.

Walking clips: Up and Down (and the header arrows) move to the previous or next clip with
content without closing the reader. Pins persist across the walk.

Keyboard while open: Up/Down clips, `p` pin all, `t` copy first ready template, `e` edit,
`c` copy clip, `w` wrap, Esc close, Tab cycles the reader's controls and stays inside it.

## 6. Launch tray

Lives under the list, above the status bar. Hidden when nothing is pinned; appears as soon as
one value is pinned. Survives scrolling, filtering, and quick look opening and closing.

Contents:

- Header: "Launch tray", total pinned count, a "clear" action.
- One row per capture group that has pins: the group name and colour, the pinned values as
  removable chips, and one button per compatible tool. A tool button carries a multiplier
  when the group has more than one pinned value ("VirusTotal x2") and opens that many tabs.
- Footer: the template line (section 7) and "Open all (N tabs)", where N is the exact number
  of tabs that will open.

Every control that opens more than one tab states the count before it is clicked. Opening
tabs uses the existing `shell.openExternal` path.

Pins and edits: when a clip is edited, pins whose value no longer appears in any clip are
dropped and the tray shows a one-line notice naming them.

## 7. Templates

Templates with named tokens appear in two places: the tray footer and the quick look footer.
The rules are the same in both.

- Ready: every token the template needs has at least one pinned value, from any clips. Shown
  as a solid pill. Clicking it generates the text with the existing template engine, copies
  it to the clipboard, and shows a toast naming the template, the character count, and the
  values used. `t` in quick look copies the first ready template.
- Not ready: shown dimmed with the missing tokens named ("needs ticket"). In quick look, if
  the clip being read contains values for every missing token, clicking the dimmed pill pins
  them (first occurrence of each) and the pill becomes ready; a toast says what was pinned.
  If the clip lacks them, the pill is inert and its tooltip names only the tokens this clip
  lacks and says to pin them from another clip.
- One value per token: with several pinned values in a group, the template uses the first
  pinned and says so in the tooltip and the toast ("ip 203.0.113.42 (first of 2)"). Unpin to
  change. There is no disabled-with-warning state.
- Copy is a clipboard write with no visible result, so the toast is mandatory.
- Templates never count toward tab totals.
- Clip templates (positional tokens only) do not appear in the tray or quick look.

## 8. Tool compatibility

A tool is offered for a group only if every token in its URL has a pinned value. This is the
rule templates already use. For single-token tools nothing changes; for multi-token tools it
removes the case where a tool appears available and then silently opens nothing.

## 9. Global hotkey

Ctrl+Shift+T (Cmd+Shift+T on macOS, configurable as today) brings the main window forward and
opens quick look on the newest clip. If the live clipboard differs from the newest stored
clip, the live content wins, as it does today. There is no separate launcher window to open.

## 10. Highlighting rules

- Only enabled search terms with named capture groups produce chips. Nothing is highlighted
  that the user did not configure.
- Colour is per capture group, not per search term.
- The collapsed line, the quick look content, and the editor overlay (code clips) all derive
  from the same scan; positions come from the regex match indices.
- A clip with no matches has no chips, no dots, and no eye at rest; quick look still opens
  from the context menu or Space and works as a plain viewer.

## 11. Out of scope

- The settings window for creating and editing tools, templates and search terms is covered
  by section 14; the window shell and the General and Hotkeys tabs by section 15.
- Storage format, IPC shape, and the implementation of any of the above.
- Tool icons or favicons. Tools are identified by name.
- Multi-group "correlate" tools beyond the compatibility rule in section 8.
- Playbooks (saved tool sets). A possible later addition to the tray.

## 12. Decisions on the open questions

Closed 2026-08-22 while writing sections 16 and 17. Each keeps the prototype's behaviour unless a
reason says otherwise.

- The eye shows on hover and keyboard focus only, as the prototype does. The dots already say a
  row has matches, and a button on every row would undo the "no text, no buttons" right edge of
  section 4.
- Pins do not persist across restarts. They survive a hide and are lost on quit (16, rule 13). A
  tray that appears on launch for values pinned last week is the one thing the user did not ask for.
- Tray height: under 360px tall the tray opens collapsed to one line; otherwise it scrolls
  internally at 34% of the window height (16, rule 1).
- Wrap is one per-session setting, off by default. A per-type default would flip the wrap button
  under the user while walking from prose to code with Up and Down.

## 13. Acceptance minimums

- No Tools Launcher window exists. The hotkey and the scan/quick look context menu item open
  quick look in the main window.
- Every row is one line at rest. No row changes height except during inline edit, as today.
- Chips render in the line and in quick look for every enabled search term match, coloured by
  capture group, and clicking a chip never enters edit mode.
- The right edge of a row shows only group dots, the lock glyph, and a hover-revealed eye.
- Quick look stays within the window at any window size, scrolls its content, shows grouped
  matches with per-group pin all, walks clips with Up/Down, edits in place, and closes with
  Esc returning focus to the row.
- The tray appears on the first pin, groups by capture group, shows multipliers and an exact
  tab count, and offers ready templates with a copy toast.
- Templates show ready and not-ready states in both the tray and quick look, with the
  click-to-pin shortcut in quick look.
- Tools with more than one token are offered only when every token is pinned.

## 14. Settings: the Tools tab

Status: locked 2026-08-22, not implemented. Prototype:
[settings-tools-prototype.html](settings-tools-prototype.html), which also carries the review of
the current settings code that drove this. Five variations were explored (tabs plus a groups rail,
groups first, a flow board, a sample-first workbench, a master-detail inspector); the inspector
was chosen.

### 14.1 Goal

One place to make the three things the clips window consumes (search terms, tools, templates) in
the vocabulary of section 3, so that a tool is never configured with a token nothing produces, and
the user sees, before saving anything, what a term will highlight, which URLs a tool will open,
and what text a template will copy. The sub-tabs, the Test Patterns tab, and the separate
template manager go away.

### 14.2 Vocabulary additions

| Term | Meaning |
| --- | --- |
| Producer | A search term whose pattern contains a given named group. |
| Consumer | A tool or template that uses a given group as a token. |
| Orphan | A group some tool or template needs that no search term produces. |
| Group colour | The colour a group renders in everywhere: chips, tray rows, pills, previews. Per group, never per term, tool or template. |
| Bucket | The fixed set of twelve group colours the user can choose from. |
| Sample text | User-editable text in settings that every preview runs against. |
| Library | The built-in pattern list. Copied in as search terms; never runs on its own. |
| Readiness, config | Whether every token a tool or template needs has an enabled producer. Shown on list dots and cards. |
| Readiness, sample | Whether the sample text has a value for every token. Shown on the readiness line only. |

### 14.3 Layout

The Settings window has a left rail with General, Hotkeys and Tools (section 15.2). Tools fills
the pane with a two-pane layout.

List pane, left, about 250px:

- Three collapsible sections, Search terms, Tools, Templates, each with a count and a `+`.
- One row per item: a health dot (green ready, amber a producer is disabled, red orphan, grey the
  term is disabled, hollow for clip templates), the name (struck through when disabled), and a
  strip of swatches for the groups the item produces or needs, in group colour. An orphan group
  shows as a hollow dashed swatch.
- Footer: `export` and `import` links.

Inspector, right, the rest of the width:

- Header: back arrow to the overview, item name, kind tag, Edit and Uses tabs, Delete.
- Overview (nothing selected): the sample text, then one row per group: the group pill with its
  count of values in the sample, "produced by" (term chips, disabled ones marked "(off)"), and
  "used by" (tool and template chips). A group nobody produces shows "nothing" and the fix
  buttons from 14.4.
- Edit: the sample text pinned above the editor, then the editor for the item's kind.
  - Search term: name, enabled toggle, pattern, validation message, "produces" pills, the
    pattern under edit run against the sample and shown as chips, "feeds" list, Save and Cancel.
  - Tool: name, URL, token picker, readiness line, preview titled "Would open N tabs from the
    sample" listing every resolved URL with values coloured by group, "fed by" list, Save and
    Cancel.
  - Template: name, text, token picker, readiness line, generated text with values coloured by
    group, Save and Cancel. A positional-only template says "clip template" instead of a readiness
    line.
- Uses: for a search term, each group it produces with its sample values and who uses it; for a
  tool or template, the readiness line, then each token it needs with its producers and, when no
  enabled producer exists, the fix buttons.
- Start from (new search term): one card per library entry (group pill, name, description, the
  regex, "already added" or "finds N in the sample") and a Blank card. Picking one opens the
  editor prefilled. New tool and new template open the editor directly.

### 14.4 Rules

Colour:

- One colour per capture group, used everywhere the group appears. Tools and templates have no
  colour of their own; they show the swatches of the groups they need. The template pill's yellow
  and the tool pill's grey are type colours and are not in the bucket.
- The bucket is twelve fixed slots, each with a dark-theme and a light-theme value of the same hue,
  so a group reads the same on either background. The user picks a slot, never a free colour.
- Defaults: the six prototype colours for `ip`, `email`, `ticket`, `domain`, `url`, `user`. Any
  other group takes the next free bucket colour when it first appears in a pattern.
- Clicking a group pill in the inspector opens the bucket. A swatch another group uses is marked
  and named on hover. Sharing is allowed. Reset restores the default.
- Stored as a `groupColours` map keyed by group name alongside search terms, exported with the
  config. An entry whose group no longer appears anywhere is dropped on save.

Tokens and readiness:

- The token picker lists groups that have a producer; groups whose only producers are disabled
  are dimmed. Typing a token by hand is allowed. A token nothing produces is an orphan: wavy red in
  the preview, and the readiness line reads "never ready".
- Readiness has four wordings and they never merge: "never ready" (orphan, red), "needs X,
  producer disabled" (amber), "sample lacks X" (grey, readiness line only), "ready on the sample"
  (green). List dots and the overview reflect config readiness only.
- Fix buttons on an orphan or disabled token: enable the disabled producer; add the library
  pattern that produces the group, if one exists; new search term prefilled with `(?<group>)`.
- The pipe form `{a|b}` still parses and previews but is not offered by the picker or documented
  in the help text. See 14.8.

Library and terms:

- The library never runs on its own. Adding an entry creates a normal search term that can be
  edited, disabled or deleted. Adding an entry whose pattern already exists re-enables it rather
  than duplicating. Added entries show as added.
- Every search term has an enabled toggle. Off keeps the term, produces no chips, and turns its
  consumers amber.
- Validation blocks Save when the regex does not compile, matches the empty string, has no named
  group, or uses a reserved `c1`-style group name. The validation sample is the user's sample
  text, not a fixed sentence.
- One `BUILTIN_PATTERNS` definition, with group names in this vocabulary (`ip`, `email`, `domain`,
  `url`, `phone`, `mac`, `guid`, `ipv6`).

Create, save, delete:

- Nothing is stored until Save. Cancel leaves no record. Save is disabled while invalid.
- Selecting another item while an edit is dirty asks once.
- Delete asks once and names what depends on the item.

Export and import:

- Two footer links. Export shows the counts and the JSON, including `groupColours`, then copies or
  saves. Import shows what the file would add (counts and groups) before offering merge or
  replace. Failure is inline text, never `alert()`.

Templates:

- Clip templates (positional tokens only) are labelled as such in the list and the editor, have no
  Uses view, and are never shown as match-driven. The help text no longer mentions the Tools
  Launcher.

Sample text:

- Persists per user, outside the exported config. When empty it defaults to the newest clip.

### 14.5 Keyboard

Up and Down move the selection in the list pane (the inspector follows on Uses, never on Edit, so
walking the list does not discard an edit). Enter opens Edit. Space on a search term toggles
enabled. Esc cancels an edit and returns to Uses; a second Esc returns to the overview. Ctrl+S
(Cmd+S on macOS) saves when Save is enabled. Delete asks to delete. Tab stays inside an open
editor. Not in the prototype.

### 14.6 Planned additions

Not in the prototype, to be added in implementation or a later pass, in this order: the tray
preview under the sample text in the overview (the tray the sample would produce, using section
6 and 7 rules exactly); a Problems filter on the list pane; library suggestions driven by the
sample at the top of "start from".

### 14.7 Acceptance minimums

- The Tools tab is a list pane and an inspector. No sub-tabs, no Test Patterns tab, no separate
  template manager.
- Every group renders in one colour everywhere in the app. The colour is editable from the bucket
  in settings, stored as `groupColours`, and exported.
- The term editor shows chips for the pattern under edit against the sample before Save.
- The tool editor offers a token picker, shows every resolved URL and the exact tab count for the
  sample, and flags an orphan token before Save.
- The template editor offers a token picker and shows generated text for the sample.
- Readiness uses the four wordings above; config and sample readiness are never merged.
- Uses answers both directions for any item, with fix buttons on orphan and disabled tokens.
- New search terms start from the library; added entries show as added; adding a disabled
  duplicate re-enables it; every term has an enabled toggle.
- Nothing is stored before Save.
- Export and import are footer links; import previews counts and offers merge or replace.
- One `BUILTIN_PATTERNS`; `QuickClipsManager.tsx` removed.

### 14.8 Decisions on the open questions

Closed 2026-08-22.

- Sample text persists in `settings.enc` as `toolsSampleText` on `UserSettings`
  (`src/shared/types.ts:60-75`). It rides the existing `storage-save-settings` path and the full
  backup, and stays out of the Quick Clips config export. Empty defaults to the newest clip, as
  14.4 says; a sidecar file would need its own read and write for one string.
- The pipe form `{a|b}` stays parsed for tool URLs, because today's engine already splits it
  (`src/main/clipboard/quick-clips.ts:86`) and existing configs use it. It is not offered by the
  picker or the help text. For readiness a pipe token is ready when any one alternative has a
  pinned value, and it contributes one tab per pinned value across its alternatives, which is what
  the engine does with it today. Templates never parsed pipes (the token regex is `\w+`,
  `src/main/storage/templates.ts:87`), so nothing changes there.
- Narrow windows: the settings window gets `minWidth: 720, minHeight: 440` in
  `src/main/window/creation.ts`. Below 720 never happens, so there is no collapsed rail or hidden
  list pane to design. The clips window keeps no minimum because people dock it as a strip beside a
  browser; settings has no such use.
- The tray does not offer the colour bucket. Colours change in one place.

## 15. Settings: the shell, General and Hotkeys

Status: locked 2026-08-22, not implemented. Prototype:
[settings-shell-variations.html](settings-shell-variations.html), variation C, which also carries
the review of the current General and Hotkeys code that drove this. Five variations were explored
(a stack, two panes everywhere, a dense grid, draft and Save, a stack with a jump bar); the dense
grid was chosen on review and its three short panels were reworked to stack their content.

### 15.1 Goal

One settings window whose three tabs share one shell, so the Tools tab of section 14 drops in
unchanged. General shows every setting on one screen at the default window size. Every control on
General and Hotkeys applies on its own and shows its result beside itself, so nothing blocks and
nothing is silent. Shortcuts are recorded in place, and a conflict is caught before the shortcut is
registered.

### 15.2 Shell

- A left rail, 132px wide (96px at 720 wide), with General, Hotkeys and Tools, and the app version
  in monospace at the bottom of the rail. No top tab strip. The separate Versions card goes.
- The rest of the window is the pane: a title bar, the tab's content, and a one-line footer per
  tab. The footer says which model the tab uses ("Changes apply as you make them.") and holds the
  rare actions as links.
- True-black scale, Inter for text, monospace for keys, numbers and versions, and the same buttons,
  toggles (no ON or OFF text), footer links, status dots and toasts as the Tools tab. Dots mean what
  they mean there: green live or healthy, amber needs attention, red broken or conflicting, grey
  off, hollow informational.
- Both themes. Every colour in the shell, the tabs and the clips window goes through one variable
  set, and the light theme swaps that set; each prototype has a theme button that shows both.
  Group colours have a light-theme set (same hues, darker) so chips, swatches and pills pass
  contrast on either background; the bucket in 14.4 stores both values per slot. The forty-odd
  `isLight` branches collapse into that variable set; no component carries its own light styling.
- Default window 900 x 600. At 720 x 440 the General grid collapses to one column and scrolls
  inside the pane, the Hotkeys table scrolls inside the pane, and the rail, title bar and footer
  never move. Nothing is hidden to make the window fit.
- One loading state for the window, not one per section. A load failure is inline text with a
  retry link, never a spinner that stays.

### 15.3 Models

- One rule across the three tabs: a change applies immediately when the control is the whole
  change (General, Hotkeys); several fields that make one change wait for Save (Tools, section
  14.4).
- Each control on General and Hotkeys has its own status slot beside it: "saving" (dim) while the
  write runs, "saved" (green) for two seconds with an "undo" link that stays five seconds, and "not
  saved" with a "retry" link (red) that stays until retried. On failure the control returns to its
  previous value. No global saving indicator exists, and no control is ever disabled because
  another control is saving.
- Toasts are for actions with no visible result: export, reset all, restart and install, clear all.
  A control that shows "saved" beside itself gets no toast.
- Export, import, clear all data and reset all shortcuts are footer links. Clear all confirms with
  the counts and size it deletes. `alert()` and `confirm()` are not used anywhere in settings.

### 15.4 General layout

- Two panels side by side, Application and Window; three short panels across the bottom, Storage,
  Updates, About. With today's controls nothing scrolls at 900 x 600.
- A row is a label and a control. The description is the label's tooltip, marked with a dotted
  underline. A label has to carry its meaning alone.
- Application: Clips to keep (number, 15 to 100), Start minimized, Start with the system (hidden on
  Linux), Theme (system, light, dark), Notifications, Code detection.
- Window: Always on top, Remember position, Transparency, Transparency level (slider and percent),
  Opaque when focused. The last two are dimmed, not hidden, while Transparency is off.
- Storage: the clip count large, "of N clips" beside it where N is Clips to keep, a refresh link
  at the right of that line, a full-width usage bar (amber from 90%), then the locked count and
  the size on disk on one line.
- Updates: the Check on start toggle, then a status line with a dot (grey idle, blue checking or
  downloading, green downloaded or up to date, red error), one line of text and one line of dim
  detail, then a Check now button, replaced by Restart and install once a download has landed.
  On macOS there is no button: the line says updates are manual because the builds are unsigned,
  and a link goes to releases.
- About: the version, Electron and Chromium versions and the platform on two short monospace
  lines, then release notes, data folder and log as links.
- Footer: "Changes apply as you make them." with export data, import data and clear all data.

### 15.5 General rules

- Clips to keep commits on Enter or blur, never on a timer. A value outside 15 to 100 shows
  "15 to 100" in red beside the input and does not apply. A value below the current clip count
  asks once, naming the number of oldest unlocked clips that are deleted and that locked clips
  stay, with the count on the confirm button.
- Transparency level writes on release, not on every step; the percent label follows the slider
  live.
- A failed write shows "not saved, retry" on that row and puts the control back. The one expected
  case is Start with the system when the OS refuses the registration.
- Export writes `clipless-backup-YYYY-MM-DD.json` and toasts the name and size. Import shows what
  the file holds (clips, locked, settings, shortcuts, terms, tools, templates) and states that it
  replaces everything and restarts, before offering Replace and restart.
- Clear all names the clip count and locked count, every setting, the shortcuts, every search
  term, tool and template, and the size on disk; it offers "export first" and a Delete everything
  button; there is no undo.
- The updater exposes a state enum (idle, checking, available, downloading, downloaded, upToDate,
  error with message). The dot and the text map from it; no substring matching on a display
  string.
- Start with the system is hidden on Linux rather than shown disabled.

### 15.6 Hotkeys

- The master toggle "Global hotkeys" is the first row, with one line saying shortcuts work while
  Clipless is minimized or in the background. Off dims the table and blocks recording; the table
  is never hidden.
- A table with columns Action (name and a one-line description), Shortcut (keycaps), status, On
  (toggle) and reset (visible on hover when the key differs from the default).
- Rows, in this order: Show Clipless, Quick look on newest clip (section 9), Search clips, Copy
  clip 1 to Copy clip 5. The `openToolsLauncher` setting becomes the quick look action.
- Keys are stored as Electron accelerators and shown through one display function: Ctrl, Alt and
  Shift on Windows and Linux; Cmd, Opt and Shift on macOS. The raw string is never shown.
- Recording: clicking the keycaps turns them into the recorder, which echoes held modifiers live
  and says "press keys, Esc cancels". The first non-modifier key completes the combination. A
  press without Ctrl (Cmd), Shift or Alt shows "needs Ctrl, Shift or Alt" under the keycaps and
  keeps recording. Esc cancels. The old binding stays registered until the new one is accepted.
- Conflicts: a combination another row holds blocks acceptance, shows "used by <row>" under the
  keycaps, and offers "swap" (the other row takes this row's old key, so both stay valid) and
  "keep trying". If two rows hold the same key anyway (after an import, say), both show a red dot
  and "also bound to <row>". A combination the OS keeps for itself, from a short hand-maintained
  per-platform list, shows an amber line ("<why>; Clipless may never receive it") and is accepted.
- A registration refused by the OS shows "not saved, retry" on the row.
- Reset on a row restores that default and shows "saved". "reset all to defaults" is a footer link
  and toasts the count. Defaults are the `DEFAULT_HOTKEY_SETTINGS` the main process uses, exposed
  to the renderer.
- The footer line reads "Shortcuts register with the system as soon as they are recorded." The
  instructions block and the header tooltip go; the numbering rule lives in the Copy clip row
  descriptions.

### 15.7 Acceptance minimums

- One shell: a left rail with the version at its foot, no top tabs, no Versions card, no cards
  inside the pane except the five General panels. The Tools tab from section 14 renders in the
  pane unchanged.
- General shows all five panels without scrolling at 900 x 600 with today's controls, and
  collapses to one scrolling column at 720 x 440.
- Every control on General and Hotkeys has its own inline saving, saved and not-saved state. No
  control is disabled by another control's save. No `alert()` or `confirm()`.
- Clips to keep validates inline and confirms data loss with the numbers in the message.
- Storage shows count against limit, a usage bar, locked count and size, in one panel.
- Updates is one panel with the toggle, a state-driven dot and one button; macOS shows a releases
  link instead.
- Hotkeys is a table with the keycaps as the recorder, live modifier echo, inline validation, a
  conflict check with swap, per-row and reset-all, platform key names, and the quick look row.
- Hotkeys off dims the table; it never hides it.
- The two `LoadingState`s, the two `SavingIndicator`s, `ErrorState`, `CloseButton`, `Versions`,
  `HotkeyInstructions`, `HotkeyHeader` and the second toggle implementation go.

### 15.8 Decisions on the open questions

Closed 2026-08-22.

- The label stays "Code detection". The tooltip carries the rest: "Detect the language of text
  clips and colour them as code in the row tag, the editor and quick look." Two words fit the
  one-line row at 720 wide; the longer label does not say more. The setting key is
  `codeDetectionEnabled` (`src/shared/types.ts:67`); today's label is "Code Detection &
  Highlighting" (`ApplicationSettings.tsx:145`).
- The no-scroll fit holds for today's control count. When a later setting breaks it, the grid
  scrolls. No redesign.
- The OS-reserved list is the prototype's nine entries, kept in
  `src/shared/osReservedShortcuts.ts` as `{ key, platforms, why }` and advisory only: Ctrl+Shift+Esc
  (Windows, Task Manager), Alt+F4 (Windows, Linux), Ctrl+Alt+Delete (Windows, Linux), Cmd+Space
  (macOS, Spotlight), Cmd+Shift+3 and Cmd+Shift+4 (macOS, screenshots), Cmd+Q (macOS), Cmd+Tab
  (macOS), Alt+Tab (Windows, Linux). Two defaults trip it: Copy clip 3 and Copy clip 4 are
  `CommandOrControl+Shift+3` and `+4` (`src/main/storage/defaults.ts:20,24`), which on macOS are
  the screenshot keys. Those rows show the amber line on macOS. The defaults are not changed here;
  that would change 15.6 and needs its own decision.

## 16. The rest of the clips window

Status: locked 2026-08-22, not implemented. Folded in from the review
[quick-look-outliers.md](quick-look-outliers.md), whose coverage table lists every clips-window
feature that sections 1 to 13 left out, with file references. Prototype:
[quick-look-outliers-prototype.html](quick-look-outliers-prototype.html), five frames on one engine.
Rule numbers match the "Proposed rules" list at the foot of that prototype.

### 16.1 Rules

1. Stack order from the bottom: status bar, search bar, tray, list. The update is a status bar
   pill (circle-arrow-up icon, "1.9.0 ready", Restart), never a strip. Under 360px tall the tray
   opens collapsed to one line ("Launch tray, 3 values: ip x2, ticket, Open all (4 tabs), expand");
   expanded, it scrolls internally at 34% of the window height.
2. Search keeps its contract: case-insensitive substring, images excluded, real row numbers, "No
   clips match". Hits get a soft mark, never a chip; chips stay chips and stay clickable in
   filtered rows. The count line reads "3 of 8" and names what was not searched ("1 image not
   searched"). A "pinned" toggle filters to clips that contain a pinned value; it is disabled while
   nothing is pinned. Hiding the bar clears the filter, so an invisible filter cannot persist.
   Keyboard: `/` from a row opens search; Down or Enter in the input focuses the first visible
   row; Down past the last row returns to the input. The bar sits under the list, next to the
   button that opens it (16.2).
3. The reader walks the visible set and says "n / m filtered". A filter change that hides the open
   clip leaves the reader on it with "hidden by filter"; Up and Down jump to the nearest visible
   clip. The quick look hotkey opens row 1; if a filter hides row 1 the filter is cleared first and
   a toast says so. Copy clip 1 to 5 index the real rows, which is what the row numbers show even
   when filtered.
4. Esc is one stack, innermost first: context menu, edit, reader, filter text, search bar. One
   level per press. The reader's single-letter keys (`p`, `e`, `c`, `t`, `w`) are live only while
   the reader has focus, so they never reach the search input.
5. Status bar buttons, right side: search (on-state while the bar is open), quick look on the
   newest clip (the rocket's replacement, same action as the hotkey in section 9), settings. Left
   side: the counts as today; in narrow windows they drop their words (clipboard icon "8/25", lock
   icon "1"). The "Space: quick look" hint goes; the buttons carry their hotkeys in tooltips.
6. Types.
   - Images: the row shows the thumbnail, a format tag and "1280 x 720, 412 KB". The reader fits
     the image to the content pane on a checkerboard; the side column lists format, pixels, size
     and where it is stored; edit and wrap are greyed with the reason in the tooltip; copy works
     and loads the full image as today. The hover popover goes. No chips, no dots, no pins; the eye
     still shows on hover.
   - HTML and RTF: the row shows a type tag and the extracted text, not the markup. Scanning runs
     on the extracted text. The reader has a text view (chips, pins, gutter) and a source view (no
     chips, no pins, the side column says why); HTML also has a rendered view. Text is the default
     view; rendered is opt-in per open.
   - Rendered HTML never runs code. All of these, not a choice of one: the source is parsed with an
     inert parser and is never assigned to the live document, not even briefly; an allowlist keeps
     formatting tags only (p, br, h1 to h6, ul, ol, li, b, i, em, strong, code, pre, blockquote,
     table, thead, tbody, tr, th, td, span, div, a), and `script`, `style`, `iframe`, `object`,
     `embed`, `link`, `meta`, `base`, `svg`, `math`, `form` and every input, `video`, `audio` and
     `img` are removed (an image leaves a "[image removed]" marker; unknown tags are unwrapped
     with their text kept); every attribute is dropped except `title` and, on `a`, an `href` that
     starts with `http:`, `https:` or `mailto:`; the result renders inside an `iframe` with
     `sandbox=""`, `referrerpolicy="no-referrer"` and a `Content-Security-Policy` of
     `default-src 'none'; style-src 'unsafe-inline'`; links inside the frame are inert (the URL is
     a chip in the text view and goes through the tray); the side column lists what was removed.
     The prototype's frame 3 carries a clip built to test this. The same rules apply to any future
     rendered view for RTF or Markdown.
   - Bookmarks: the row shows a "link" tag, the title plain and the URL as a `url` chip. The
     reader shows title and URL on two lines. Scanning runs on title plus URL.
   - Enter on a non-text row opens the reader. Clicking the line on a non-text row does nothing.
   - Text search still skips images, and the count line says so.
7. The reader tracks a clip, not an index. When a new clip lands, the header renumbers in place
   with a short flash and the walk continues from the same clip. When the open clip rotates out of
   the list, the reader closes with a toast. Pins whose value no longer appears in any clip are
   dropped with the tray notice from section 6, and the notice says why: "after the edit",
   "deleted with clip 4", "rotated out of the list". The copied marker follows its clip.
8. Copy feedback: number cell and reader copy set the green marker as today and show a toast. The
   OS notification fires only for hotkey copies, because the window may be hidden. The "Template
   Generated" notification goes; the toast replaces it.
9. Row 1: Lock and Delete are disabled in the context menu with the reason beside them ("row 1 is
   the live clipboard"). Quick look, chips and pins work on row 1 like any row.
10. Clip templates: a "Fill clip template" submenu in the context menu on every row, listing each
    positional template with a preview filled from rows 1, 2, 3, and the usual copy toast.
    `{c1}` is row 1 whichever row was right-clicked (16.2). A row with no positional templates
    shows the submenu disabled with "no clip templates".
11. Under 480px wide: the status bar shows counts only; tray groups stack (name, values, tools on
    their own lines) so tool buttons stay full size; the reader's matches column folds under the
    content as a strip that opens on click; the reader header keeps every button and drops the
    size text; the search bar hides its count line.
12. Light theme stays, in the clips window and in settings, with a light set of group colours;
    every prototype shows both. The light set passed a contrast pass (16.2).
13. Hide clears the search bar, as today. Pins, the tray and an open reader survive a hide and are
    lost on quit.
14. Delete keeps today's empty-in-place behaviour and name: the row becomes an empty clip and
    nothing shifts. The reader and Up/Down skip empty rows.

### 16.2 Decisions on the review's open questions

Closed 2026-08-22. The prototype's behaviour wins unless a reason is given.

- The search bar sits under the list, above the status bar, next to the button that opens it. The
  find-bar alternative under the title bar hides the first result behind the bar when the list is
  scrolled to the top.
- `{c1}` means row 1, as the engine defines it (`src/main/storage/templates.ts:95-98`). The
  settings preview (14.3) fills from rows 1, 2, 3 and the submenu is the same on every row;
  making it "the row I clicked" would give one template different text per row with no preview
  that says so.
- HTML and RTF text extraction is real extraction in the main process, not a regex strip. See
  17.4. A regex strip leaves entity text (`&amp;`), script bodies and style rules in the text the
  scanner reads, and would put chips on them.
- The "pinned" toggle stays. It is the cross-clip case the tray exists for, and a tray chip already
  has one click meaning (remove).
- The reader closes with a toast when its clip rotates out. A frozen copy would offer edit, copy
  and lock on a clip that no longer exists.
- Contrast pass, run 2026-08-22 against the prototype's row backgrounds (dark `#2e2e2e`,
  `#383838`, `#424242`, panel `#0d0d0d`; light `#fbfbfb`, `#f1f1f1`, `#e4e4e4`, panel `#ffffff`)
  with WCAG 2 relative luminance. In the clips window a group colour is only ever a border, a dot,
  a swatch or a 25% tint behind the normal text colour (`.m` in the prototype has
  `color: inherit`), so the bar is 3:1 for the colour against the row and 4.5:1 for the text on the
  tint. In the reader side column, the tray and settings the colour is also used as text on the
  panel, where the bar is 4.5:1. Results: all twelve dark values pass (worst 3.37:1 as a border on
  the hover row for indigo `#818cf8`; worst 5.01:1 for text on a tint; all at least 6.5:1 as text
  on the panel). The light set had three defects, now fixed in
  `settings-tools-prototype.html`: lime `#6da314` failed 3:1 on every row (2.39:1 on hover) and is
  now `#3f6212` (5.57:1 on rows, 7.08:1 on white); orange `#b45304` was the same colour as amber
  `#b45309` and is now `#c2410c` (4.07:1 on rows, 5.18:1 on white); the twelfth slot `#2dd4bf`
  had no light value at all (a bare hex where the others were variables) and now has `#0f766e`
  (4.30:1 on rows, 5.47:1 on white). The full bucket, dark then light, per slot: 0 `#f87171` /
  `#b91c1c`, 1 `#60a5fa` / `#1d4ed8`, 2 `#34d399` / `#047857`, 3 `#fbbf24` / `#b45309`, 4 `#22d3ee`
  / `#0e7490`, 5 `#c084fc` / `#7e22ce`, 6 `#fb923c` / `#c2410c`, 7 `#a3e635` / `#3f6212`, 8
  `#f472b6` / `#aa0d5f`, 9 `#38bdf8` / `#067db1`, 10 `#818cf8` / `#0a19ae`, 11 `#2dd4bf` /
  `#0f766e`. Slots 0 to 5 are the defaults for `ip`, `email`, `ticket`, `domain`, `url`, `user`.

### 16.3 Acceptance minimums

- The bottom of the window is, from the bottom, status bar, search bar (when open), tray (when
  anything is pinned), list. No other strip exists; a downloaded update is a status bar pill.
- Search filters as today, marks hits without chips, names what it skipped, offers the pinned
  toggle, and clears when hidden. `/` opens it from a row; Esc follows the one stack.
- The reader walks the filtered set and survives a filter that hides its clip.
- Image, HTML, RTF and bookmark rows are one line with a type tag; the reader shows each in full
  inside the window; the image popover is gone.
- The HTML rendered view is a sandboxed iframe whose content passed the sanitiser; the hostile
  clip from the prototype renders as text with nothing executed and no network request (a unit
  test asserts the output for that clip, an e2e test asserts no request leaves the frame).
- Pins, the reader and the copied marker survive a clip landing at row 1; the reader closes with a
  toast when its clip rotates out; dropped pins are named with a reason.
- Row 1 cannot be locked or deleted and says why.
- "Fill clip template" exists in the context menu and copies with a toast.
- Every copy into the clipboard from the window shows a toast; hotkey copies notify through the
  OS; no action produces both.
- The clips window reads correctly in both themes at 380px wide and 300px tall.

## 17. Engineering

Status: locked 2026-08-22, not implemented. Every path and line below was checked against the
source on branch `t3code/explore-tool-launcher-ux` at commit `4155514`; where the review's numbers
had moved, these are the current ones. The order of work is in
[implementation-plan.md](implementation-plan.md).

### 17.1 State

**Clip identity.** `ClipItem` (`src/shared/types.ts:14-23`, duplicated verbatim in
`src/renderer/src/providers/clips/types.ts:11-20`) has no id; identity is the array index, and
`StoredClip.timestamp` is re-stamped on every save (`src/main/storage/clips.ts:15`), so it cannot
serve either. Add `id: string` to `ClipItem`, assigned with `crypto.randomUUID()` where clips are
built in the renderer (`createTextClip`, `createHtmlClip`, `createImageClip`, `createRtfClip`,
`createBookmarkClip` in `src/renderer/src/providers/clips/utils.ts:15-60`; `createEmptyClip` at
`:7-10` gets an id too, so a row always has one). Clips loaded without an id get one in
`migrateData` (`src/main/storage/migration.ts:30-44`), which already runs on every clips load
(`src/main/storage/index.ts:165`). The renderer's copy of the clip types goes; it imports from
`src/shared/types.ts`. Locks stay keyed by index (`lockedClips: Record<number, boolean>`,
`src/renderer/src/providers/clips/index.tsx:72`) because a lock is a slot property: the insertion
loop at `state.ts:151-169` skips locked slots, and a locked slot keeps whatever clip it holds.

**Pins.** A `Map<string, Pin>` keyed `group|value` with `Pin = { group, value, pinnedAt }`, held in
a new `src/renderer/src/providers/clips/pins.ts` and exposed through a fourth context
(`ClipsPinsContext`) beside the three in `providers/clips/types.ts:25-63`. Memory only; never
written to storage (section 12). `pinnedAt` is an increasing counter, not a time, so "first pinned"
in section 7 is an order the user can reason about.

Readers: row chips (`ClipWrapper`), the reader's text and side column, the tray, template
readiness, the search "pinned" toggle. Writers: chip click (toggle one key), `p` on a row or in the
reader (toggle every key in the clip; unpin all if all are pinned), the reader's per-group and
header pin all, the not-ready template pill (pin first occurrence of each missing token from the
open clip), tray chip remove, tray clear. Every writer goes through `togglePins(keys[])`,
`setPins(keys[], on)` and `clearPins()`; no component holds its own pin state.

Pruning: a `useEffect` on `[clips, scanIndex]` computes the set of `group|value` keys present in
any clip's scan (17.3) and drops pins not in it. The reason comes from what changed: the effect
receives the previous clips array; if the pinned value was in a clip whose `id` is still present
but whose content changed, the reason is "after the edit"; if the clip's row is now empty, "deleted
with clip N"; if the `id` is gone, "rotated out of the list". The tray shows the notice for one
change at a time and replaces it on the next. Quit clears pins by virtue of never saving them; a
hide (`visibilitychange`, `providers/clips/index.tsx:151-160`) does not touch them.

**The reader.** `QuickLook` state is `{ openClipId: string | null, view: 'text' | 'source' |
'rendered', editing: boolean, returnFocusIndex: number | null }`, in the clips provider so the
tray, the status bar and the hotkey handler can reach it. The row index is derived each render by
`clips.findIndex(c => c.id === openClipId)`; when the index changes the header renumbers (rule 7)
and when it is -1 the reader closes with the toast. Walking uses the visible list
(`filteredClips`, `index.tsx:163-185`) to find the previous and next non-empty clip by id. Focus
return on close: the list is virtualised (`@tanstack/react-virtual`, `Clips.tsx:22-27`, overscan
5), so the row may be unmounted; call `virtualizer.scrollToIndex(returnFocusIndex)` and focus the
row on the next frame.

**The copied marker.** `clipCopyIndex` (`index.tsx:67`, set at `clipboard.ts:101` and `:215`,
cleared at `state.ts:149`) becomes `clipCopyId`. The hotkey path still sends an index
(`hotkey-clip-copied`, `src/main/hotkeys/actions.ts:69`); the renderer maps it to `clips[index].id`
on receipt. The reset at `state.ts:149` goes; the marker follows the clip.

**Toasts.** There is no toast component in the renderer (grep for `toast` finds nothing). Add
`src/renderer/src/components/Toast.tsx` with a `ToastProvider` and `useToast()` returning
`toast(title, detail?, { duration })`, rendered at the bottom of the window above the status bar,
stacking at most three, 3.4s each, dismiss on click. Both windows mount the provider (15.3 needs
toasts in settings).

**Wrap and view.** `wrap` is a boolean in the reader state, per session, default false. `view`
resets to `text` on every open (rule 6).

### 17.2 Storage and migration

**`groupColours`.** `Record<string, number>` keyed by capture group name, value a slot index 0 to
11 into the bucket, never a hex. It lives in `templates.enc` beside the search terms:
`TemplatesData` (`src/shared/types.ts:92-96`) gains `groupColours?: Record<string, number>`,
with `storage.getGroupColours()` and `storage.setGroupColours()` in `src/main/storage/index.ts`
and IPC `group-colours-get` and `group-colours-set`. Save drops entries whose group appears in no
enabled or disabled search term pattern, tool URL or template (14.4). Export: `QuickClipsConfig`
(`src/shared/types.ts:199-204`) gains `groupColours?` and `version` becomes `'2.0.0'` (it is a
hard-coded `'1.0.0'` literal today, `src/main/clipboard/quick-clips.ts:159-175`). Import
(`src/main/storage/index.ts:681-735`, append-only today) gains a `mode: 'merge' | 'replace'`
argument: merge keeps an existing colour and adds missing ones; replace takes the file's map. A
file without `groupColours` (version 1) imports with none, and the resolver assigns defaults.

**The bucket and the resolver.** `src/shared/groupColours.ts` exports `GROUP_COLOUR_SLOTS`
(twelve `{ dark, light }` pairs from 16.2), `DEFAULT_GROUP_SLOTS` (`ip: 0, email: 1, ticket: 2,
domain: 3, url: 4, user: 5`) and `resolveGroupSlot(group, groupColours, knownGroups)`: the
override if present, else the default, else the lowest slot no known group uses (wrapping to 0
when all twelve are taken). `knownGroups` is every group in every search term, in term order, so
assignment is stable across renders. The renderer sets `--slot-0` to `--slot-11` on `:root` from
the dark or light value of each pair; chips, dots, swatches and pills reference `var(--slot-N)`
and never a hex. Section 4's sentence "by hashing the group name into a fixed palette of six to
eight colours" is superseded by 14.4 and this resolver; section 4 is not edited, this note
records the override.

**One `BUILTIN_PATTERNS`.** Three copies exist: `SearchTermsSection.tsx:10-49` (eight entries,
the live one, with the TLD-aware domain regex from `src/renderer/src/utils/tlds.ts` and a GUID
entry), `QuickClipsManager.tsx:11-44` and `ToolsManager.tsx:12-45` (seven entries each, both
dead). The one definition moves to `src/shared/builtinPatterns.ts` with the eight entries of the
live copy and group names in the section 3 vocabulary: `ip`, `email`, `domain`, `url`, `phone`,
`mac`, `guid`, `ipv6`. Search terms a user already added from the old library keep their old group
names (`ipAddress`, `domainName`, `phoneNumber`, `macAddress`, `ipv6Address`); they are the user's
data, their tools reference those names, and the resolver gives them colours like any group. The
library card for an old-name term shows "already added" by matching the pattern body, not the
name.

**Hotkey rename.** `HotkeySettings.openToolsLauncher` (`src/shared/types.ts:45-55`) becomes
`quickLook`. Touch: `DEFAULT_HOTKEY_SETTINGS` (`src/main/storage/defaults.ts:30-33`), the
manager's inline fallback (`src/main/hotkeys/manager.ts:102-115`), the action
(`src/main/hotkeys/actions.ts:173-195`, see 17.3 for its new body), the unused types in
`src/main/hotkeys/types.ts:8,15`, and the renderer's duplicate defaults and labels
(`src/renderer/src/components/settings/hotkeys/useHotkeyManager.ts:5-50`), which go when 15.6 makes
the main-process defaults the only copy (exposed through a new `hotkeys-get-defaults` IPC).
Migration lives in `normalizeSettings` (`src/main/storage/settings.ts:7-14`), the one funnel every
settings read passes through (`src/main/storage/index.ts:364`): if `hotkeys.openToolsLauncher`
exists and `hotkeys.quickLook` does not, move it; then deep-merge each action with its default so a
stored map missing a key no longer throws at `manager.ts:68`. The self-heal write at
`index.ts:366-370` persists the result on first read. There is no settings schema version or
migration hook anywhere else: `StorageMeta.storageVersion` is written and never branched on
(`index.ts:194-200`), and `migrateData` is a validator (`migration.ts:19-127`). Add
`storageVersion: 2` to `meta.json` when this ships so a later change has a number to branch on.

**Updater state.** The main process holds no update state (`src/main/updater/index.ts:81-108`
only logs), pushes one channel (`update-downloaded` with `{ version }`, `:136`) and only to the
main window; the settings renderer keeps a prose string and substring-matches it
(`UpdaterControl.tsx:7,49-53`). Replace with a module-level `UpdateState` in `updater/index.ts`:
`{ status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'upToDate' |
'error', version?: string, progress?: number, message?: string }`, set from the six
`electron-updater` events and from the `check-for-updates`, `download-update` handlers, pushed on
every change as `update-state` to every window, and readable through `get-update-state`. The
status bar pill (rule 1) and the General Updates panel (15.4) both render from it;
`update-downloaded` goes. `status: 'error'` on macOS carries the unsigned-build message, and the
renderer shows the releases link when `platform === 'darwin'` (15.4).

**Sample text.** `UserSettings.toolsSampleText?: string` (14.8). Not in `DEFAULT_SETTINGS`; absent
means "use the newest clip".

**Extracted text.** `ClipItem.text?: string` holds the extracted text for `html` and `rtf` clips
(17.4). It is set in the main process before the clip is sent to the renderer
(`src/main/clipboard/monitoring.ts:55-80`, where images already get their own treatment) and
persisted with the clip. Clips loaded without it get it in `migrateData`. Bookmarks do not store
`text`; the scanner reads `title + '\n' + url`.

**Settings window minimum.** `createSettingsWindow` (`src/main/window/creation.ts:34-96`) is
800 x 650 and `resizable: false`. It becomes 900 x 600, resizable, `minWidth: 720, minHeight:
440`.

### 17.3 Scanning

Today every row runs `usePatternDetection(clip.content)`
(`src/renderer/src/hooks/usePatternDetection.ts`, 300ms debounce at `:44`, one
`quick-clips-scan-text` IPC per row at `:24`, no cache), the main process loads the search terms
from storage and compiles every regex on every call (`src/main/clipboard/quick-clips.ts:6-48`),
and the result carries values with no positions (`PatternMatch`, `src/shared/types.ts:190-194`).
The settings Test Patterns tab makes the same call (`ToolsManager.tsx:266-270`). Chips need
positions, the settings editor needs the pattern under edit (unsaved) against the sample, and the
reader needs the same result as the row.

One function, `scanText(text, terms): ScanResult` in `src/shared/scan.ts`, pure and synchronous.
`terms` is the enabled search terms (or, in the settings editor, the one pattern under edit).
Each pattern compiles once with flags `gd` (`hasIndices`, so every named group has `[start,
end]`), cached in a `Map<pattern, RegExp | Error>`. A bad pattern is skipped and reported in the
result; an empty match advances `lastIndex` by one so a pattern that can match the empty string
cannot loop (14.4 also rejects such patterns at save). The result is `{ matches: Match[], groups:
string[] }` with `Match = { group, value, start, end, termId }` sorted by `start` and `groups` in
order of first appearance (section 5's side column order). Overlapping matches from different
terms are both kept; the row renders the earlier one and the side column lists both.

Where it runs: the renderer, in both windows, with no IPC. The clips window holds a
`ScanIndexProvider` in `src/renderer/src/providers/scan.tsx`: it loads the search terms once
(`search-terms-get-all`), keeps a `Map<clipId, { contentKey, result }>` and returns
`getScan(clip)`, which scans on a miss or when `contentKey` (the clip's `text ?? content`, by
reference) differs, so an edit re-scans exactly one clip. The whole map clears when the terms
change. The main process broadcasts `quick-clips-config-changed` to every window after any search
term, tool, template or `groupColours` write (new channel; today nothing tells the clips window a
term changed). The tray and readiness read `getScan` for every clip; the settings overview and
editors call `scanText` directly with the sample text. `quickClipsScanText` and
`search-terms-test` (`src/main/clipboard/ipc.ts:214`, `:191`) go, as does
`usePatternDetection.ts` and its test; `scanTextForPatterns` stays only as long as
`openToolsForMatches` does (next paragraph), then goes with its test.

Clips above 256 KB of text are scanned on demand (reader open, or the first time the row is
rendered) rather than on load, and the scan runs in a `requestIdleCallback` so a large HTML paste
does not block the first paint. That is the one asynchronous path; the row shows no chips until it
completes.

**Tools and templates use the same shared code.** `src/shared/tools.ts` exports
`toolTokens(url)` (the `{a|b}` pipe split from `quick-clips.ts:67-86`), `toolReady(tool,
pinsByGroup)` (every token has a value; a pipe token when any alternative has one) and
`buildToolUrls(tool, pinsByGroup)` (the Cartesian product from `quick-clips.ts:115-140`,
`encodeURIComponent` except for the `url` group, de-duplicated). The tray's multipliers and tab
counts and the settings "Would open N tabs" preview are `buildToolUrls(...).length`, so the two
cannot disagree. Opening goes through a new `open-external-urls` IPC that takes `string[]`, accepts
only `http:` and `https:` (today `shell.openExternal` at `quick-clips.ts:149-151` takes anything),
and opens them in order. `quick-clips-open-tools` and `openToolsForMatches` (`quick-clips.ts:51-157`,
with its `some` compatibility rule and first-match-only behaviour at `:60-71`) go.

The template engine (`generateTextFromTemplate` and `extractTemplateTokens`,
`src/main/storage/templates.ts:55-101`) moves to `src/shared/templates.ts` unchanged; the main
storage module imports it from there. `src/shared/readiness.ts` exports `templateReadiness(template,
pinsByGroup, openClipScan?)` returning one of `ready`, `needs` (with the missing tokens and, when
`openClipScan` has them all, the keys to pin) or `clip-template`, and `configReadiness(item, terms)`
returning the four wordings of 14.4. The tray and reader pills, the `t` key and the settings
readiness line all call these. Copying a template is renderer-side: generate, `set-clipboard-text`,
toast. `templates-generate-text` (`src/main/clipboard/ipc.ts:162-177`) goes.

**The hotkey.** `openToolsLauncher()` in `src/main/hotkeys/actions.ts:173-195` becomes
`quickLook()`: it asks clipboard monitoring to check now (a new `checkClipboardNow()` export in
`src/main/clipboard/monitoring.ts`, which runs the body of the 250ms poll once so a fresh copy
reaches the renderer as `clipboard-changed` before the reader opens), then shows and focuses the
main window as `focusWindow()` does (`:23-48`), then sends `open-quick-look` with no payload. The
renderer handles it after the pending clip (if any) has landed: clear a filter that hides row 1
(toast), open the reader on `clips[0].id`. The main-process fallback to the stored clip at
`:178-186` goes; the renderer always has the list.

### 17.4 Main-process helpers that do not exist yet

Nothing in `src` parses HTML or RTF or sanitises anything (grep for `sanitiz`, `DOMParser`,
`innerHTML`, `dangerouslySetInnerHTML`, `htmlToText`, `rtf` in code: nothing but the raw
`{clip.content}` spans in `HtmlClip.tsx:16` and `RtfClip.tsx:17`), and `package.json` has no
dependency for it. Three helpers, all in the main process, one new module each:

- `src/main/clipboard/extract-html.ts`: `htmlToText(html): string`. Walks a parse from
  `htmlparser2` (new dependency, parser only, no DOM, no network), skipping `script`, `style`,
  `template`, `noscript`, `head`; emits a newline for block-level elements and `br`, a tab between
  table cells, decodes entities, collapses runs of whitespace inside a line, trims. Runs at capture
  in `monitoring.ts` for `html` clips and in `migrateData` for stored clips without `text`. Main
  because capture already happens there, the text is stored with the clip, and the renderer then
  never touches markup for the row or the scan.
- `src/main/clipboard/extract-rtf.ts`: `rtfToText(rtf): string`. Hand-written tokenizer (about
  150 lines; the RTF libraries on npm are unmaintained stream parsers): tracks group depth, skips
  destination groups (`\fonttbl`, `\colortbl`, `\stylesheet`, `\info`, `\pict`, `\*`), maps `\par`
  and `\line` to newline, `\tab` to tab, `\'hh` through the document code page (`\ansicpg`,
  default 1252), `\uN` to the code point honouring `\ucN` skip counts, and drops every other
  control word. Same call sites as the HTML helper.
- `src/main/clipboard/sanitize-html.ts`: `sanitizeHtml(html): { html: string, removed: Record<string,
  number> }`. `sanitize-html` (new dependency; it uses `htmlparser2`, so one parser) with
  `allowedTags` from rule 6, `allowedAttributes: { '*': ['title'], a: ['href', 'title'] }`,
  `allowedSchemes: ['http', 'https', 'mailto']`, `allowProtocolRelative: false`,
  `disallowedTagsMode: 'discard'` (unknown tags unwrapped, text kept; `script` and `style`
  bodies dropped because they are `nonTextTags`), and `transformTags.img` replacing the element
  with a `span` reading "[image removed]". `removed` is counted in a first `htmlparser2` pass over
  the same string (every tag name not in the allowlist, and every dropped attribute name) for the
  side column. Exposed as `html-sanitize` IPC, called when the user switches to the rendered view,
  never at capture. The renderer puts the returned string into the sandboxed iframe's `srcdoc`
  with the CSP `meta` tag prepended, and nothing else: the untrusted source never reaches the live
  document, and the sanitised one only reaches an opaque-origin frame with no scripts, no forms, no
  popups and no network. Main rather than renderer so the only code that handles raw clipboard
  markup is the process that already holds it, and so the unit test runs in node against the
  hostile clip from the prototype.

Dependencies added: `htmlparser2`, `sanitize-html`, `@types/sanitize-html`.

### 17.5 IPC and preload changes

New: `group-colours-get`, `group-colours-set`, `hotkeys-get-defaults`, `open-quick-look` (main to
renderer), `open-external-urls`, `html-sanitize`, `quick-clips-config-changed` (main to renderer),
`update-state` (main to renderer), `get-update-state`. Changed: `quick-clips-import-config` takes
`{ config, mode }`; `quick-clips-export-config` returns version `2.0.0` with `groupColours`;
`storage-save-settings` accepts `toolsSampleText`. Removed: listed in 17.6. Every `on*` preload
method returns an unsubscribe function; today only `onUpdateDownloaded` and `onSettingsUpdated` do
(`src/preload/index.ts:24-29`, `:64-71`) and the rest pair with `remove*Listeners` calls that
remove every listener on the channel, which is why `storage.ts:180-196` and `:101-135` fight
over `settings-updated`. `src/preload/index.d.ts` is a hand-kept mirror and changes with every
line above.

### 17.6 Removal list

Each entry was confirmed by grep on 2026-08-22; "imported by" lists are complete.

Tools launcher window, renderer:

- `src/renderer/tools-launcher.html` (referenced by `electron.vite.config.ts:31`,
  `src/main/window/creation.ts:147,152`, `e2e/tools.spec.ts:288,351`).
- `src/renderer/src/tools-launcher-main.tsx` (imported by `tools-launcher.html:11` only).
- `src/renderer/src/ToolsLauncher.tsx` (imported by `tools-launcher-main.tsx:7` only).
- `src/renderer/src/components/clips/QuickClipsScanner.tsx` and `QuickClipsScanner.module.css`
  (imported by `ToolsLauncher.tsx:3` only; the CSS by the component only).
- `src/renderer/src/components/clips/quickClipsSelection.ts` and `QuickClipsScanner.test.tsx`
  (the test imports only `quickClipsSelection`, not the component).
- `src/renderer/src/assets/base.css` is imported only by `tools-launcher-main.tsx:1` and
  `tools-launcher.html:7`; it goes too, after its `:root` variables (`base.css:27-60`) are folded
  into the one theme file of 17.8.
- `electron.vite.config.ts:31`, the `'tools-launcher'` input.

Tools launcher window, main and preload:

- `src/main/window/creation.ts:20` (`toolsLauncherWindow`), `:30-32` (`getToolsLauncherWindow`),
  `:98-154` (`createToolsLauncherWindow`).
- `src/main/ipc/index.ts:81-95`: the `open-tools-launcher`, `close-tools-launcher` and
  `tools-launcher-ready` handlers (the last is an empty stub), and the imports at `:10-11`.
- `tools-launcher-initialize` sends at `creation.ts:101,133`.
- `src/preload/index.ts:138-145` (`openToolsLauncher`, `closeToolsLauncher`, `toolsLauncherReady`,
  `onToolsLauncherInitialize`), `:149` (`removeAllListeners`, used only by `ToolsLauncher.tsx:24`),
  and the mirrors at `src/preload/index.d.ts:82-89`.
- `src/main/hotkeys/types.ts:8,15` (`openToolsLauncher` in two unused types).
- Callers of `openToolsLauncher` outside the launcher, each replaced by quick look:
  `StatusBar.tsx:36-44,76-82`, `ClipContextMenu.tsx:96-108,124-133`, `ClipOptions.tsx:27-34`
  (file goes), `useNativeContextMenu.ts:34` (file goes), `e2e/tools.spec.ts:258-361` (two
  describes, rewritten for quick look).
- `templates-generate-text` and `quick-clips-open-tools` handlers (`src/main/clipboard/ipc.ts:162-177`,
  `:215-220`) and their preload methods (`index.ts:98-103`, `:132-133`): their only callers are
  `QuickClipsScanner.tsx:359` and `:391`.
- Tests that exercise the above: `src/main/hotkeys/actions.test.ts:338-403`,
  `src/main/hotkeys/manager.test.ts:171-220,313`, the `openToolsForMatches` describe in
  `src/main/clipboard/quick-clips.test.ts` (rewritten against `src/shared/tools.ts`).

Clips window:

- `src/renderer/src/components/clips/clip/ClipOptions.tsx` and `ClipOptions.module.css`
  (imported by `ClipWrapper.tsx:8`, used at `:107`; the CSS by the component only). With it the
  dependency `react-outside-click-handler`, whose only import is `ClipOptions.tsx:2`.
- The image hover popover: `ImageClip.tsx:52-86` (`handleImageMouseEnter`, `handleImageMouseLeave`)
  and the portal at `:118-133`. The lazy full-image load at `:30-50` stays for the reader and
  copy.
- `src/renderer/src/hooks/useNativeContextMenu.ts`: imported by nothing. With it the preload
  methods `showClipContextMenu`, `onContextMenuAction`, `removeContextMenuListeners`
  (`src/preload/index.ts:152-161`) and the `show-clip-context-menu` handler
  (`src/main/ipc/index.ts:114-160`), which have no other callers.
- `src/renderer/src/hooks/usePatternDetection.ts` and `.test.ts` (17.3).
- The pattern badge at `ClipWrapper.tsx:96-103` (`Clip.module.css:108-114`); dots replace it.
- `src/renderer/src/components/UpdateBanner.tsx`, `.module.css`, `.test.tsx`; the status bar pill
  replaces it.

Settings window:

- `src/renderer/src/components/settings/QuickClipsManager.tsx`: imported by nothing.
  `QuickClipsManager.module.css` is imported by five live files (`ToolsManager.tsx:8`,
  `quickclips/InfoTooltip.tsx:3`, `SearchTermsSection.tsx:7`, `TestPatternsSection.tsx:6`,
  `ToolsSection.tsx:6`) and goes with them in step 3 of the plan.
- `ToolsManager.tsx`, `TemplateManager.tsx` (+ `.module.css`), `quickclips/*` (all five files
  and the barrel), replaced by the Tools tab of section 14.
- `usersettings/LoadingState.tsx`, `usersettings/SavingIndicator.tsx`, `usersettings/ErrorState.tsx`,
  `usersettings/CloseButton.tsx` (never rendered: `Settings.tsx:60,70` pass no `onClose`),
  `hotkeys/LoadingState.tsx`, `hotkeys/SavingIndicator.tsx`, `hotkeys/HotkeyInstructions.tsx`,
  `hotkeys/HotkeyHeader.tsx`, `Versions.tsx` (+ `.module.css`), and the inline toggle markup in
  `hotkeys/GlobalToggle.tsx:29-47` and `hotkeys/HotkeyList.tsx:62-84` with its `.toggle` and
  `.slider` rules in `HotkeyManager.module.css` (15.7). `usersettings/ToggleSwitch.tsx` is the one
  toggle that stays.
- The eleven `alert()` and `confirm()` calls (`useStorageSettings.ts:54,66,69,74,82,90,94,99`,
  `useHotkeyManager.ts:194`, `ToolsManager.tsx:345`, `QuickClipsManager.tsx:344`).
- `StorageSettings.module.css`, `Settings.module.css`, `UpdaterControl.module.css`,
  `HotkeyManager.module.css`, `QuickClipsManager.module.css`, `TemplateManager.module.css`,
  `Versions.module.css`: every one is imported today (there is no orphaned CSS file under
  `src/renderer`; each of the twenty was checked), and every one goes when its components are
  rewritten against the one variable set.

Preload methods with no caller today, removed while the file is open: `getClipboardText`,
`getClipboardHTML`, `getClipboardRTF`, `getClipboardImage`, `getClipboardBookmark`,
`closeSettings`, `getSettings`, `searchTermsReorder`, `searchTermsTest`, `quickToolsReorder`,
`quickToolsValidateUrl` (`src/preload/index.ts:32-36,58-59,112-114,124-126`), with their handlers.

### 17.7 Notifications

Three call sites exist (`src/main/notifications/index.ts` and grep for `showNotification`):
`notify-clip-copied` (`src/main/clipboard/ipc.ts:108-110`, fired by the renderer after a number
cell copy, `providers/clips/clipboard.ts` via `notifyClipCopied`), the hotkey copy
(`src/main/hotkeys/actions.ts:76`) and "Template Generated" (`ipc.ts:174`). The first and third go
with their IPC handlers and the `notifyClipCopied` preload method; the renderer toasts instead.
The hotkey one stays, and its text changes from "Clip N copied to clipboard" to name the clip's
first line, since the window may be hidden and "Clip 2" means nothing there. `showNotifications`
defaults to `false` (`src/main/storage/defaults.ts:50`); the General tab's Notifications toggle is
the only thing that turns it on, and the tooltip says it covers hotkey copies only.

### 17.8 What the design assumes and the code does not do

- No variable set exists for the clips window. `assets/base.css:27-60` defines one and nothing in
  the window uses it: every clips-window stylesheet hardcodes a dark and a `.light` pair, and
  `isLight` appears 265 times in 48 files. Add `src/renderer/src/assets/theme.css` with the full
  set (panel, row, line, text, muted, dim, accent, green, amber, red, `--slot-0` to `--slot-11`,
  the template pill's type colours) on `:root` and the light values on `body.light`, which
  `theme.tsx:44-50` already sets. Both windows import it. The `isLight` branches go as each
  component is rewritten; none survive in the clips window after step 2 or in settings after
  step 3.
- `faEye` and `faCopy` are not registered in `src/renderer/src/fontawesome.ts:38-72`;
  `ClipContextMenu.tsx:118` already uses `icon="copy"` and renders nothing. Register `faEye`,
  `faCopy`, `faLink`, `faImage`, `faCode`, `faTableCells`, `faArrowUp`, `faArrowDown`,
  `faThumbtack`, `faTextWidth`, `faFileLines` (present), `faCircle`, `faChevronLeft`,
  `faChevronDown`, `faRotateLeft`, `faUpload` for the new surfaces. Remove `faRocket`,
  `faUserCog`, `faSignOutAlt`, `faCheckSquare`, `faPaperclip`, `faWrench` once their callers go.
- Inline edit's 500ms live save (`TextClip.tsx:55-69`) fires before Esc can revert
  (`:110-117`). Section 4 says Esc cancels. The live save goes; commit happens on Enter and
  blur only, and Esc restores the pre-edit content. Same editor inside the reader.
- The clip save queue coalesces: a save arriving while one is in flight awaits that promise and
  returns without writing the newer state (`src/main/storage/index.ts:253-257`). An edit committed
  in the reader during a save can be lost on quit. Queue the newest state instead of dropping it.
- `ClipContextMenu`'s disabled items are `div`s with a class (`ClipContextMenu.tsx:126,138,149`)
  whose handlers still fire; rule 9 needs real `disabled` semantics (`aria-disabled`, no handler).
- `normalizeSettings` leaves a stored `hotkeys` map missing a key missing, and
  `manager.ts:68` then throws. The deep merge in 17.2 fixes it.
- `getSettings()` in `src/main/clipboard/storage-integration.ts:27-34` returns `{}` cast to
  `UserSettings` on failure, so `maxClips` can be `undefined` downstream. Return the defaults.
- `index.html` has a CSP (`default-src 'self'; script-src 'self'; style-src 'self'
  'unsafe-inline'; img-src 'self' data:`); `settings.html` has none. Give it the same one. The
  sandboxed iframe's own CSP is inside its `srcdoc` and is unaffected.
- The settings window is `resizable: false` (`creation.ts:60`); 15.2's 720 x 440 layout needs it
  resizable with the minimum from 17.2.
- Search terms have `enabled` (`src/shared/types.ts:164-172`) and the scanner honours it; no UI
  sets it today. Tools and templates have no `enabled` flag and do not get one (14.4 toggles terms
  only).
- Hotkeys are off by default (`defaults.ts:5`). The status bar button (rule 5) is the path to
  quick look for everyone else; the hotkey row's description in 15.6 says the master toggle is
  off until turned on.
- `e2e/tools.spec.ts:258-361` drives the launcher window and fails the moment it goes; it is
  rewritten in step 2 of the plan, before step 4 removes the window.
