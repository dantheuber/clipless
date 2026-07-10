---
type: system
title: Templates
tags:
  - templates
  - text-generation
timestamp: 2026-07-10T00:54:22.606Z
---

Templates generate standardized text from clipboard data. A template is a text body with token placeholders; tokens are filled from values extracted by [Quick Clips](/systems/quick-clips.md) named capture groups (same token vocabulary as [Tools Launcher](/systems/tools-launcher.md) URLs).

- Main-process logic: `src/main/clipboard/templates.ts` and `src/main/storage/templates.ts` (`generateTextFromTemplate`, CRUD, ordering).
- Stored alongside search terms and quick tools in `templates.enc`.
- Managed in Settings via `TemplateManager`; templates are orderable and export/import with the rest of the Quick Clips config.

Use cases: standardized support responses, report generation, format conversion between systems -- populate a canned structure with the customer email / ticket ID / account number you just copied.
