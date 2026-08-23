---
type: system
title: Quick Clips Pattern Scanning
tags:
  - quick-clips
  - regex
  - patterns
  - scanning
timestamp: 2026-08-23T03:54:18.367Z
---

Quick Clips is the pattern-extraction feature that makes Clipless "read" clips. Since step 1 of the quick look plan (branch `t3code/explore-tool-launcher-ux`, 2026-08-23) scanning is one pure function, `scanText(text, terms)` in `src/shared/scan.ts`, and it runs in the renderer with no IPC. Since step 2 the clips window renders every match as a chip and the pinned set drives the launch tray (see [Tools Launcher replaced by quick look](../decisions/tools-launcher-window-replaced-by-quick-look-and-pin-tray.md)).

How it works (verified in source):

- **Search terms** are regex patterns (stored in `templates.enc` via [Secure Storage](/systems/secure-storage.md)), each with an `enabled` flag and ordering. Users manage them in Settings.
- `scanText` compiles each pattern once with flags `gd` (`hasIndices`), so every named group carries `[start, end]` and chips know where to sit. It collects **named capture groups only**: a match with no named groups produces nothing, so a search term MUST use `(?<name>...)` groups. Group names are the token vocabulary shared with tool URLs and [Templates](/systems/templates.md). Disabled terms are skipped; a pattern that does not compile is skipped and reported in `ScanResult.errors`; an empty match advances `lastIndex` so a pattern that can match the empty string cannot loop. Matches are sorted by start, `groups` in order of first appearance, and overlapping matches from different terms are all kept; the row and the reader render the earlier one.
- The clips window holds a `ScanIndexProvider` (`src/renderer/src/providers/scan.tsx`): the Quick Clips config (search terms, tools, templates, `groupColours`) loads once, a `Map<clipId, { contentKey, result }>` caches one scan per clip and re-scans only when the clip's text changes, and the whole cache clears when the main process broadcasts `quick-clips-config-changed` after any search term, tool, template or `groupColours` write. Nothing is scanned until the terms have loaded. Clips above 256 KB of text are scanned in an idle callback; `getScan` returns null until then. `slotFor(group)` gives the colour bucket slot; components set `--gc: var(--slot-N)` and never a hex.
- What is scanned is `clipText(clip)` (`providers/clips/utils.ts`): the extracted `text` for html and rtf clips (produced in the main process at capture, see [clipboard monitoring](/systems/clipboard-monitoring.md)), `title + '\n' + url` for bookmarks, the content otherwise, nothing for images. A bookmark's URL is a chip only when a term matches it (spec section 10 wins over rule 6's wording).
- Readers of the scan in the clips window: `CollapsedLine` (the row's chips and search marks, first 2000 characters only), the reader's `Content` (per-line Prism tokens through `refractor`, split at match offsets in `components/quick-look/tokens.ts`), the side column, the tray and template readiness. Pins are a `group|value` map in the clips provider (`providers/clips/pins.ts`), memory only; `usePinPruning` drops pins whose key is in no clip's scan and names why (after the edit, deleted with clip N, rotated out of the list, after the search terms changed).
- `BUILTIN_PATTERNS` is one library in `src/shared/builtinPatterns.ts` (eight entries, group names `ip`, `email`, `domain`, `url`, `phone`, `mac`, `guid`, `ipv6`). It never runs on its own; adding an entry copies it in as a search term. Terms a user added from the old library keep their old group names (`ipAddress`, ...) because their tools reference them. The TLD list behind the domain pattern is `src/shared/tlds.ts`.
- `groupColours` (group name to colour bucket slot 0 to 11, never a hex) lives beside the search terms in `templates.enc`; the bucket and the resolver (override, then named default, then lowest free slot) are in `src/shared/groupColours.ts`. Save drops an entry whose group appears nowhere (`src/main/storage/group-colours.ts`). The theme provider sets `--slot-0` to `--slot-11` on the root element from the pair that matches the theme.
- Tool fan-out is `buildToolUrls` in `src/shared/tools.ts`; the tray, the reader's Launch button and the settings preview all count tabs with it (`components/tray/useToolUrls.ts`). Tabs open through the `open-external-urls` IPC, which accepts http and https only. Readiness wording is `src/shared/readiness.ts`.

Still present until step 3: the main-process `scanTextForPatterns` (`src/main/clipboard/quick-clips.ts`) behind `quick-clips-scan-text`, used only by the settings Test Patterns tab. `openToolsForMatches` and `quick-clips-open-tools` went in step 2; the [Tools Launcher](/systems/tools-launcher.md) window's code still compiles but nothing opens it.

Quick Clips configs (search terms, tools, templates, `groupColours`) export as version `2.0.0` and import with a mode, `merge` or `replace`. See [Settings for search terms, tools and templates](../decisions/settings-for-search-terms-tools-and-templates-master-detail-inspector.md) and `docs/specs/quick-look-redesign.md` sections 14 and 17.
