# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clipless is an Electron clipboard manager built with React and TypeScript. It monitors the system clipboard, stores clips with encryption, and provides pattern-based data extraction (Quick Clips) and template text generation.

## Commands

- `npm run dev` — Start development with hot reload (electron-vite)
- `npm run build` — Type check and build all processes
- `npm run lint` — ESLint with caching
- `npm run format` — Prettier formatting
- `npm run typecheck` — Type check all TypeScript (runs both `typecheck:node` for main/preload and `typecheck:web` for renderer)
- `npm run build:win` / `build:mac` / `build:linux` — Platform-specific packaging

### Testing

- `npm test` / `npx vitest` — Unit tests (Vitest)
- `npx playwright test` — E2E tests (Playwright with Electron)

**Note:** E2E tests interact with the **system clipboard**. Running them will read from and write to your actual OS clipboard. Avoid copying sensitive data before running e2e tests, and expect your clipboard contents to be overwritten.

## Verification

After making any code changes, always run lint and typecheck before considering work complete:

```bash
npm run lint && npm run typecheck
```

Fix all errors and warnings before moving on. Do not leave broken lint or type errors for later.

## Architecture

Electron three-process architecture using `electron-vite` as the build system and Tailwind CSS v4 for styling.

### Main Process (`src/main/`)

Node.js process handling system integration. Key modules:

- **`clipboard/`** — 250ms polling-based clipboard monitoring, Quick Clips pattern scanning, Quick Tools URL generation, templates
- **`storage/`** — `SecureStorage` singleton using Electron's `safeStorage` (OS-native encryption: DPAPI/Keychain/Secret Service). Data stored as `data.enc`
- **`hotkeys/`** — Global hotkey registration via `globalShortcut` with modular registry/actions/manager pattern
- **`window/`** — Creates three window types: main, settings, tools launcher. Persists window bounds
- **`tray.ts`** — System tray with context menu
- **`updater/`** — Auto-updates via electron-updater from GitHub releases

### Preload (`src/preload/`)

Context bridge exposing typed IPC APIs to renderer. All renderer↔main communication goes through `api.*` methods defined here. IPC channels are organized by domain: clipboard, settings, storage, templates, search-terms, quick-tools.

### Renderer (`src/renderer/`)

React 19 app with three entry points (`main.tsx`, `settings-main.tsx`, `tools-launcher-main.tsx`) and corresponding HTML files.

State management uses React Context providers:

- **`providers/clips/`** — Clipboard state with hooks: `useClipsStorage`, `useClipboardOperations`, `useClipState`. Handles clip lifecycle, deduplication, and locking
- **`providers/theme.tsx`** — Light/dark theme with system detection
- **`providers/languageDetection.tsx`** — Code language detection toggle

Clip types are rendered by type-specific components in `components/clips/clip/` (TextClip, HtmlClip, ImageClip, RtfClip, BookmarkClip).

### Shared (`src/shared/`)

TypeScript interfaces and constants used by all processes.

### Data Flow

User copies → main process detects via polling → reads clipboard → sends `clipboard-changed` IPC event → renderer updates state via ClipsProvider → saves back to encrypted storage via IPC.

## Linear Ticket Template

When creating Linear tickets for this project, use team **Clipless** and the following structure:

**Labels:** `Bug`, `Feature`, or `Improvement`
**Priority:** 1=Urgent, 2=High, 3=Normal, 4=Low

### Title

Short imperative description (e.g. "Add keyboard shortcut for clearing clips")

### Description format

```markdown
## Summary

One or two sentences describing what needs to happen and why.

## Context

- What currently happens (for bugs) or what's missing (for features)
- Any relevant user workflow or affected area (clipboard, storage, hotkeys, settings, etc.)

## Acceptance Criteria

- [ ] Specific, verifiable condition
- [ ] Another condition

## Affected Areas

Which modules are likely involved: clipboard/, storage/, hotkeys/, window/, renderer components, preload API, shared types.
```
