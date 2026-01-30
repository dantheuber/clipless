---
layout: page
title: Docs
permalink: /docs/
---

# Clipless Documentation

## Getting Started

1. [Download](/download/) and install Clipless for your platform
2. Launch the application -- it starts monitoring your clipboard immediately
3. Look for the Clipless icon in your system tray
4. Copy content as you normally would; Clipless captures it automatically

## Clipboard History

Clipless polls the system clipboard every 250ms and stores new content automatically. Supported formats:

- **Plain text** with optional code language detection
- **HTML** with rendered preview
- **RTF** (rich text)
- **Images** (screenshots, copied graphics)
- **Bookmarks** (URLs with titles)

Duplicate content is detected and ignored. Click a clip's row number (or use a Quick Clip hotkey) to copy it back to the clipboard.

### Locking Clips

Right-click a clip to lock it. Locked clips are not removed when the history limit is reached.

### Storage

Clipboard history is stored locally in an encrypted file (`data.enc`) using OS-native encryption:

- **Windows:** DPAPI (Data Protection API)
- **macOS:** Keychain Services
- **Linux:** Secret Service API (GNOME Keyring / KDE Wallet)

No data is sent to any server.

---

## Quick Clips

Quick Clips are user-defined regex patterns that extract data from clipboard content. When copied text matches a pattern, the extracted values can be used with Quick Tools and Templates.

### How Patterns Work

Each pattern is a regular expression with named capture groups. The capture group names become tokens you can reference in Quick Tools URLs and Templates.

Example pattern for extracting a customer number:
```
Customer #\s*(?<customerNumber>\d+)
```

When you copy text containing "Customer # 123456", Quick Clips extracts `customerNumber = 123456`.

### Pattern Templates

Clipless includes pattern templates you can add with one click in the Tools Manager:

| Pattern | Capture Group |
|---------|--------------|
| Email Address | `email` |
| URL | `url` |
| Domain Name | `domainName` |
| Phone Number | `phoneNumber` |
| IP Address (v4) | `ipAddress` |
| MAC Address | `macAddress` |
| IPv6 Address | `ipv6Address` |

These are suggestions, not active by default. Add the ones relevant to your work.

### Managing Patterns

1. Right-click the system tray icon and open Settings
2. Go to the Tools tab
3. Add patterns from templates or create custom ones with your own regex

---

## Quick Tools

Quick Tools are URL templates that open web pages with data extracted by Quick Clips.

### Setup

1. Open Settings > Tools tab
2. Add a new Quick Tool with a name and URL template
3. Use capture group names as tokens in the URL

### URL Templates

Tokens are capture group names wrapped in curly braces:

```
https://example.com/lookup?email={email}
https://tool.com/check?email={email}&domain={domainName}
```

A tool is available when its required tokens are present in the current Quick Clips matches.

### Usage

When Quick Clips detects patterns in a clip, you can:

- Click the scanner icon on the clip to see matches and open tools
- Use the Tools Launcher window (Ctrl+Shift+T) for quick access

### Example: Call Center Workflow

Define patterns for email and customer number, then create tools:

```
CRM Lookup:    https://crm.company.com/search?email={email}
Account Info:  https://billing.company.com/customer/{customerNumber}
Ticket Search: https://helpdesk.company.com/history/{email}
```

Copy a customer email, and all three tools become available in one click.

### Example: Data Entry

Define a pattern to extract an order number from pasted text, then create a tool:

```
Order Lookup: https://orders.company.com/view/{orderNumber}
```

---

## Templates

*Added in v1.6*

Templates generate formatted text by substituting tokens with clipboard data.

### Token Types

**Positional tokens** reference clips by recency:
- `{c1}` -- most recent clip
- `{c2}` -- second most recent
- `{c3}` -- third most recent, and so on

**Named tokens** reference Quick Clips capture group values:
- `{email}`, `{domainName}`, `{phoneNumber}`, etc.

### Example

Template:
```
Hello {c1},

Your account ({email}) has been updated. Reference number: {customerNumber}.

Regards
```

This pulls the most recent clip for the greeting name, and uses Quick Clips matches for the email and customer number.

### Managing Templates

Templates are managed in Settings > Tools tab, alongside Quick Clips patterns and Quick Tools.

---

## Clip Quick Search

*Added in v1.5*

Press Ctrl+Shift+F (default hotkey) to toggle a search bar in the main window. Type to filter clips by content.

---

## Tools Launcher Window

The Tools Launcher is a dedicated window for quickly acting on clipboard content.

- Open with Ctrl+Shift+T (default hotkey)
- Automatically scans the most recent clip against your Quick Clips patterns
- Shows matched values and available Quick Tools
- If already open, sending a new clip refreshes the content

---

## Global Hotkeys

All hotkeys are configurable in Settings > Hotkeys. Any hotkey can be rebound or disabled.

| Default Shortcut | Action |
|-----------------|--------|
| Ctrl+Shift+V | Toggle main window |
| Ctrl+Shift+1 | Copy most recent clip to clipboard |
| Ctrl+Shift+2 | Copy 2nd most recent clip |
| Ctrl+Shift+3 | Copy 3rd most recent clip |
| Ctrl+Shift+4 | Copy 4th most recent clip |
| Ctrl+Shift+5 | Copy 5th most recent clip |
| Ctrl+Shift+F | Toggle clip search bar |
| Ctrl+Shift+T | Open Tools Launcher |

On macOS, Ctrl is replaced with Cmd.

---

## Settings Reference

### Application

| Setting | Description | Default |
|---------|-------------|---------|
| Maximum Clips | Number of clips to retain (15-100) | -- |
| Start Minimized | Start in system tray | -- |
| Auto Start | Launch with OS | -- |
| Theme | Light, Dark, or System | System |
| Code Detection | Detect and highlight code languages | On |

### Window

| Setting | Description | Default |
|---------|-------------|---------|
| Window Transparency | Enable transparent window | Off |
| Transparency Level | Opacity percentage (0-100%) | -- |
| Opaque When Focused | Full opacity when window is focused | On |
| Always On Top | Keep window above others | Off |
| Remember Position | Restore window position on launch | On |

### Hotkeys

Configure key combinations for all 8 global hotkeys. Hotkeys can be individually enabled or disabled.

### Tools

Manage Quick Clips patterns, Quick Tools, and Templates.

---

## Code Detection

When enabled (Settings > Application > Code Detection), Clipless detects programming languages in text clips and applies syntax highlighting in the UI.

---

## Security and Privacy

- All clipboard data is encrypted at rest using OS-native encryption
- Data is stored locally only -- no cloud sync, no remote servers
- No telemetry, analytics, or tracking of any kind
- The application is open source: [github.com/dantheuber/clipless](https://github.com/dantheuber/clipless)

---

## Workflow Examples

### Call Center Agent

1. Add Quick Clips patterns for email, phone number, and customer ID
2. Create Quick Tools pointing to your CRM, billing system, and helpdesk
3. When a customer provides their info, copy it once
4. Open the Tools Launcher (Ctrl+Shift+T) to see extracted data and launch lookups

### Data Entry

1. Create Templates with positional tokens for standardized form text
2. Use Quick Clips patterns to extract structured data from source documents
3. Use the clipboard history (Ctrl+Shift+1 through 5) to quickly re-paste recent items

---

## Troubleshooting

**Clipboard not detecting content:**
- Verify Clipless is running (check system tray)
- On macOS/Linux, check accessibility/permissions
- Restart the application

**Patterns not matching:**
- Verify regex syntax in your custom patterns
- Test the regex against your expected input
- Ensure capture groups are named: `(?<name>...)`

**Quick Tools not opening:**
- Check URL template syntax (tokens use `{name}` format)
- Verify the web tool URL is accessible
- Ensure the required capture groups are present in matched data

**General issues:**
- Check [GitHub Issues](https://github.com/dantheuber/clipless/issues) for known problems
- [Create an issue](https://github.com/dantheuber/clipless/issues/new) with details about your platform and steps to reproduce
