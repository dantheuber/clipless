---
type: gotcha
title: habit-hooks comment sensor is length-based
tags:
  - habit-hooks
  - tooling
  - comments
generated:
  by: okf-mcp/1.4.0
  at: 2026-08-24T16:15:06.390Z
sources:
  - id: sensor-src
    note: habit_hooks_typescript/sensors/comment.cjs in the uv tool install, version
      1.3.1
---

The `non-essential-comment` smell never inspects comment content. The sensor
(`habit_hooks_typescript/sensors/comment.cjs`) flags every single-line comment whose
trimmed text is 10+ characters and every block/JSDoc comment 15+ characters; the only
exemption is text containing `eslint-disable`.[^sensor-src]

Consequences:

- Rewriting a flagged comment more tersely cannot unflag it unless the result drops
  under the threshold (e.g. `// ignore` at 9 chars passes).
- Reaching zero findings on a file means deleting every substantive comment, including
  genuine why-comments (spec references, bug-history rationale). Decide policy first;
  the smell is catalogued as SUGGESTED, not ENFORCED, so it coaches rather than fails.
- A multi-line `//` comment produces one finding per line; a single `/** */` block
  produces one finding total.

[^sensor-src]: Read directly from the installed sensor source, 2026-08-24.
