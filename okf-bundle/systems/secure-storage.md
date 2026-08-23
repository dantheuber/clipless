---
type: system
title: Secure Storage
tags:
  - storage
  - encryption
  - main-process
status: stable
generated:
  by: claude-code/fable-5
  at: 2026-08-23T16:44:37.570Z
verified:
  by: claude-code/fable-5
  at: 2026-08-23T14:00:00Z
---

`SecureStorage` (singleton in `src/main/storage/index.ts`) persists all app data encrypted with Electron's `safeStorage` API -- DPAPI on Windows, Keychain on macOS, Secret Service/libsecret on Linux. No key management in app code; keys belong to the OS user account.

Data lives in `<userData>/clipless-data/`, split into domain-specific files (see [Domain-split storage decision](../decisions/domain-split-storage.md)):

- `settings.enc` -- user settings (maxClips, theme, hotkeys, autoStart, transparency, alwaysOnTop, notifications, automaticUpdates, `toolsSampleText` for the settings Tools tab sample). Every read passes through `normalizeSettings` (`settings.ts`), which migrates the old `openToolsLauncher` hotkey key to `quickLook` and deep-merges each hotkey action with its default.
- `clips.enc` -- clip history (id, content, type, lock status, timestamp, extracted text for HTML and RTF, image metadata). `migrateData` backfills an `id` on clips stored before 1.9.0.
- `templates.enc` -- templates, search terms, quick tools and the `groupColours` map together; this is what the Quick Clips config export (version `2.0.0`) and import (`merge` or `replace`) round-trip.
- `meta.json` -- UNENCRYPTED; app version + `storageVersion`. Intended to be 2 since 1.9.0, but nothing reads it and `migration.ts` (2) and `index.ts` (private constant, 1) disagree; see [Quick look engineering calls](../decisions/quick-look-engineering-calls.md).
- `window-bounds.json` -- UNENCRYPTED; read at startup without waiting for encryption init (see [Non-blocking startup](../decisions/non-blocking-startup.md))
- `images/{id}.enc` and `images/{id}_thumb.enc` -- full images and 200px-wide thumbnails (generated via `nativeImage.resize`) as separate encrypted files, written at capture time by [clipboard monitoring](../systems/clipboard-monitoring.md)

Behaviors verified in source (`file-operations.ts`, `index.ts`):

- All encrypted writes are **atomic**: write to `<file>.tmp`, then rename over the target.
- Per-domain save queuing serializes concurrent writes to the same file while different domains save in parallel; renderer saves are debounced. `app-restart` flushes the queue before relaunching.
- Internal JSON is compact (no pretty-printing) to minimize encrypted payload; user-facing export IS pretty-printed.
- If `safeStorage.isEncryptionAvailable()` is false, background load stops and the app keeps default in-memory data -- nothing persists and the only signal is a console warning; **the user is not notified**. The test-only `CLIPLESS_PLAINTEXT_STORAGE=1` switch (Linux only) bypasses encryption for the e2e suites, see [E2E on Linux](../gotchas/e2e-on-linux-playwright-forces-the-basic-password-store.md).
- Export/import round-trips all domains as unencrypted JSON for backup.
