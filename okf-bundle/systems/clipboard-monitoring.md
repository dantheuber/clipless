---
type: system
title: Clipboard Monitoring
tags:
  - clipboard
  - main-process
  - polling
status: stable
generated:
  by: claude-code/fable-5
  at: 2026-08-23T16:45:08.112Z
verified:
  by: claude-code/fable-5
  at: 2026-08-23T14:00:00Z
---

The main process monitors the system clipboard by **polling every 250ms** (`src/main/clipboard/monitoring.ts`, `setInterval` in `startClipboardMonitoring`) -- Electron has no clipboard-change event, so polling is the mechanism, not a shortcut. `checkClipboardNow()` runs one poll on demand; the quick look hotkey uses it so a copy made just before the hotkey is what the reader shows ([hotkeys](../systems/hotkeys.md)).

Each poll calls `getCurrentClipboardData()` (`data.ts`), which reads available formats and classifies the clip as one of five types: text (with programming-language detection in the renderer), HTML, RTF, image, or bookmark (URL + title). Change detection compares content + type against the last-seen values.

Work done at capture, in the main process, so the renderer never parses markup:

- HTML and RTF clips get their plain text extracted (`htmlparser2` walk for HTML, a hand-written RTF tokenizer) and stored as `ClipItem.text`; that text is what rows show and what the scanner reads. The rendered HTML view is sanitised on demand through `html-sanitize`. Why main: [Quick look engineering calls](../decisions/quick-look-engineering-calls.md).
- Image clips record `imageWidth`, `imageHeight` and `imageBytes` so the row can state the size without loading the full image.

Image handling specifics (all verified in source):

- Image change detection uses a cached **fingerprint** (dimensions + bitmap byte length + first 64 bytes) so the expensive `toDataURL` is not run on every poll.
- On capture, the image is immediately saved to the encrypted image store and the renderer receives `{imageId, thumbnailDataUrl}` -- the full image never travels over IPC unless the store write fails (then it falls back to inline data URL).
- A `skipNextImageChange` flag is set when copying an image clip back to the clipboard, so it is not re-detected as a new clip.

Division of labor: main only does change detection; **duplicate detection happens in the renderer** ([Clips Provider](../systems/clips-provider.md)) after receiving the `clipboard-changed` IPC event. Clips can be locked to prevent rotation out of history (capped at `maxClips`, default 10). A template copy from the tray is a plain clipboard write, so the generated text lands as a new clip through this monitor.

Gotcha: because monitoring is real and global, [e2e tests touch the actual system clipboard](../gotchas/e2e-tests-touch-system-clipboard.md).
