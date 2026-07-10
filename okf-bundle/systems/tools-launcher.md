---
type: system
title: Tools Launcher
tags:
  - quick-tools
  - launcher
  - window
timestamp: 2026-07-10T00:53:58.411Z
---

The Tools Launcher fans extracted data out to web tools. It is a separate window (`tools-launcher.html`, entry `tools-launcher-main.tsx`) with its own global hotkey (Ctrl+Shift+T / Cmd+Shift+T by default).

Mechanics:

- A **Quick Tool** is a URL template with token placeholders, e.g. `https://tool.com/{ip}/{email}`. Tokens correspond to named capture groups from [Quick Clips](/systems/quick-clips.md) search terms. Multi-token URLs are supported.
- URL generation lives in `src/main/clipboard/quick-tools.ts`; tool definitions are stored with templates in `templates.enc`.
- **Smart compatibility**: the launcher only offers tools whose required tokens are all present in the currently selected extracted values.
- **Bulk open**: selecting several values and several tools launches them all at once via `shell.openExternal`.
- Tool configs export/import as JSON for team sharing.

Typical flow: copy text -> scanner icon appears -> open launcher -> select extracted values -> pick compatible tools -> everything opens in the browser. Example use: pull an IP and fan it out to VirusTotal + AbuseIPDB in one click.
