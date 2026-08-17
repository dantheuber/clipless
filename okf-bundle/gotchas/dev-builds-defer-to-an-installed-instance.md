---
type: gotcha
title: Dev Builds Silently Defer to an Installed Instance
tags:
  - development
  - electron
  - linux
timestamp: 2026-08-17T04:02:57.964Z
status: stable
---

`npm run dev` uses the same `userData` directory as an installed Clipless
(`~/.config/clipless` on Linux). The app takes a single-instance lock in
`src/main/index.ts`, so when an installed copy is already running the dev
instance **fails the lock and calls `app.quit()` immediately** — and the
*installed* process receives `second-instance` and shows its own window
(`src/main/app/index.ts`).

The failure mode is that this looks like success: a Clipless window pops to the
front the moment dev starts. Nothing indicates the window belongs to a different
build. Symptoms:

- Code changes never appear, no matter how many times you rebuild.
- Bugs you already fixed keep reproducing "in dev".
- `electron-vite dev` prints `start electron app...` and then exits 0 within seconds.

Clipless minimizes to tray, so closing its window does not quit it — an installed
copy can hold the lock for weeks without being noticed.

Diagnosis: `ps -o pid,lstart,cmd -C clipless`. If a process predates your last
build, that is what you are looking at.

Two ways out:

- `pkill -f '/opt/Clipless/clipless'` before starting dev. Clips are persisted
  under `~/.config/clipless/clipless-data` and survive.
- Give dev its own profile: `npx electron-vite dev -- --user-data-dir=/tmp/clipless-dev`.
  This also keeps dev runs from mutating real clip history — related:
  [E2E Tests Touch the Real System Clipboard](/gotchas/e2e-tests-touch-system-clipboard.md).

The same shadowing hits packaged installs: `apt install` of a new .deb does not
restart a running app, and replacing `app.asar` under a live process invalidates
the archive offsets it cached — reads of `settings.html` then return bytes from
the middle of another packed file, and the settings window renders that JS as
plain text. It looks like a renderer bug; it is a stale process.

See also [Non-Blocking Startup](/decisions/non-blocking-startup.md) for the
single-instance lock in its intended role.
