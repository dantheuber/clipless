---
type: decision
title: "Quick look step 4 calls: base.css had nothing to fold, main.css keeps
  the body type, every site screenshot refreshed"
tags:
  - quick-clips
  - css
  - testing
  - screenshots
  - docs
timestamp: 2026-08-23T08:34:34.259Z
status: stable
---

Step 4 of `docs/specs/implementation-plan.md` (remove the launcher window) shipped on branch `t3code/quick-look-step-4` as PR #149 on 2026-08-23, stacked on the [step 3 calls](quick-look-step-3-calls-hotkey-rollback-in-the-renderer-no-clipsprovider-in-settings-a-restart-ipc-e2e-windows-open-at-their-minimum.md). The deletions were the lists in spec 17.6 and needed no call; three things around them did.

- **`base.css` was not launcher-only, and there was nothing to fold.** Spec 17.6 says the file goes "after its `:root` variables are folded into the one theme file". The grep showed `assets/main.css` (the main window's stylesheet) `@import`ing it, yet no live rule outside the launcher used any of its 65 variables; the only users were dead electron-vite template rules in `main.css` (`.logo`, `.versions`, `.updater-control` and friends) and `theme.css` shares no variable name with it. What the main window did take from `base.css` was the `body` typography (font, line height, font smoothing). That moved into `main.css` reading `var(--sans)` and `var(--text)`, and the template rules went. `main.css` is 32 lines now: the Tailwind import, `body` and `#root`. The settings window never loaded either file.
- **`QuickClipsScanner.test.tsx` went with `quickClipsSelection.ts`.** The test never imported the component; it covered the selection helpers, which have no caller once the scanner is gone. Eleven tests fewer (904 in 83 files).
- **Every screenshot under `site/assets/screens` was regenerated, not only the patterns pair.** The plan asks for `npm run screenshots` because the capture spec drove the launcher. The harness had also rotted since steps 2 and 3 (the filter input selector, clip ids on the demo data, the search bar bleeding into later shots) and the committed main and settings shots still showed the windows from before the redesign, so the README and site were illustrating an app that no longer existed. Refreshing all ten is two binary copies per page and reverts cleanly if the user wants only the patterns pair. The patterns shot is quick look on the newest demo clip with its IP pinned and the tray showing VirusTotal and AbuseIPDB.
- **The screenshot harness runs under the Linux x11 wrapper** with `CLIPLESS_PLAINTEXT_STORAGE=1` in the launch env and explicit `setSize` calls for both windows (the 0 x 0 work area of the [e2e gotcha](../gotchas/e2e-on-linux-playwright-forces-the-basic-password-store.md) applies to it too).
- **Not a step 4 concern, noted for later:** `e2e/quick-look.spec.ts` has a focus race in the "with a filter typed" case (the row takes focus back through `requestAnimationFrame` in `Clips.tsx` `focusRow` a few milliseconds after the spec focuses the input, so the second Escape hits the row and the search bar stays open, which then fails the two cases after it). It reproduced on step 3's commit too. The fix is to wait for `clip-row` to be the active element before focusing the input, as the case at line 112 already does.

## Verification

On 2026-08-23: 904 unit tests in 83 files, 100% statements, branches, functions and lines on every file a test imports; lint 0 errors (37 pre-existing warnings, 39 at step 3's tip); typecheck clean; `npx electron-vite build` emits `index.html` and `settings.html` only; the Playwright suite 36 of 36 on Linux with the wrapper recipe (35 existing, 1 new in `e2e/app-launch.spec.ts`), green on the third full run after two runs hit the focus race above; `npm run screenshots` 2 of 2. Spec 13's first bullet, "No Tools Launcher window exists", is met: no file under `src` names the window except the settings migration for the old `openToolsLauncher` hotkey key.

The stack was then collapsed into PR #146 against `main` (the step 1 branch fast-forwarded to the step 4 tip; #148 and #149 closed, #147 auto-marked merged into the step 1 branch). CI on Windows found three things the Linux runs had not:

- `e2e/settings.spec.ts` sized the settings window with `setSize`, which on Windows includes the 16 px frame, so `innerWidth` read 884 for 900. `setContentSize` gives the same `innerWidth` on every platform.
- `e2e/context-menu.spec.ts` clicked the body at (5, 5) to close the menu; in the redesigned window that is row 1's number cell, which copies the clip and toasts, and two cases later the toast was still visible and `getByTestId('toast')` matched two elements. The case clicks the status bar now and the copy case filters its toast by text.
- `extract-html.test.ts` asserted a 1 MB extraction under 250 ms; a runner took 253 ms under coverage. The bound is 2 s, enough to catch a quadratic regression.
- `validate-pr` refuses a `package.json` version that is already tagged; `main` was at the released 1.8.10, so the PR bumps to 1.9.0.
