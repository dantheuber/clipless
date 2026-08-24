---
type: gotcha
title: Language detection over-labels prose as code
tags:
  - quick-clips
  - ux
status: stable
generated:
  by: okf-mcp/1.4.0
  at: 2026-08-24T15:11:16.054Z
sources:
  - id: dan
    title: Dan, 2026-08-24, asking for the label toggle
---

The heuristic detector in `src/renderer/src/utils/languageDetection.ts` often tags copied markdown or plain prose as `python` (or another language), so the row label on text clips was wrong often enough to annoy.[^dan]

Mitigation shipped 2026-08-24: a `showLanguageLabel` user setting (default on, only read while `codeDetectionEnabled` is on) hides the row tag without turning off detection or syntax highlighting. `LanguageDetectionProvider` exposes it as `isLanguageLabelEnabled`, already ANDed with code detection; `TextClip` gates the tag on that flag alone.

The real fix is still open: make `detectLanguage`/`isCode` less eager on prose (markdown headings, sentences with `:` and indentation are common false positives). If detection improves, this toggle stays useful but stops being a workaround.

[^dan]: Dan found "it labels a lot of things `python` when its just some markdown or something".
