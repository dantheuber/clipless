---
type: system
title: Templates
tags:
  - templates
  - text-generation
  - settings
timestamp: 2026-08-23T05:48:17.492Z
---

Templates generate standardized text from clipboard data. A template is a text body with token placeholders; tokens are filled from values extracted by [Quick Clips](/systems/quick-clips.md) named capture groups (same token vocabulary as tool URLs).

- Engine: `generateTextFromTemplate` and `extractTemplateTokens` in `src/shared/templates.ts` (moved out of `src/main/storage/templates.ts` in step 1 of the quick look plan so both windows and the main process run the same code). Tokens are `{name}`; `{c1}`, `{c2}`, ... are positional and mean row 1, row 2, ... of the list, whichever row was right-clicked (spec 16.2). The token regex is `\w+`, so templates never parse the `{a|b}` pipe form tool URLs accept.
- Main-process CRUD and ordering: `src/main/clipboard/templates.ts` and `src/main/storage/templates.ts`. Stored alongside search terms, quick tools and `groupColours` in `templates.enc`; export and import with the rest of the Quick Clips config.
- Readiness (spec 7 and 14.4) is `src/shared/readiness.ts`: `templateReadiness(template, pinsByGroup, openClipScan?)` returns `ready` (first pinned value per token, with counts for "first of N"), `needs` (missing tokens, plus the pin keys to take from the open clip when it has them all) or `clip-template` (no named tokens at all, positional only). `configReadiness` and `sampleReadiness` give the four settings wordings: "never ready", "needs X, producer disabled", "sample lacks X", "ready on the sample".
- In the clips window (step 2) a template with named tokens is a pill in the tray footer and the reader footer (`components/TemplatePills.tsx`): ready copies the generated text with `set-clipboard-text` and toasts the name, the character count and the values used ("ip 203.0.113.42 (first of 2)"); not ready is dimmed and names the missing tokens; in the reader a not-ready pill pins the missing values from the open clip when it has them all, and is inert with a tooltip otherwise. `t` in the reader copies the first ready one. The copy is a plain clipboard write, so the generated text lands as a new clip through the monitor, as the launcher window's copy did. `templates-generate-text` and its "Template Generated" notification are gone.
- Clip templates (no named tokens) live in the row context menu's "Fill clip template" submenu, previewed from rows 1 to 3, copied with the same toast. A row with none shows the submenu disabled with "no clip templates".
- Made in Settings > Tools since step 3 (`components/settings/tools/TemplateEditor.tsx`): name, text, a token picker of groups with a producer, the readiness line (or "clip template" for a positional-only template), and the generated text for the sample with values coloured by group. The list pane shows a hollow dot for clip templates; Uses says a clip template has no producers and never appears in the tray. `TemplateManager` is gone.

Use cases: standardized support responses, report generation, format conversion between systems -- populate a canned structure with the customer email / ticket ID / account number you just copied.
