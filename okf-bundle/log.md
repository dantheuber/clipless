# Update Log

## 2026-08-22
* **Spec closed**: quick look redesign is implementable. All open questions in `docs/specs/quick-look-redesign.md` (12, 14.8, 15.8) and the outliers addendum decided; addendum folded in as section 16 (locked); engineering section 17 added with verified file references; `docs/specs/implementation-plan.md` written (four steps: vocabulary and storage, clips window, settings window, remove the launcher). Contrast pass fixed three light bucket values in `settings-tools-prototype.html`. Decisions: outliers promoted to stable, new engineering decision added.
* **Decision**: engineering choices for the quick look redesign recorded (spec section 17, implementation-plan.md).
* **Update**: quick look outliers decision locked (was draft); its six open questions decided and the rules folded into spec section 16.
* **Update**: `docs/specs/index.html` is the hub for the redesign; it embeds the clips window, outliers, Settings Tools and Settings shell prototypes in order, and every prototype page carries a shared nav strip
* Quick look outliers: rendered HTML must never run code (inert parse, allowlist, sandboxed iframe with default-src none); icons are the app's FontAwesome set; light theme covered in every prototype
* Settings shell decision: light theme is in scope (one variable set, swapped per theme), no longer an open question
* Draft decision: the clips window features the quick look spec does not cover (search bar, status bar buttons, update banner, image/HTML/RTF/bookmark clips, clip templates, live list, narrow windows, light theme), with proposed rules and a prototype
* Tools tab decision: spec locked as a whole, status draft to stable
* Settings shell decision locked in the spec (section 15)
* Settings shell decision: C (dense grid) chosen on review over the first recommendation E
* Link the Tools decision to the General and Hotkeys shell decision
* Draft decision: Settings shell for General and Hotkeys (variation E from settings-shell-variations.html, with grafts from B and C)
* Quick Clips: add status note pointing at the settings Tools tab redesign and the three BUILTIN_PATTERNS copies
* Settings Tools tab decision locked: master-detail inspector with group colour bucket; spec section 14 and standalone prototype added
* Settings redesign decision: direction is the master-detail inspector (E) with a per-group colour bucket; D's tray preview, Problems filter and sample-driven library suggestions to be folded in
* Rename settings redesign decision: direction changed from sample-first workbench (D) to master-detail inspector (E) after review
* Add draft decision: settings redesign variations for search terms, tools and templates; recommends the sample-first workbench (D) with E's fix buttons and start-from page
* Record the decision to replace the Tools Launcher window with in-window quick look + pin tray (spec in docs/specs)

## 2026-08-17
* document how the single-instance lock makes npm run dev hand off to an installed copy

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
