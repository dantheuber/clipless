---
type: gotcha
title: Windows startup notification on login-item rewrite
tags:
  - windows
  - autostart
  - electron
generated:
  by: human:dantheuber
  at: 2026-08-10T17:52:07.756Z
---

Windows 11 shows a "this app is set to run when you sign in" toast whenever a
value under the `Run` registry key is written -- even if the value already
exists with identical data. Deleting and re-adding an entry triggers it too.

Clipless reconciles autostart on every launch (`applyAutoStart` in
`src/main/autoStart/index.ts`, called from `app/index.ts` after background
storage load). The original implementation unconditionally cleared the legacy
`com.electron` entry and re-set the current one on every boot, so users got the
Windows startup toast on every single launch.

Fix (2026-08-10): `applyAutoStart` reads `app.getLoginItemSettings()` first and
only calls `setLoginItemSettings` when state actually differs:

- The legacy `com.electron` entry is removed only when it appears in
  `launchItems` (Windows-only field), and the current entry is rewritten right
  after that migration so autostart survives the value-name change.
- Otherwise it writes only when `openAtLogin !== enabled`. On Windows,
  `openAtLogin` reflects entry existence even when the user disabled it in Task
  Manager (`executableWillLaunchAtLogin` is the one that accounts for the
  disabled state), so a Task-Manager-disabled entry is left alone rather than
  force-re-enabled every boot.

Rule of thumb: any per-launch reconcile against `setLoginItemSettings` must be
idempotent-by-read, not idempotent-by-rewrite.

Related: [non-blocking startup](../decisions/non-blocking-startup.md)
