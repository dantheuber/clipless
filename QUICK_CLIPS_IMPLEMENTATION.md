# Quick Clips Feature Implementation

## Overview

Quick Clips is a powerful feature that allows users to automatically detect patterns in clipboard content and quickly open web tools with the extracted data. This feature consists of three main components:

1. **Search Terms** - Regular expressions with named capture groups that extract data from clipboard content
2. **Tools** - Web URLs that can be opened with the extracted data
3. **Pattern Scanning** - Automatic detection and manual scanning of clipboard content

## Components

### Search Terms

Search terms use regular expressions with named capture groups to extract specific data patterns from clipboard content.

**Built-in Patterns Included:**
- Email addresses (`(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`)
- IP addresses (`(?<ipAddress>\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b)`)
- Domain names (`(?<domainName>\b[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,}\b)`)
- Phone numbers (`(?<phoneNumber>\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b)`)
- URLs (`(?<url>https?:\/\/[^\s]+)`)
- MAC addresses (`(?<macAddress>\b[0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}\b)`)
- IPv6 addresses (`(?<ipv6Address>\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b::1\b|\b::ffff:[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b)`)

### Tools

Tools are web URLs that can be opened with extracted data. They use token replacement to insert captured values.

**Example Tool:**
- Name: "MX Toolbox"
- URL: `https://mxtoolbox.com/SuperTool.aspx?action=mx%3a{domainName}&run=toolpage`
- Supported Groups: `domainName`

### User Interface

#### Settings (Settings > Quick Clips)

**Three tabs available:**
1. **Search Terms** - Create and manage pattern detection rules
2. **Tools** - Configure web tools for opening with extracted data
3. **Test Patterns** - Test patterns against sample text

**Export/Import:**
- Export configuration as JSON for sharing
- Import configuration from JSON files

#### Main Application

**Visual Indicators:**
- Small blue search icon appears on clips with detected patterns
- Scan button in clip options highlights when patterns are detected

**Quick Clips Scanner:**
- Accessed via the scan button (search icon) in clip options
- Shows all detected patterns and their extracted values
- Lists compatible tools for the selected patterns
- Allows bulk opening of multiple tools with selected data

## Implementation Details

### Data Storage

Quick Clips data is stored separately from other application data:
- Search terms and tools are stored in the main application database
- Separate export/import functionality for sharing configurations
- Migration support for future updates

### API Structure

**Search Terms API:**
- `searchTermsGetAll()` - Get all search terms
- `searchTermsCreate(name, pattern)` - Create new search term
- `searchTermsUpdate(id, updates)` - Update existing search term
- `searchTermsDelete(id)` - Delete search term
- `searchTermsTest(pattern, text)` - Test pattern against text

**Tools API:**
- `quickToolsGetAll()` - Get all tools
- `quickToolsCreate(name, url, captureGroups)` - Create new tool
- `quickToolsUpdate(id, updates)` - Update existing tool
- `quickToolsDelete(id)` - Delete tool
- `quickToolsValidateUrl(url, captureGroups)` - Validate tool URL

**Scanning API:**
- `quickClipsScanText(text)` - Scan text for patterns
- `quickClipsOpenTools(matches, toolIds)` - Open tools with extracted data
- `quickClipsExportConfig()` - Export configuration
- `quickClipsImportConfig(config)` - Import configuration

### Pattern Matching

The system uses JavaScript's built-in RegExp engine with named capture groups:
- Patterns are tested against clipboard content automatically
- Results include the source search term and all captured values
- Tools are matched based on their supported capture groups

### Error Handling

- Invalid regular expressions are caught and logged
- Network errors when opening tools are handled gracefully
- Import/export errors show user-friendly messages
- Pattern detection failures don't break the application

## Usage Examples

### Example 1: Domain Analysis

1. Create search term: "Domain" with pattern `(?<domain>[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`
2. Create tools:
   - "Whois Lookup": `https://whois.net/{domain}`
   - "DNS Checker": `https://dnschecker.org/#{domain}`
3. Copy domain name to clipboard
4. Click scan button on the clip
5. Select detected domain and both tools
6. Click "Open Tools" to launch both websites

### Example 2: IP Address Investigation

1. Use built-in IP address pattern
2. Create tools:
   - "IP Geolocation": `https://whatismyipaddress.com/ip/{ipAddress}`
   - "Ping Test": `https://ping.eu/ping/?host={ipAddress}`
3. Copy IP address to clipboard
4. Scan and open tools as needed

## Configuration Sharing

Users can share Quick Clips configurations by:
1. Exporting their configuration to a JSON file
2. Sharing the file with other users
3. Other users can import the configuration to get the same search terms and tools

This makes it easy to distribute useful patterns and tools within teams or communities.
