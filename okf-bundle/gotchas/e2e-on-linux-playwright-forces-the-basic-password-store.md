---
type: gotcha
title: "E2E on Linux: Playwright forces the basic password store; set
  CLIPLESS_PLAINTEXT_STORAGE=1"
tags:
  - testing
  - playwright
  - electron
  - linux
timestamp: 2026-08-23T05:47:18.714Z
---

Observed 2026-08-23 on Ubuntu (GNOME, Wayland) while verifying quick look step 1, and reproduced against the pre-change commit `427af1e` with the same errors.

**Playwright's basic password store leaves safeStorage without encryption on Linux.** Playwright's Electron loader (`playwright-core/lib/server/electron/loader.js`) appends its Chromium switches to every launch, and that list includes `--password-store=basic` and `--use-mock-keychain`. With the basic store Electron's `safeStorage.isEncryptionAvailable()` is `false` on Linux (`getSelectedStorageBackend()` reports `basic_text`), so the first `saveEncryptedJson` throws "Error while encrypting the text provided to safeStorage.encryptString. Encryption is not available." Every e2e test that creates a search term, tool or template hits it. CI is not affected because `.github/workflows/test.yml` runs the e2e job on `windows-latest`, where DPAPI is always available.

**The switch (step 2, 2026-08-23).** `initializeApp()` in `src/main/app/index.ts` calls `safeStorage.setUsePlainTextEncryption(true)` when `CLIPLESS_PLAINTEXT_STORAGE=1` is set and the platform is Linux, before the first storage write. `e2e/tools.spec.ts`, `e2e/quick-look.spec.ts` and `e2e/settings.spec.ts` pass that variable through `electron.launch({ env })`, so every e2e test runs on Linux. Nothing else sets it, and it is ignored off Linux; a normal launch keeps the OS keyring. The five tools-spec failures from step 1 are gone with it.

**Getting Electron to launch from a Claude Code shell** took three environment fixes; none is a code change:

- The shell sets `ELECTRON_RUN_AS_NODE=1`, which makes Electron start as plain Node (`electron.app` is undefined, "Process failed to launch!" within 25 ms). Launch with `env -u ELECTRON_RUN_AS_NODE`.
- AppArmor restricts unprivileged user namespaces (`kernel.apparmor_restrict_unprivileged_userns=1`), so Chromium falls back to the SUID helper and aborts because `node_modules/electron/dist/chrome-sandbox` is not root-owned 4755. Without root, a symlink from that path to the root-owned `/opt/google/chrome/chrome-sandbox` passes the check (stat follows the link and SUID applies to the executed file). `CHROME_DEVEL_SANDBOX` is not honoured by Electron's build.
- Electron 42 picks the Wayland backend by itself there and never reaches `ready` (the last log line is a D-Bus `GetNameOwner` for `org.freedesktop.login1`); `ELECTRON_OZONE_PLATFORM_HINT=x11` is ignored but the `--ozone-platform=x11` switch works. The specs pass fixed `args` to `electron.launch`, so the switch has to come from a wrapper script in place of `node_modules/electron/dist/electron` that execs the real binary (moved to `electron.real`) with it. Restore the binary and the sandbox file afterwards.

**Windows open at their minimum size under the wrapper (step 3, 2026-08-22).** With the x11 wrapper `screen.getPrimaryDisplay().workAreaSize` is `{ width: 0, height: 0 }`, `calculateWindowPosition` places windows at negative x, and Electron sizes each new window to its minimum: the settings window, asked for 900 x 600 with a 720 x 440 minimum, appears at 720 x 440. On a real display it is 900 x 600. An e2e test that needs a size must `win.setSize()` it first (`e2e/settings.spec.ts` does), and one that asserts the default size will fail here for no reason of the app's.

Run the whole thing from the repository root: a `cd` into `node_modules/electron/dist` that leaks into the Playwright command makes it report "No tests found".

The e2e suite still writes the real clipboard while it runs (see [E2E Tests Touch the Real System Clipboard](e2e-tests-touch-system-clipboard.md)).
