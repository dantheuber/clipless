---
type: system
title: Secure Storage
tags:
  - storage
  - encryption
  - main-process
timestamp: 2026-07-10T01:01:59.094Z
---

`SecureStorage` (singleton in `src/main/storage/index.ts`) persists all app data encrypted with Electron's `safeStorage` API -- DPAPI on Windows, Keychain on macOS, Secret Service/libsecret on Linux. No key management in app code; keys belong to the OS user account.

Data lives in `<userData>/clipless-data/`, split into domain-specific files (see [Domain-split storage decision](/decisions/domain-split-storage.md)):

- `settings.enc` -- user settings (maxClips, theme, hotkeys, autoStart, transparency, alwaysOnTop, notifications, automaticUpdates)
- `clips.enc` -- clip history (content, type, lock status, timestamp)
- `templates.enc` -- templates, search terms, and quick tools together
- `meta.json` -- UNENCRYPTED; app version + `storageVersion` (currently 1) for migrations
- `window-bounds.json` -- UNENCRYPTED; read at startup without waiting for encryption init (see [Non-blocking startup](/decisions/non-blocking-startup.md))
- `images/{id}.enc` and `images/{id}_thumb.enc` -- full images and 200px-wide thumbnails (generated via `nativeImage.resize`) as separate encrypted files, written at capture time by [clipboard monitoring](/systems/clipboard-monitoring.md)

Behaviors verified in source (`file-operations.ts`, `index.ts`):

- All encrypted writes are **atomic**: write to `<file>.tmp`, then rename over the target.
- Per-domain save queuing serializes concurrent writes to the same file while different domains save in parallel; renderer saves are debounced.
- Internal JSON is compact (no pretty-printing) to minimize encrypted payload; user-facing export IS pretty-printed.
- If `safeStorage.isEncryptionAvailable()` is false, background load stops and the app keeps default in-memory data -- nothing persists and the only signal is a console warning; **the user is not notified**.
- Export/import round-trips all domains as unencrypted JSON for backup.
