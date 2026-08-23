---
type: process
title: clipless.app Site Deployment
tags:
  - site
  - gh-pages
  - deploy
generated:
  by: human:dantheuber
  at: 2026-07-10T01:34:59.939Z
---

The marketing/docs site at https://clipless.app is a plain static site (no build step, no framework) served by GitHub Pages from the **`gh-pages` branch**, with `CNAME` pointing at the custom domain and `.nojekyll` disabling Jekyll.

- **Source of truth** is the `site/` folder on `main` (see `site/README.md`). Deploying = copying `site/` contents onto the `gh-pages` branch and pushing. There is **no CI automation** for this -- none of the workflows in `.github/workflows/` touch the site; deploys are manual pushes.
- Site-only changes to `main` are committed directly with a `[ci skip]` prefix (established convention) so the [release pipeline](../processes/release-pipeline.md) does not run. Even without `[ci skip]`, merge-to-main only builds a release when the package.json version tag is new.
- Every page carries a Google Analytics gtag.js snippet (measurement ID `G-D6QZ5FXQ2J`) at the top of `<head>` (added 2026-07-09). New pages must copy it from an existing page; nav/footer are also duplicated per page (no templating).
- History note: `site/` on main and `gh-pages` drifted between 2026-06-03 and 2026-07-09 -- purely prettier formatting (line wrapping, quote style), not content. Resolved by the 2026-07-09 deploy; keep them in sync by always deploying from `site/`.
