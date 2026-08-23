---
type: process
title: Release Pipeline (CI/CD)
tags:
  - ci
  - release
  - github-actions
generated:
  by: human:dantheuber
  at: 2026-07-10T01:01:30.380Z
---

Releases are driven by the version field in `package.json` -- there is no manual tagging in the normal flow. Verified against `.github/workflows/` (older repo docs described workflows that no longer exist).

Actual workflows:

- **`build.yml` ("PR Validation")** -- on PRs to main: typecheck, lint, `npm test`, and a version-bump check (fails if tag `v<package.json version>` already exists). **A mergeable PR needs a version bump.**
- **`test.yml` ("Tests")** -- on PRs and pushes to main: unit tests with coverage (ubuntu) posting a coverage comment on the PR, then e2e Playwright tests on **windows-latest** (with a guard that fails if the e2e suite produced no results) posting an e2e results comment.
- **`merge-to-main.yml`** -- on push to main: creates tag `vX.Y.Z` from package.json (skips silently if it already exists), then builds a **draft** GitHub release. Build matrix: **Windows and macOS only** -- no Linux.
- **`manual-tag-release.yml`** -- on manually pushed `v*` tags: builds a draft release for **Linux, Windows, and macOS**.

Gotchas:

- Linux builds are NOT produced by the merge-to-main path; getting a Linux artifact requires the manual tag workflow.
- There is no "promote release" workflow; publishing the draft release (and editing notes) happens manually in the GitHub UI.
- Both build workflows explicitly skip macOS code signing (`CSC_IDENTITY_AUTO_DISCOVERY: false`) -- see [macOS unsigned builds](../gotchas/macos-unsigned-builds.md).

Auto-update: the app updates itself via electron-updater from GitHub releases -- Windows only in practice, since macOS builds are unsigned.
