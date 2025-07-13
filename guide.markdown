---
layout: page
title: User Guide
permalink: /guide/
---

# 📖 Clipless User Guide

Get the most out of Clipless with this comprehensive guide to features and workflows.

## 🚀 Getting Started

### Installation & First Launch

1. **Download** the latest version from [GitHub Releases](https://github.com/dantheuber/clipless/releases)
2. **Install** following the platform-specific instructions
3. **Launch** Clipless - it will start monitoring your clipboard automatically
4. **System Tray** - Look for the Clipless icon in your system tray

### Basic Usage

1. **Copy Content** - Copy any text, image, or URL as you normally would
2. **View History** - Open Clipless to see all your copied items
3. **Reuse Items** - Click any row number or use the relevant hotkey to copy that item back to your clipboard
4. **Lock Important Items** - Right-click clips to lock them and prevent automatic removal

## 🔍 Quick Clips - Advanced Pattern Detection

### What are Quick Clips?

Quick Clips automatically detect patterns in your clipboard content and extract actionable data. When patterns are detected, you'll see a blue scanner icon appear.

### Built in available Patterns

- **Email Addresses** - `user@domain.com`
- **URLs** - `https://example.com/path`
- **Domain Names** - `example.com` or `subdomain.example.com`
- **Phone Numbers** - Various formats including international
- **IP Addresses** - IPv4 and IPv6
- **GUIDs** - GUID patterns

## Custom Patterns

Define your own regex patterns that extracts data relevant to your daily job role. Give capture groups appropriate names to be used in the tools you use them with.

Example: You copy a block of text commonly that contains various information such as `Customer # 123456`, you could create a custom regex pattern to extract the customer number and use it for quick tools. `Customer # ($<customerNumber>\d+)` and then have associated tools to use the capture group: `http://some-tool.com/?search={customerNumber}`

### Using Quick Clips

1. **Copy Content** containing patterns (e.g., an email with multiple addresses)
2. **Look for Scanner Icon** - Blue search icon appears when patterns detected
3. **Click Scanner** - Opens Quick Clips window showing extracted data
4. **Select Data** - Choose which extracted values you want to use
5. **Open Tools** - Launch compatible web tools with selected data

### Example Workflow

```
Copy: "Please contact john@example.com or visit https://example.com for support"

Quick Clips detects:
- Email: john@example.com
- URL: https://example.com

Select both and open tools:
- Email validation tool
- Website security scanner
- Domain lookup tool
```

## 🛠️ Quick Tools Integration

### What are Quick Tools?

Quick Tools are web-based applications that can be launched automatically with data from your clipboard. Perfect for research, validation, and workflow automation.

### Setting Up Tools

1. **Access Settings** - Right-click system tray → Settings
2. **Navigate** - Settings → Quick Clips → Tools
3. **Add Tool** - Click "Add Tool" button
4. **Configure** - Enter tool name, URL template, and data requirements

### URL Templates

Use tokens in your URL templates to insert extracted data:

- `{email}` - Inserts email address
- `{domain}` - Inserts domain name
- `{url}` - Inserts full URL
- `{phone}` - Inserts phone number

**Example Tool Configurations:**

```
Email Validator:
URL: https://hunter.io/email-verifier/{email}

Domain Lookup:
URL: https://whois.net/whois/{domain}

Multi-tool URL:
URL: https://tool.com/check?email={email}&domain={domain}
```

### Professional Use Cases

#### Call Center Workflows
```
Customer Email: support@bigcorp.com

Tools launched:
- CRM lookup: https://crm.company.com/search?email={email}
- Account verification: https://billing.company.com/account/{domain}
- Previous tickets: https://helpdesk.company.com/history/{email}
```

#### Security Analysis
```
Suspicious URL: https://phishing-site.com/fake-login

Tools launched:
- URL scanner: https://urlvoid.com/scan/{url}
- Domain reputation: https://virustotal.com/domain/{domain}
- WHOIS lookup: https://whois.net/whois/{domain}
```

## ⚡ Hotkey Configuration

### Global Hotkeys

Access Clipless features from anywhere on your system:

1. **Settings** - Right-click system tray → Settings → Hotkeys
2. **Configure** - Set key combinations for:
   - Show/Hide Clipless window
   - Quick access to recent clips (1-5)
   - Focus window hotkey

### Recommended Hotkeys

- **Ctrl+Shift+V** - Show Clipless window
- **Ctrl+Shift+1-5** - Quick access to recent clips
- **Ctrl+Shift+Q** - Open Quick Clips scanner

## 📋 Multi-Format Support

### Supported Formats

- **Plain Text** - Standard text content
- **Rich Text (RTF)** - Formatted text with styling
- **HTML** - Web content with full markup
- **Images** - Screenshots and copied images
- **Bookmarks** - URLs with titles (browser-compatible)

### Format Prioritization

Clipless intelligently handles multiple formats:

1. **Automatic Detection** - Identifies the best format to preserve
2. **Format Indicators** - Visual icons show content type
3. **Smart Reuse** - Pastes in the most appropriate format for the target application

## 🔒 Security & Privacy

### Data Encryption

- **Windows** - DPAPI (Data Protection API)
- **macOS** - Keychain Services
- **Linux** - Secret Service API

### Privacy Features

- **Local Storage Only** - No cloud synchronization
- **Automatic Cleanup** - Old clips removed automatically (configurable)
- **Sensitive Data Masking** - Credit cards, SSNs automatically masked
- **Lock Protection** - Important clips can be locked from deletion

### Best Practices

1. **Lock Sensitive Data** - Right-click to lock important clips
2. **Regular Cleanup** - Let automatic cleanup remove old data
3. **Review Patterns** - Regularly review and update custom patterns
4. **Tool Security** - Only add trusted web tools

## ⚙️ Advanced Settings

### General Settings

- **Startup Behavior** - Launch with Windows/macOS/Linux
- **Theme Selection** - Light/Dark mode
- **Clipboard Monitoring** - Adjust polling frequency
- **History Limits** - Set maximum number of stored clips

### Quick Clips Settings

- **Pattern Management** - Add/edit/remove detection patterns
- **Tool Configuration** - Manage your web tool library
- **Auto-launch Settings** - Configure automatic tool opening

### Performance Tuning

- **Polling Frequency** - Balance responsiveness vs. system resources
- **History Size** - Larger history uses more memory
- **Background Processing** - Optimize for your workflow needs

## 🤝 Tips & Tricks

### Productivity Hacks

1. **Template Shortcuts** - Create templates for common responses
2. **Tool Chains** - Set up multiple tools for comprehensive analysis
3. **Pattern Customization** - Create patterns for your specific data types
4. **Keyboard Workflow** - Use hotkeys for hands-free operation

### Troubleshooting

#### Common Issues

**Clipboard not detecting:**
- Check if Clipless is running in system tray
- Verify permissions on macOS/Linux
- Restart application if needed

**Patterns not working:**
- Verify regex syntax in custom patterns
- Check if data format matches pattern
- Test patterns with sample data

**Tools not opening:**
- Verify URL template syntax
- Check internet connection
- Ensure web tools are accessible

## 📞 Support & Community

- **GitHub Issues** - [Report bugs or request features](https://github.com/dantheuber/clipless/issues)
- **Source Code** - [View and contribute](https://github.com/dantheuber/clipless)
- **Documentation** - This guide and inline help
- **Community** - Join discussions in GitHub issues

---

*Ready to master Clipless? Start with the basic workflow and gradually add Quick Tools and custom patterns to build your perfect productivity system!*
