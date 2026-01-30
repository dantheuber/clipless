---
layout: home
title: "Clipless"
---

# Clipless

A clipboard manager for professionals who work with data across multiple systems.

Clipless monitors your clipboard, stores history with encryption, and provides pattern-based data extraction and template text generation.

## Clipboard Management

- Monitors the system clipboard with 250ms polling
- Stores text, HTML, RTF, images, and bookmarks
- Automatic deduplication prevents repeated entries
- Click any clip to expand and edit inline with syntax highlighting
- Lock clips to prevent automatic removal
- Scan any clip's content for Quick Clips patterns via the cog icon or right-click menu
- Encrypted storage using OS-native encryption (DPAPI, Keychain, Secret Service)

## Quick Clips

User-defined regex patterns that extract structured data from clipboard content. When a clip matches a pattern, the extracted values become available for use with Quick Tools and Templates.

Clipless ships with pattern templates you can add (email, URL, domain, phone, IP, MAC address, IPv6), but no patterns are active by default. You create the patterns relevant to your workflow.

[Learn more in the docs](/docs/#quick-clips)

## Quick Tools

URL templates that open web tools with data extracted by Quick Clips. Define a URL like `https://tool.com/search?q={email}` and Clipless substitutes the token with the matched value.

Supports multiple tokens per URL: `https://tool.com/check?email={email}&domain={domainName}`

[Learn more in the docs](/docs/#quick-tools)

## Templates

*Added in v1.6*

Generate text from templates using two token types:

- **Positional tokens** (`{c1}`, `{c2}`, ...) reference clips by recency (c1 = most recent)
- **Named tokens** (`{email}`, `{domainName}`, ...) reference Quick Clips capture group values

[Learn more in the docs](/docs/#templates)

## Clip Quick Search

*Added in v1.5*

Press Ctrl+Shift+F (default) to toggle a search bar in the main window for filtering clips.

## Tools Launcher

Press Ctrl+Shift+T (default) to open a dedicated window that scans your most recent clip against Quick Clips patterns and shows matching Quick Tools.

## Hotkeys

8 configurable global hotkeys: toggle main window, quick-copy recent clips 1-5, search clips, and open Tools Launcher. All hotkeys can be rebound or disabled in settings.

[Full hotkey reference](/docs/#global-hotkeys)

## Themes and Code Detection

- Light, dark, and system-following themes
- Optional code language detection with syntax highlighting

## Security and Privacy

- All data stored locally in an encrypted file using OS-native encryption
- No cloud sync, no telemetry, no analytics
- Open source: [github.com/dantheuber/clipless](https://github.com/dantheuber/clipless)

---

## Download

Available for Windows, macOS, and Linux. [Download the latest release](https://github.com/dantheuber/clipless/releases/latest).

---

Built with Electron, React, and TypeScript by [Dan Essig](https://github.com/dantheuber). Source code and issue tracker on [GitHub](https://github.com/dantheuber/clipless).
