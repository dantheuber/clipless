# Documentation screenshots

Automated capture of the Clipless UI for the marketing/docs site, driven by
Playwright + Electron. It launches the **built** app against an isolated,
throwaway user-data profile, seeds curated demo data, and writes PNGs to
`screenshots/output/`.

## Run it

```bash
npm run screenshots        # builds the app, then captures
npm run screenshots:only   # skips the build (reuse an existing out/ build)
```

> ⚠️ The harness briefly writes the **system clipboard** while running (it seeds
> the most-recent clip). It uses an isolated profile, so it never reads or writes
> your real Clipless clip store, and the per-profile single-instance lock means
> it won't fight an instance you already have open.

## Output

PNGs are written to `screenshots/output/` (gitignored on the code branch). Each
screen is captured in both light and dark themes at 2x device scale:

| File                          | Screen                                      |
| ----------------------------- | ------------------------------------------- |
| `main-{light,dark}.png`       | Main window with curated clips (hero)       |
| `search-{light,dark}.png`     | Clip search bar filtering the list          |
| `settings-general-{…}.png`    | Settings → General                          |
| `settings-tools-{…}.png`      | Settings → Tools (Quick Clips / Templates)  |
| `settings-hotkeys-{…}.png`    | Settings → Hotkeys                          |
| `patterns-{light,dark}.png`   | Tools Launcher: live Quick Clips matching   |

## Publishing to the site

The site lives on the `gh-pages` branch; images are committed there. After
generating, copy the PNGs into that branch's image folder, e.g.:

```bash
# from a gh-pages worktree or checkout
cp /path/to/clipless/screenshots/output/*.png assets/screenshots/
```

Then reference them with relative paths in the HTML, e.g.
`<img src="assets/screenshots/main-dark.png">`.

## Editing the demo data

All seeded content (clips, Quick Clips patterns, Quick Tools, templates) lives in
`fixtures/demo-data.ts`. Values are fictional (example.com / RFC 5737
documentation IP ranges) — keep them that way.
