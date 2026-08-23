---
type: gotcha
title: macOS Builds Are Unsigned
tags:
  - macos
  - code-signing
  - release
generated:
  by: human:dantheuber
  at: 2026-07-10T01:02:51.236Z
---

Clipless has no commercial code-signing certificate (several hundred dollars/year; deferred until adoption justifies it). CI explicitly skips signing: both release workflows set `CSC_IDENTITY_AUTO_DISCOVERY: false` and empty `CSC_LINK`/`CSC_KEY_PASSWORD`.

Consequences:

- **Gatekeeper blocks downloaded DMGs**: browser downloads get the `com.apple.quarantine` xattr, and macOS refuses quarantined unsigned apps with "Clipless is damaged and can't be opened." The DMG is fine; the fix is `xattr -dr com.apple.quarantine /Applications/Clipless.app`, or building locally (local builds never get the flag).
- **No auto-update on macOS**: electron-updater requires a signed app on macOS, so in-app updates are Windows-only. The automatic update check swallows errors specifically so unsigned macOS builds never surface update failures to the user (see [Non-blocking startup](../decisions/non-blocking-startup.md)). macOS users reinstall from releases manually.
- Windows shows SmartScreen warnings; Linux may flag the AppImage. Both are overridable.
- macOS ships separate arm64 and x64 DMGs; `npm run build:mac` produces both.

If a signing certificate is ever added, revisit: enable macOS auto-update, remove the CSC skip in the workflows, and update the README's install workaround section (and this concept). See [Release pipeline](../processes/release-pipeline.md).
