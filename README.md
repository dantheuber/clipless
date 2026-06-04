# clipless.app

The marketing and documentation site for [Clipless](https://github.com/dantheuber/clipless),
served at **https://clipless.app** from the `gh-pages` branch.

This is a plain static site — no build step, no framework. GitHub Pages serves the
files as-is (`.nojekyll` disables Jekyll processing).

## Structure

```
/
├── index.html          Landing page
├── docs/index.html     Feature documentation
├── download/index.html Download + install instructions
├── 404.html            Not-found page
├── styles.css          Design system + page styles (theme tokens, accent)
├── app.js              Theme toggle, nav, scroll reveal, docs TOC scroll-spy
├── assets/
│   ├── clipless-mark.png   Logo mark (CSS-masked to the text colour)
│   ├── icon.png            Favicon
│   └── screens/            Product screenshots (light + dark per view)
├── CNAME               Custom domain (clipless.app)
└── .nojekyll           Tell GitHub Pages to skip Jekyll
```

## Theming

The site follows the visitor's OS light/dark preference and remembers a manual
override in `localStorage` (`clipless-theme`). The accent colour is baked into
`:root` in `styles.css`.

## Local preview

Because pages use root-relative paths (`/styles.css`, `/docs/`), preview with a
static server rather than opening the files directly:

```bash
npx serve .
# or
python -m http.server 8000
```

## Editing content

Each page is hand-written HTML sharing `styles.css` and `app.js`. The nav and footer
are duplicated per page (no templating) — keep them in sync when changing links.

The design source these pages were built from lives in the main branch under
`.claude/design/`.
