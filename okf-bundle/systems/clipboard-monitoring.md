---
type: system
title: Clipboard Monitoring
tags:
  - clipboard
  - main-process
  - polling
timestamp: 2026-07-10T01:01:44.183Z
---

The main process monitors the system clipboard by **polling every 250ms** (`src/main/clipboard/monitoring.ts`, `setInterval` in `startClipboardMonitoring`) -- Electron has no clipboard-change event, so polling is the mechanism, not a shortcut.

Each poll calls `getCurrentClipboardData()` (`data.ts`), which reads available formats and classifies the clip as one of five types: text (with programming-language detection in the renderer), HTML, RTF, image, or bookmark (URL + title). Change detection compares content + type against the last-seen values.

Image handling specifics (all verified in source):

- Image change detection uses a cached **fingerprint** (dimensions + bitmap byte length + first 64 bytes) so the expensive `toDataURL` is not run on every poll.
- On capture, the image is immediately saved to the encrypted image store and the renderer receives `{imageId, thumbnailDataUrl}` -- the full image never travels over IPC unless the store write fails (then it falls back to inline data URL).
- A `skipNextImageChange` flag is set when copying an image clip back to the clipboard, so it is not re-detected as a new clip.

Division of labor: main only does change detection; **duplicate detection happens in the renderer** ([Clips Provider](/systems/clips-provider.md)) after receiving the `clipboard-changed` IPC event. Clips can be locked to prevent rotation out of history (capped at `maxClips`, default 10).

Gotcha: because monitoring is real and global, [e2e tests touch the actual system clipboard](/gotchas/e2e-tests-touch-system-clipboard.md).
