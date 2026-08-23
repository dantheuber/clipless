# CLAUDE.md

## Knowledge capture (OKF brain)

## Knowledge capture (OKF brain)

This project keeps a persistent knowledge base (the "brain") behind the `okf` MCP server.

- Before starting non-trivial work, check the brain: orient with `graph_summary`, then
  `search_concepts` for anything related to the task, and treat what you find as prior
  context.
- Read the brain frugally: a search hit names the matching `section` (or
  `matchedSections`) — fetch just that with `get_concept`'s `section` argument rather
  than whole documents — and orientation calls (`graph_summary`, `list_bundles`,
  `get_bundle_guide`) belong once per session, not once per step or per subagent.
- When you learn something durable — a decision and its rationale, a gotcha, how a
  system actually works, a convention worth keeping — record it before finishing:
  call `suggest_concept_path` to pick a placement, then `write_concept`. Prefer
  updating an existing concept over creating a near-duplicate.
- Keep concepts small and linked: one idea per concept, document-relative markdown
  links (`../tables/orders.md`) to related concepts, and reuse existing types and tags.
- Record where the knowledge came from in `sources`, and attribute a specific claim
  with a footnote keyed to that entry's `id`. Set `stale_after` when something has a
  known shelf life, and `status: draft` when you are not confident yet.
- Don't record ephemera (task status, one-off debugging detail) — the brain is for
  knowledge that should still be true next month.

## Knowledge reconciliation (OKF brain)

Capture keeps the brain growing; reconciliation keeps it true.

- Before ending any task that changed the project, collect two small sets:
  the concepts you read while working, and the concepts that describe what
  you changed (`search_concepts` for the paths, symbols, and feature names
  in your diff).
- For each concept in either set, do exactly one of:
  - **Update** it (`update_concept`) if any claim is now false. Watch
    especially for claims that invert silently: "X does not exist" when
    your change created X, and any open-status flag your work closed.
    - **Verify** it: you checked and it still holds — record that with
    `verified: {by: <your actor>, at: <ISO now>}` so the next agent can tell a
    checked concept from an unexamined one. Use `human:<id>` only for a human's
    own sign-off; `search_concepts` derives its human-reviewed tier from that
    prefix.
  - **Explain**: if you leave a concept untouched that names something you
    changed, say why when you report your work.
- Keep it bounded: only concepts intersecting your work, never a
  bundle-wide audit.
- If the bundle is not mounted `--writable`, report the needed updates
  instead of editing.