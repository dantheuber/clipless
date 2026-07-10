---
type: system
title: Quick Clips Pattern Scanning
tags:
  - quick-clips
  - regex
  - patterns
timestamp: 2026-07-10T01:02:13.442Z
---

Quick Clips is the pattern-extraction feature that makes Clipless "read" clips. Scanning happens in the main process: `scanTextForPatterns` in `src/main/clipboard/quick-clips.ts`, with the renderer hook `usePatternDetection` and the `QuickClipsScanner` UI on top.

How it works (verified in source):

- **Search terms** are regex patterns (stored in `templates.enc` via [Secure Storage](/systems/secure-storage.md)), each with an enabled flag and ordering. Users manage them in Settings -> Quick Clips -> Search Terms.
- `scanTextForPatterns` runs each enabled pattern with the `g` flag and collects **named capture groups only**. IMPORTANT: a match with no named capture groups is discarded -- a search term regex MUST use `(?<name>...)` groups to produce any results. Capture group names are the token vocabulary shared with [Tools Launcher](/systems/tools-launcher.md) URLs and [Templates](/systems/templates.md).
- A bad regex in one search term is caught and logged; other patterns still run.
- `BUILTIN_PATTERNS` (emails, IPs, URLs, phone numbers, etc.) is a library defined in the renderer settings components -- users add built-ins as search terms from the settings UI; they are not implicitly always-on in the scanner.
- When a clip matches, a scanner icon appears on it; opening it shows every extracted value, individually selectable.
- Domain/URL detection is TLD-aware: `src/renderer/src/utils/tlds.ts` maintains TLD lists (gTLDs, ccTLDs, special-use) used by the domain pattern.

Quick Clips configs (search terms + tools) are exportable/importable for team sharing.
