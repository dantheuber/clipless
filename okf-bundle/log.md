# Update Log

## 2026-07-10
* Documented the manual gh-pages deploy process for clipless.app and the GA tracking added 2026-07-09
* Re-verified; added CI CSC skip and swallowed update-check errors
* Re-verified against defaults.ts; added exact default bindings and disabled-by-default master toggle
* Re-verified against app/index.ts; removed stale docs reference, added auto-start reconciliation and deferred update check details
* Re-verified against quick-clips.ts; removed stale docs reference, added named-capture-group requirement and BUILTIN_PATTERNS location
* Re-verified against source after stale docs/ deletion; removed docs/STORAGE.md reference, added atomic temp-file writes, confirmed fallback behavior
* Re-verified against monitoring.ts/data.ts; corrected dedup location (renderer, not capture), added image store + skip-flag details
* Re-verified against actual workflows after stale docs/ deletion; corrected workflow names, windows-only e2e, no Linux on merge-to-main, no promote workflow
* Initial brain population: e2e clipboard gotcha
* Initial brain population: macOS signing gotcha
* Initial brain population: release pipeline
* Initial brain population: domain-split storage decision
* Initial brain population: non-blocking startup decision
* Initial brain population: clips provider
* Initial brain population: templates
* Initial brain population: hotkeys
* Initial brain population: tools launcher
* Initial brain population: quick clips
* Initial brain population: clipboard monitoring
* Initial brain population: secure storage system
* Initial brain population: architecture
* Initial brain population: project overview
