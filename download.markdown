---
layout: page
title: Download
permalink: /download/
---

# 📥 Download Clipless

Get the latest version of Clipless for your operating system.

## 🚀 Latest Release

[![Latest Release](https://img.shields.io/github/v/release/dantheuber/clipless?style=for-the-badge)](https://github.com/dantheuber/clipless/releases/latest)

### [📥 Download from GitHub Releases](https://github.com/dantheuber/clipless/releases/latest)

---

## 💻 Platform Support

### Windows 10/11
- **File Format:** `.exe` installer
- **Requirements:** Windows 10 version 1903 or later
- **Architecture:** x64 (64-bit)

### macOS 
- **File Format:** `.dmg` disk image
- **Requirements:** macOS 10.15 (Catalina) or later
- **Architecture:** Universal binary (Intel & Apple Silicon)

### Linux
- **File Format:** `.AppImage` portable application
- **Requirements:** Most modern Linux distributions
- **Architecture:** x64 (64-bit)

---

## 🛡️ Installation Security Notice

**Important:** You may see security warnings during installation because Clipless is not signed with a commercial code signing certificate.

### What You Might See

#### Windows
- "Windows protected your PC" SmartScreen warning
- "Unknown publisher" notifications
- Antivirus software alerts

#### macOS
- "Cannot be opened because it is from an unidentified developer"
- Gatekeeper security warnings
- "Malicious software" notifications

#### Linux
- "Untrusted application" warnings
- Security policy restrictions
- Permission requirements

### Why This Happens

Code signing certificates cost several hundred dollars annually. As an open-source project, we don't currently have a commercial certificate. The security warnings are purely administrative - **the application itself is completely safe**.

### This is Safe to Override

✅ **Clipless is built from open source code** - You can verify the source on GitHub  
✅ **No malicious code** - Full transparency with public repository  
✅ **Community verified** - Used by developers and professionals worldwide  
✅ **Regular security updates** - Maintained with modern security practices  

---

## 🔧 Installation Instructions

### Windows Installation

1. **Download** the `.exe` file from GitHub Releases
2. **Run the installer** - Double-click the downloaded file
3. **Handle SmartScreen warning:**
   - Click "More info" when the warning appears
   - Click "Run anyway" to proceed with installation
4. **Follow the installer** - Complete the standard installation process
5. **Launch Clipless** - Find it in your Start Menu or system tray

#### Alternative Method (if needed):
- Temporarily disable Windows Defender SmartScreen
- Install Clipless
- Re-enable SmartScreen after installation

### macOS Installation

1. **Download** the `.dmg` file from GitHub Releases
2. **Open the disk image** - Double-click the downloaded file
3. **Handle Gatekeeper warning:**
   - If blocked, go to System Preferences → Security & Privacy
   - Click "Open Anyway" next to the Clipless warning
   - Or right-click the app → "Open" → "Open" in the dialog
4. **Drag to Applications** - Move Clipless to your Applications folder
5. **Launch Clipless** - Find it in Applications or Launchpad

#### Alternative Method (Advanced):
```bash
# Temporarily allow apps from anywhere
sudo spctl --master-disable

# Install Clipless, then re-enable Gatekeeper
sudo spctl --master-enable
```

### Linux Installation

1. **Download** the `.AppImage` file from GitHub Releases
2. **Make executable:**
   ```bash
   chmod +x Clipless-*.AppImage
   ```
3. **Run the application:**
   ```bash
   ./Clipless-*.AppImage
   ```
4. **Optional - Create desktop shortcut:**
   - Right-click the AppImage
   - Select "Create Desktop Shortcut" or similar option

#### Integration with System:
Many Linux distributions support AppImage integration tools for better system integration.

---

## 🔄 Updating Clipless

### Automatic Update Notifications
Clipless will notify you when a new version is available. You can:
- Download updates manually from GitHub
- Enable automatic update checking in settings

### Manual Updates
1. Download the latest version from GitHub Releases
2. Install over your existing installation
3. Your settings and clipboard history will be preserved

---

## ✅ System Requirements

### Minimum Requirements
- **RAM:** 256 MB available memory
- **Storage:** 100 MB free disk space
- **Network:** Internet connection for tool integrations (optional)

### Recommended Requirements
- **RAM:** 512 MB available memory
- **Storage:** 500 MB free disk space
- **Display:** 1024x768 resolution or higher

### Supported Platforms
- **Windows:** 10, 11 (64-bit)
- **macOS:** 10.15+ (Intel and Apple Silicon)
- **Linux:** Ubuntu 18.04+, Debian 10+, Fedora 30+, and similar

---

## 🛠️ Troubleshooting Installation

### Common Issues

#### Windows: "App can't run on this PC"
- **Solution:** Ensure you're running 64-bit Windows
- **Check:** System → About → System type

#### macOS: "Damaged and can't be opened"
- **Solution:** Run the following command in Terminal:
  ```bash
  xattr -cr /Applications/Clipless.app
  ```

#### Linux: "Permission denied"
- **Solution:** Ensure the AppImage is executable:
  ```bash
  chmod +x Clipless-*.AppImage
  ```

#### All Platforms: Antivirus Blocking
- **Solution:** Add Clipless to your antivirus whitelist
- **Note:** This is due to the lack of code signing, not actual threats

### Getting Help

If you encounter installation issues:

1. **Check GitHub Issues** - [Known issues and solutions](https://github.com/dantheuber/clipless/issues)
2. **Create an Issue** - Report new problems with system details
3. **Community Support** - Get help from other users

---

## 🔮 Future Plans

### Code Signing Certificate

If Clipless gains sufficient community support and adoption, we will invest in commercial code signing certificates to eliminate security warnings. This decision depends on:

- **Community Growth** - Active user base and contributions
- **Financial Sustainability** - Funding for annual certificate costs
- **Project Maturity** - Stable release cycle and maintenance

### How You Can Help

- ⭐ **Star the project** on GitHub
- 🐛 **Report issues** and suggest improvements
- 💡 **Contribute** code or documentation
- 📢 **Share** Clipless with others who might benefit

---

## 📞 Support

Need help with installation or have questions?

- **GitHub Issues:** [Report problems or ask questions](https://github.com/dantheuber/clipless/issues)
- **Documentation:** [Read the user guide](/guide/)
- **Source Code:** [View on GitHub](https://github.com/dantheuber/clipless)

---

*Ready to transform your clipboard workflow? [Download Clipless now!](https://github.com/dantheuber/clipless/releases/latest)*
