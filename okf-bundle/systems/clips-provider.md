---
type: system
title: Clips Provider (Renderer State)
tags:
  - renderer
  - react
  - state
timestamp: 2026-07-10T00:54:37.963Z
---

Renderer clipboard state lives in `src/renderer/src/providers/clips/`, a modular React Context provider refactored from one large file. `providers/clips.tsx` remains as a re-export wrapper for backward compatibility.

Modules, each a focused hook:

- `storage.ts` -- `useClipsStorage`: loads clips/settings on mount, saves with debouncing, listens for the `storage-ready` event (see [Non-blocking startup](/decisions/non-blocking-startup.md)) and for settings updates from other windows
- `clipboard.ts` -- `useClipboardOperations`: subscribes to `clipboard-changed`, copies clips back with correct format handling, tracks hotkey-initiated copies to prevent them re-entering history as duplicates
- `state.ts` -- `useClipState`: clip array manipulation -- get, empty, update, lock/unlock, duplicate detection, and the `clipboardUpdated` insert logic
- `index.tsx` -- `ClipsProvider` orchestrates the hooks; consumers use `useClips` (plus split contexts `useClipsData` / `useClipsMeta` / `useClipsActions` to limit re-renders)

Clip rendering is type-dispatched: `components/clips/clip/` has one component per clip type (TextClip, HtmlClip, ImageClip, RtfClip, BookmarkClip). TextClip does programming-language detection with syntax highlighting, toggleable via the languageDetection provider.

Other providers: `theme.tsx` (light/dark/system -- `useTheme()` is the most-connected symbol in the codebase per the graphify graph) and `languageDetection.tsx`.
