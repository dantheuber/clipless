---
type: decision
title: "Quick look step 2 calls: chips only from terms, tools in every group row
  they use, image size at capture, plaintext storage under test"
tags:
  - quick-clips
  - quick-tools
  - ux
  - testing
  - security
timestamp: 2026-08-23T03:58:07.391Z
status: stable
---

Step 2 of `docs/specs/implementation-plan.md` (the clips window) shipped on branch `t3code/explore-tool-launcher-ux` on 2026-08-23, building on the [step 1 calls](quick-look-step-1-calls-replace-mode-scan-after-terms-load-clip-template-means-no-named-tokens.md) and the [engineering decision](quick-look-engineering-pins-shared-scan-groupcolours-slots-hotkey-rename-sanitiser-in-main.md). These are the calls the spec left to the code, so step 3 and 4 build on the same reading.

- **A bookmark's URL is a chip only when a search term matches it.** Spec 16 rule 6 says "the URL as a `url` chip"; section 10 says nothing is highlighted the user did not configure. Section 10 wins: the row scans `title + '\n' + url` like any text, so a `url` term (the library has one) produces the chip. Section 16 rule 6 is not edited.
- **A multi-token tool appears in every tray row whose group it uses**, with the same multiplier, and Open all counts its URLs once. Spec 6 says "one button per compatible tool" per group row and section 8 says a tool is offered only when every token is pinned; a `{ip}/{ticket}` tool is therefore in both rows once both are pinned. `useToolUrls` (`components/tray/useToolUrls.ts`) is the one place this is decided.
- **A fourth pruning reason exists.** The spec names three (after the edit, deleted with clip N, rotated out of the list). A pin can also vanish because the search terms changed while the holding clip did not; the notice then says "after the search terms changed". Delete is recognised by the diff shape (one slot became an empty clip while every other slot kept its id), because `emptyClip` gives the row a new id.
- **Image clips record `imageWidth`, `imageHeight` and `imageBytes` at capture** (`imageMetadata` in `src/main/clipboard/monitoring.ts`), so the row can say "1280 x 720, 412 KB" without loading the full image. Older image clips show the size estimated from the thumbnail and "size unknown" in the reader until the full image loads.
- **Chips and the editor overlay tokenise with `refractor` directly**, per line, through `components/quick-look/tokens.ts`; `react-syntax-highlighter` is gone and `refractor` is a direct dependency. `tsconfig.web.json` uses `moduleResolution: bundler` so its `exports` subpaths type-check.
- **The reader draws inside the list area**, not over the whole window: the tray, search bar and status bar stay usable while it is open, which is what "pins persist across the walk" and "the tray survives quick look opening" need.
- **The rendered view's text colour comes from the `--text` variable** read off the body at render time, so the frame follows the theme without an `isLight` branch.
- **A template copy lands as a new clip.** The pill writes the clipboard with `set-clipboard-text` and the monitor captures it, as the launcher window's copy did. The toast is the confirmation.
- **The Esc stack is emergent, not a registry.** The editor stops Esc in its own handler, the dialog handles Esc on itself, the search input on itself, the context menu on `document` in the capture phase, and `ConfirmDialog` on `window` in the capture phase with `stopImmediatePropagation`, so whichever has focus or is topmost wins without a shared stack.
- **`CLIPLESS_PLAINTEXT_STORAGE=1` makes the e2e suite run on Linux.** See [E2E on Linux](../gotchas/e2e-on-linux-playwright-forces-the-basic-password-store.md). It is a test-only switch in `initializeApp()`, ignored off Linux.
- **Not done in step 2, on purpose:** the launcher window files, `quick-clips-scan-text` and the settings Test Patterns tab stay (steps 3 and 4); `getSettings()` in `storage-integration.ts` still returns `{}` on failure; `ConfirmDialog` keeps its `isLight` pairs until step 3 rewrites settings.

## Verification

On 2026-08-23: 757 unit tests in 60 files, 100% statements, functions and lines on every file a test imports (see [coverage gotcha](../gotchas/coverage-is-100-of-the-files-tests-import-not-of-the-tree.md)); lint and typecheck clean; the Playwright suite 31 of 31 on Linux with the wrapper recipe and `CLIPLESS_PLAINTEXT_STORAGE=1` (18 existing cases, 13 new in `e2e/quick-look.spec.ts` and the two rewritten describes of `e2e/tools.spec.ts`). Not checked by eye: the window at 380px wide and 300px tall in both themes (16.3's last bullet); the rules are implemented and unit-tested through the media query hook.
