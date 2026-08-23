---
type: gotcha
title: Coverage is 100% of the files tests import, not of the tree
tags:
  - testing
  - vitest
  - coverage
timestamp: 2026-08-23T02:51:49.217Z
---

`npx vitest run --coverage` reports 100% on this repo, but `vitest.config.ts` sets no `coverage.all`, so the report only counts files some test imports. `src/main/storage/index.ts`, the IPC registration files (`src/main/ipc/index.ts`, `src/main/clipboard/ipc.ts`) and `src/preload/index.ts` have no tests and never appear in the table. The bar in [E2E Tests Touch the Real System Clipboard](e2e-tests-touch-system-clipboard.md) is therefore "every file a test imports stays at 100%", including new files with tests and old files that gain a test.

What follows from it:

- Adding a test for a large untested file (storage/index.ts is about 900 lines) pulls the whole file into the report and you then owe 100% of it. The pattern that keeps the bar cheap is to put new logic in a small module with its own test and leave the glue file untested: `storage/group-colours.ts`, `storage/save-queue.ts` and `storage/settings.ts` are examples from step 1 of the quick look plan.
- v8 coverage ignores `/* istanbul ignore next */`; use `/* v8 ignore next */` or, better, remove the unreachable branch. A `default` case that cannot happen, or `x instanceof Error ? x : new Error(...)` where only Errors are thrown, shows up as an uncovered branch.
- To see which lines a file misses when the text table truncates them, run one test file with `--coverage.reporter=json --coverage.include=<file>` and read `coverage/coverage-final.json`.
- `npx eslint -f unix` fails because the unix formatter is no longer bundled with ESLint 9; use `npm run lint`.
- Running the Playwright suite from a Claude Code shell on Linux needs environment fixes and still leaves five tools-spec tests failing; see [E2E on Linux](e2e-on-linux-playwright-forces-the-basic-password-store.md).
