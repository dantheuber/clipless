# Clipless

A powerful and intelligent clipboard manager built with Electron, React, and TypeScript. Clipless automatically monitors your clipboard, intelligently detects different content types, and provides advanced pattern-based data extraction with Quick Clips functionality.

## ✨ Features

### 🔄 **Automatic Clipboard Monitoring**

- Real-time clipboard detection with 250ms polling
- Support for multiple formats: text, HTML, RTF, images, and bookmarks
- Intelligent format prioritization and duplicate prevention
- Background monitoring that doesn't interfere with your workflow

### 📋 **Multi-Format Clipboard Management**

- **Text**: Plain text content with programming language detection
- **HTML**: Rich HTML content with visual indicators
- **RTF**: Rich Text Format support
- **Images**: Image clipboard data with preview support
- **Bookmarks**: URLs with titles (macOS/Windows compatible)

### 🔍 **Quick Clips - Intelligent Pattern Detection**

- Automatically detect patterns in clipboard content (emails, URLs, phone numbers, etc.)
- Custom regex patterns with named capture groups
- Individual selection of extracted data values
- Built-in pattern library for common data types
- Visual indicators when patterns are detected

### 🛠️ **Quick Tools Integration**

- Define web tools that open with extracted data
- Multi-token URL support (e.g., `https://tool.com/{email}/{domain}`)
- Bulk operations - open multiple tools simultaneously
- Smart tool compatibility based on available data
- Export/import configurations for sharing

### ⚡ **Hotkey Support**

- Global hotkeys for quick access to clipboard items
- Configurable key combinations
- Quick clip hotkeys (1-5) for instant access to recent items
- Focus window hotkey for quick app access

### 🎨 **Modern UI & Theming**

- Light and dark theme support
- Responsive design with beautiful gradients
- System tray integration
- Settings panel for complete customization
- Visual feedback and smooth animations

### 🔒 **Secure Storage**

- Encrypted data storage using OS-native encryption
- Windows: DPAPI, macOS: Keychain, Linux: Secret Service
- Persistent clipboard history
- Lock clips to prevent automatic removal
- Export/import functionality for backup

## 🚀 How to Use

### Basic Usage

1. **Install and Run**: Start Clipless and it begins monitoring your clipboard automatically
2. **Copy Content**: Any content you copy will appear in the Clipless window
3. **Click to Reuse**: Click on any row number to copy that item back to your clipboard
4. **Lock Important Items**: Right-click clips to lock them and prevent removal

### Quick Clips Workflow

1. **Copy Content**: Copy text containing patterns (emails, URLs, etc.)
2. **Look for the Scanner Icon**: A blue search icon appears when patterns are detected
3. **Click Scanner**: Opens the Quick Clips scanner showing extracted data
4. **Select Data**: Choose which extracted values you want to use
5. **Open Tools**: Select compatible tools to open with your selected data

### Settings & Customization

- **Access Settings**: Right-click system tray icon → Settings
- **Configure Patterns**: Settings → Quick Clips → Search Terms
- **Add Tools**: Settings → Quick Clips → Tools
- **Set Hotkeys**: Settings → Hotkeys
- **Adjust Preferences**: Settings → General

### Example Quick Clips Use Cases

- **Email Processing**: Extract emails and open with validation tools
- **URL Analysis**: Extract domains and open with security scanners
- **Data Research**: Extract multiple data points and research across tools
- **Development**: Extract code snippets and open in documentation tools

## 💼 Ideal for Office & Call Center Work

### **Call Center & Customer Support**

Clipless transforms how support agents handle customer information:

- **Customer Data Lookup**: Copy customer emails/phone numbers and instantly open them in CRM, billing, or support tools
- **Account Verification**: Extract account numbers and open multiple verification tools simultaneously
- **Issue Tracking**: Copy error codes or ticket numbers and launch diagnostic tools, knowledge bases, and escalation systems
- **Multi-System Navigation**: One copy action can open customer records across 3-4 different systems instantly

### **Data Entry & Administrative Work**

Perfect for roles requiring constant data transfer between systems:

- **Form Population**: Use templates to generate standardized text from clipboard data (addresses, contact info, etc.)
- **Batch Processing**: Copy reference numbers and open them across multiple validation or processing tools
- **Quality Assurance**: Extract identifiers and quickly access audit trails, compliance tools, and verification systems
- **Cross-Platform Workflows**: Bridge gaps between legacy systems by automating tool launches

### **Real-World Office Scenarios**

- **Insurance Claims**: Copy claim numbers → automatically open in claims system, fraud detection, and payment processing
- **Banking Support**: Copy account numbers → instantly access account details, transaction history, and compliance tools
- **Healthcare Administration**: Copy patient IDs → open in medical records, billing, and scheduling systems
- **E-commerce Support**: Copy order numbers → launch into order management, shipping, and customer communication tools

### **Template-Powered Productivity**

- **Standardized Responses**: Create templates for common customer communications, populated with copied data
- **Report Generation**: Templates that format clipboard data into structured reports
- **Data Transformation**: Convert between different data formats required by various systems
- **Compliance Documentation**: Generate required documentation with proper formatting from raw copied data

## 🎯 Perfect For

- **Call Center Agents**: Multi-system customer data lookups and rapid tool navigation
- **Data Entry Professionals**: Template-driven standardized data formatting and batch processing
- **Customer Support Teams**: Instant access to customer information across multiple platforms
- **Administrative Staff**: Streamlined workflows between legacy and modern systems
- **Insurance/Banking Workers**: Quick access to claims, accounts, and compliance tools
- **Healthcare Administration**: Patient data management across medical, billing, and scheduling systems
- **Developers**: Code snippet management and URL analysis
- **Researchers**: Data extraction and multi-tool workflows
- **Security Professionals**: URL/email analysis and validation
- **Content Creators**: Managing copied content across projects
- **Power Users**: Anyone who copies lots of data and wants smart organization

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
