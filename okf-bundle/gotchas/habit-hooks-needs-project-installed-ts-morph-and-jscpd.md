---
type: gotcha
title: habit-hooks needs project-installed ts-morph and jscpd
tags:
  - habit-hooks
  - knip
  - dependencies
  - lint
status: stable
generated:
  by: okf-mcp/1.4.0
  at: 2026-08-24T15:54:09.188Z
sources:
  - id: hh-src
    description: habit-hooks installed package source at
      ~/.local/share/uv/tools/habit-hooks/lib/python3.12/site-packages,
      inspected 2026-08-24
---

`habit-hooks` (the Python uv tool driving the lint experiment on branch
`habig-hooks-experiment`) resolves two of its sensors' tools from the
*project's own* `node_modules`, so knip flags them as unused devDependencies
even though removing them breaks habit-hooks:

- `ts-morph` — the `non-essential-comment` sensor (`comment.cjs`) does
  `createRequire(path.join(process.cwd(), "comment.cjs"))("ts-morph")`,
  i.e. requires ts-morph from the project being scanned.[^hh-src]
- `jscpd` — the `duplicated-code` sensor spawns the bare `jscpd` CLI
  (`["jscpd", "--reporters", "json", ...]`), found via the project's
  `node_modules/.bin`.[^hh-src]
- `knip` itself is spawned too, but it is already visible to knip through
  the `knip` npm script.

Both are therefore declared in `ignoreDependencies` in the repo-root
`knip.json` rather than removed. The same knip.json narrowly ignores
`site/app.js` and `site/styles.css`: they are referenced only from
`site/index.html` / `site/404.html` (GitHub Pages), which knip does not
parse.

[^hh-src]: habit-hooks package source inspection.
