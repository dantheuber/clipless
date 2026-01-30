---
layout: page
title: Download
permalink: /download/
---

# Download Clipless

[![Latest Release](https://img.shields.io/github/v/release/dantheuber/clipless?style=for-the-badge)](https://github.com/dantheuber/clipless/releases/latest)

### [Download from GitHub Releases](https://github.com/dantheuber/clipless/releases/latest)

---

## Platform Support

### Windows 10/11
- **Format:** `.exe` installer
- **Architecture:** x64 (64-bit)

### macOS
- **Format:** `.dmg` disk image
- **Requirements:** macOS 10.15 (Catalina) or later
- **Architecture:** Universal binary (Intel and Apple Silicon)

### Linux
- **Format:** `.AppImage`
- **Architecture:** x64 (64-bit)

---

## Installation

### Windows

1. Download the `.exe` file from GitHub Releases
2. Run the installer
3. If SmartScreen warns you, click "More info" then "Run anyway"
4. Find Clipless in your Start Menu or system tray

### macOS

1. Download the `.dmg` file from GitHub Releases
2. Open the disk image and drag Clipless to Applications
3. If Gatekeeper blocks the app, go to System Preferences > Security & Privacy and click "Open Anyway"
4. Alternatively, right-click the app > Open > Open

If you see "damaged and can't be opened":
```bash
xattr -cr /Applications/Clipless.app
```

### Linux

1. Download the `.AppImage` file from GitHub Releases
2. Make it executable and run:
   ```bash
   chmod +x Clipless-*.AppImage
   ./Clipless-*.AppImage
   ```

---

## Security Warnings

Clipless is not signed with a commercial code signing certificate, so your OS may show a security warning during installation. This is expected for open-source projects without paid certificates. The application is built from [public source code](https://github.com/dantheuber/clipless).

---

## Updates

Clipless checks for updates automatically and notifies you when a new version is available. To update manually, download the latest release and install over your existing installation. Settings and clipboard history are preserved.

---

## Troubleshooting

**Windows: "App can't run on this PC"** -- Ensure you're running 64-bit Windows.

**macOS: "Damaged and can't be opened"** -- Run `xattr -cr /Applications/Clipless.app` in Terminal.

**Linux: "Permission denied"** -- Run `chmod +x Clipless-*.AppImage`.

**Antivirus blocking installation** -- Add Clipless to your antivirus whitelist. Alerts are caused by the lack of code signing, not actual threats.

For other issues, check [GitHub Issues](https://github.com/dantheuber/clipless/issues).
