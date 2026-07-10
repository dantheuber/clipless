---
type: decision
title: Domain-Split Storage Files (v1 to v2 Migration)
tags:
  - storage
  - migration
timestamp: 2026-07-10T00:55:03.111Z
---

Decision: storage moved from one monolithic encrypted blob (`data.enc`) to domain-specific files (`settings.enc`, `clips.enc`, `templates.enc`, `meta.json`).

Rationale: with a single blob, every settings toggle rewrote the entire dataset including all clips and base64 images. Domain splitting means each save writes only the affected file, with per-domain save queuing allowing parallel saves across domains. Images were further split into `images/{id}.enc` files with separate `_thumb.enc` thumbnails so clip loads stay fast.

Migration (in `src/main/storage/migration.ts`, runs during background load):

1. Detects legacy state: `data.enc` exists but `clips.enc` does not
2. Reads and validates the legacy blob
3. Splits it into the domain files
4. Renames `data.enc` to `data.enc.migrated` (kept, not deleted)

`meta.json` carries `storageVersion` (currently 1) for future format migrations. Note: some older docs (including CLAUDE.md's "Data stored as data.enc") predate this split -- the domain files in [Secure Storage](/systems/secure-storage.md) are the current truth.

Production-safety implication: any future storage format change must ship a migration path here; users upgrade in place and their encrypted history must survive.
