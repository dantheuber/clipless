---
type: system
title: Clips Provider (Renderer State)
tags:
  - renderer
  - react
  - state
status: stable
generated:
  by: claude-code/fable-5
  at: 2026-08-23T16:44:54.229Z
verified:
  by: claude-code/fable-5
  at: 2026-08-23T14:00:00Z
---

Renderer clipboard state lives in `src/renderer/src/providers/clips/`, a modular React Context provider (the old single-file `providers/clips.tsx` wrapper is gone; import from the directory).

Modules, each a focused hook:

- `storage.ts` -- `useClipsStorage`: loads clips/settings on mount, saves with debouncing, listens for the `storage-ready` event (see [Non-blocking startup](../decisions/non-blocking-startup.md)) and for settings updates from other windows
- `clipboard.ts` -- `useClipboardOperations`: subscribes to `clipboard-changed`, copies clips back with correct format handling, tracks hotkey-initiated copies to prevent them re-entering history as duplicates
- `state.ts` -- `useClipState`: clip array manipulation -- get, empty, update, lock/unlock, duplicate detection, and the `clipboardUpdated` insert logic. `utils.ts` holds the clip creators (each assigns a `crypto.randomUUID()` id), `clipText` (what the scanner sees for each clip type) and `shrinkClips` (lowering `maxClips` drops the oldest unlocked clips first)
- `pins.ts` and `usePinPruning.ts` -- the pinned `group|value` set behind the tray, memory only, pruned with a reason when a value disappears from every clip
- `quickLook.ts` and `useOpenQuickLookSignal.ts` -- the reader's state (open clip by id, view: text, source or rendered) and the `open-quick-look` hotkey signal, which waits for a pending `clipboard-changed` before opening on row 1
- `index.tsx` -- `ClipsProvider` orchestrates the hooks; consumers use `useClips` (plus split contexts `useClipsData` / `useClipsMeta` / `useClipsActions` to limit re-renders)

Scanning is not in this provider: `providers/scan.tsx` (`ScanIndexProvider`) holds the Quick Clips config and one cached scan per clip id, see [Quick Clips](../systems/quick-clips.md).

Clip rendering: `components/clips/clip/ClipWrapper.tsx` dispatches by type to TextClip, HtmlClip, ImageClip, RtfClip and BookmarkClip; each renders one line at rest through `CollapsedLine` (chips from the scan, search marks) with `Editor` for inline editing and `ClipContextMenu` for the right-click actions. The full clip is only shown by the reader in `components/quick-look/` (`Content`, `SideColumn`, `SourceView`, `RenderedView`, `ImageView`), and the pinned set drives `components/tray/`. TextClip does programming-language detection with syntax highlighting, toggleable via the languageDetection provider.

Other providers: `theme.tsx` (light/dark/system; it also sets the twelve group colour slots on the root element) and `languageDetection.tsx`. The settings window mounts neither this provider nor language detection, see [Quick look engineering calls](../decisions/quick-look-engineering-calls.md).
