---
type: system
title: Templates
tags:
  - templates
  - text-generation
timestamp: 2026-08-23T02:07:17.085Z
---

Templates generate standardized text from clipboard data. A template is a text body with token placeholders; tokens are filled from values extracted by [Quick Clips](/systems/quick-clips.md) named capture groups (same token vocabulary as tool URLs).

- Engine: `generateTextFromTemplate` and `extractTemplateTokens` in `src/shared/templates.ts` (moved out of `src/main/storage/templates.ts` in step 1 of the quick look plan so both windows and the main process run the same code). Tokens are `{name}`; `{c1}`, `{c2}`, ... are positional and mean row 1, row 2, ... whichever row was right-clicked. The token regex is `\w+`, so templates never parse the `{a|b}` pipe form tool URLs accept.
- Main-process CRUD and ordering: `src/main/clipboard/templates.ts` and `src/main/storage/templates.ts`. Stored alongside search terms, quick tools and `groupColours` in `templates.enc`; export and import with the rest of the Quick Clips config.
- Readiness (spec 7 and 14.4) is `src/shared/readiness.ts`: `templateReadiness(template, pinsByGroup, openClipScan?)` returns `ready` (first pinned value per token, with counts for "first of N"), `needs` (missing tokens, plus the pin keys to take from the open clip when it has them all) or `clip-template` (no named tokens at all, positional only). `configReadiness` and `sampleReadiness` give the four settings wordings: "never ready", "needs X, producer disabled", "sample lacks X", "ready on the sample".
- Managed in Settings via `TemplateManager` until step 3 rebuilds the Tools tab.

Use cases: standardized support responses, report generation, format conversion between systems -- populate a canned structure with the customer email / ticket ID / account number you just copied.
