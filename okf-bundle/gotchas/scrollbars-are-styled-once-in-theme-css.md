---
type: gotcha
title: Scrollbars are styled once in theme.css
tags:
  - renderer
  - ux
  - theme
status: stable
generated:
  by: okf-mcp/1.4.0
  at: 2026-08-23T21:52:13.313Z
sources:
  - id: theme-css
    title: src/renderer/src/assets/theme.css
    type: code
  - id: rendered-view
    title: src/renderer/src/components/quick-look/RenderedView.tsx
    type: code
---

Chromium's default scrollbar is a light track with arrow buttons. It looked pasted in over
either theme wherever the app scrolled: the quick look reader, the settings panes, the
regex textareas.

`src/renderer/src/assets/theme.css` styles it for both windows in one place. `--sb-thumb`,
`--sb-thumb-hover` and `--sb-thumb-active` are set beside the other theme variables on
`:root` and on `body.light`; unprefixed `::-webkit-scrollbar` rules give every scrolling
element a rounded thumb over a transparent track, with `::-webkit-scrollbar-button` hidden
so no arrows are drawn. `color-scheme` is `dark` on `:root` and `light` on `body.light` so
anything Chromium still paints itself follows the theme.[^theme-css]

Two things to know before touching this:

- The rules apply to everything, so a component that wants no scrollbar has to opt out.
  `.clipsContainer` in `Clips.module.css` still hides its own with
  `.clipsContainer::-webkit-scrollbar { display: none }`, which wins on specificity.
- The quick look rendered view is an iframe with its own document, so the page's CSS does
  not reach it. `frameDocument` in `RenderedView.tsx` repeats the scrollbar rules inside
  the frame's inline `<style>` with the thumb colour resolved by `frameThumbColour()`,
  which reads `--sb-thumb` off the host document. Change the rules in theme.css and that
  copy needs the same change.[^rendered-view]

Verifying this in a browser needs one flag: Playwright and Puppeteer launch headless
Chromium with `--hide-scrollbars`, which makes the gutter measure 0px and hides the thumb
from screenshots. Launch with `ignoreDefaultArgs: ['--hide-scrollbars']` to see it.

Related: [Quick look engineering calls](../decisions/quick-look-engineering-calls.md).

[^theme-css]: src/renderer/src/assets/theme.css
[^rendered-view]: src/renderer/src/components/quick-look/RenderedView.tsx
