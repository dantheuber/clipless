---
type: gotcha
title: E2E Tests Touch the Real System Clipboard
tags:
  - testing
  - playwright
  - clipboard
timestamp: 2026-07-10T00:55:35.489Z
---

Playwright e2e tests (`npx playwright test`) launch the real Electron app, and because [clipboard monitoring](/systems/clipboard-monitoring.md) polls the actual OS clipboard, the tests **read from and write to the developer's real clipboard**.

Practical rules:

- Do not copy anything sensitive right before running e2e tests -- the app will capture and store it.
- Expect your clipboard contents to be overwritten by test data after a run.
- This is inherent to the design (no clipboard mocking at the OS level), not a test bug.

Related verification bar for this repo: lint + typecheck must be clean, unit tests must keep 100% coverage (`npx vitest run --coverage`), and all e2e tests must pass before work is considered done.
