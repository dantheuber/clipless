---
type: decision
title: "Quick look step 1 calls: replace mode, scan after terms load, clip
  template means no named tokens"
tags:
  - quick-clips
  - storage
  - templates
  - scanning
  - updater
timestamp: 2026-08-23T02:08:26.000Z
status: stable
---

Step 1 of `docs/specs/implementation-plan.md` (vocabulary and storage) shipped on branch `t3code/explore-tool-launcher-ux` on 2026-08-23. The spec ([engineering decision](quick-look-engineering-pins-shared-scan-groupcolours-slots-hotkey-rename-sanitiser-in-main.md)) left a few things for the code to settle. These are the calls, so steps 2 and 3 build on the same reading.

- **Import `replace` replaces the lists, not only the colours.** Spec 17.2 defines the mode in terms of `groupColours` ("replace takes the file's map"). A replace that only touched colours would be the same as merge for terms, tools and templates, and 14.4 offers the two as alternatives. `storage.importQuickClipsConfig(config, 'replace')` therefore clears search terms, tools and templates and takes the file's lists and map; `merge` appends the lists (as the old append-only import did) and keeps existing colours, adding missing ones. Step 3's ExportImport preview should say so.
- **Nothing is scanned until the terms have loaded.** `ScanIndexProvider` keeps `terms` as null until `search-terms-get-all` answers and returns the empty scan meanwhile, rather than scanning every row against an empty list and again once the terms arrive. Rows show no chips for the first few milliseconds; the alternative was two scans per clip on every launch.
- **Clip template means no named tokens.** `templateReadiness` returns `clip-template` when `extractTemplateTokens(content).named` is empty, which covers positional-only templates and templates with no tokens at all. A template with both named and positional tokens is match-driven: the named tokens decide readiness and `{cN}` fill from rows as usual.
- **Config readiness wording for a pipe token** names the whole token (`ticket|user`); a pipe token is an orphan only when none of its alternatives has a producer and disabled only when none is enabled.
- **The sanitiser's `removed` map** keys tag names and attribute names together, so a clip with a `<style>` element and a `style=` attribute reports `style: 2`. One map is what the spec signature says; the side column can show it as is.
- **Extraction collapses `&nbsp;` and `\~` to a plain space** along with other whitespace runs, and treats the one space after an RTF control word as its delimiter (so `☈5 x` yields `日x`, per the RTF spec). Source line breaks in HTML are whitespace except inside `pre`.
- **`check-for-updates` in a dev build sets the state to `upToDate`**, which is what the old prose status showed; dev builds cannot check.
- **Clip ids are required on `ClipItem`.** Every test fixture carries one; `migrateData` backfills stored clips and the renderer's creators assign `crypto.randomUUID()` with a fallback for a renderer without Web Crypto.
- **Not done in step 1, on purpose:** `getSettings()` in `storage-integration.ts` still returns `{}` on failure (spec 17.8 lists it, no step claims it); the settings window is still 800 x 650 and not resizable (step 3 owns `creation.ts`); `toolsSampleText` has a type and rides `storage-save-settings` but no UI writes it until step 3.

Verification on 2026-08-23: 599 unit tests, 100% coverage of every file a test imports (see [coverage gotcha](../gotchas/coverage-is-100-of-the-files-tests-import-not-of-the-tree.md)), lint and typecheck clean. `graphify` is not installed on this machine and `graphify-out/` does not exist, so the CLAUDE.md graph update rule did not apply.
