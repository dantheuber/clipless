# Quick Clips Feature Implementation

## Overview

Quick Clips is a powerful feature that allows users to automatically detect patterns in clipboard content and quickly open web tools with the extracted data. This feature consists of three main components:

1. **Search Terms** - Regular expressions with named capture groups that extract data from clipboard content
2. **Tools** - Web URLs that can be opened with the extracted data
3. **Pattern Scanning** - Automatic detection and manual scanning of clipboard content with individual capture group selection

## Key Features

- **Individual Capture Group Selection**: Each extracted value is selectable independently, allowing granular control over which data to use with tools
- **Automatic Deduplication**: Identical capture group values from different patterns are automatically deduplicated
- **Multi-Tool Support**: Selected capture groups can be opened with multiple tools simultaneously
- **Enhanced Pattern Library**: Built-in patterns include nested capture groups for comprehensive data extraction

## Components

### Search Terms

Search terms use regular expressions with named capture groups to extract specific data patterns from clipboard content.

**Built-in Patterns Included:**
- Email addresses (`(?<email>[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`)
- IP addresses (`(?<ipAddress>\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b)`)
- Domain names (`(?<domainName>\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(${TLD_PATTERN})\b)`)
- Phone numbers (`(?<phoneNumber>\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b)`)
- URLs with domain extraction (`(?<url>https?:\/\/(?<domainName>[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*)(?:\/[^\s]*)?)`) - Extracts both full URL and domain name
- MAC addresses (`(?<macAddress>\b[0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}\b)`)
- IPv6 addresses (`(?<ipv6Address>\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b::1\b|\b::ffff:[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b)`)

**Enhanced URL Pattern:**
The URL pattern now includes nested capture groups, extracting both the complete URL and the domain name separately. This allows tools to work with either the full URL or just the domain, and provides automatic deduplication when multiple URLs from the same domain are detected.

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
- **Individual Capture Group Selection**: Shows each extracted value as a separate, selectable item
- **Automatic Deduplication**: Identical values from different patterns are merged (e.g., same domain from multiple URLs)
- **Smart Tool Compatibility**: Lists compatible tools based on selected capture groups
- **Bulk Operations**: Allows opening multiple tools simultaneously with all selected capture groups
- **Combined Data Passing**: Selected capture groups are combined into a single data object for each tool

**Enhanced Scanner Features:**
- Each capture group value is individually selectable (e.g., `domainName: example.com`, `url: https://example.com/page`)
- Tools receive all selected capture groups, regardless of which search terms they originated from
- Deduplication ensures unique values are shown only once
- Multi-tool support allows opening several tools with the same data set

## Technical Implementation Details

### Scanner Architecture Changes

The Quick Clips Scanner has been redesigned to provide granular control over data extraction:

**Previous Behavior:**
- Pattern matches were grouped by search term
- All capture groups from a pattern were selected together
- Tools received separate PatternMatch objects for each search term

**Current Behavior:**
- Individual capture group values are extracted and made selectable
- Deduplication occurs at the value level using `${groupName}-${value}` keys
- Selected values are combined into a single PatternMatch object for all tools

### Data Structures

**CaptureItem Interface:**
```typescript
interface CaptureItem {
  groupName: string      // The capture group name (e.g., "domainName")
  value: string         // The extracted value (e.g., "example.com")
  searchTermId: string  // ID of the source search term
  uniqueKey: string     // Combination key for deduplication
}
```

**Processing Pipeline:**
1. **Extraction**: Raw matches are processed to create individual CaptureItem objects
2. **Deduplication**: Items with identical `groupName-value` combinations are merged
3. **Selection**: Users can select/deselect individual capture group values
4. **Combination**: Selected items are combined into a single PatternMatch object
5. **Distribution**: The combined object is sent to all selected tools

### Benefits of the New Architecture

- **Granular Control**: Users can select exactly which data to use
- **Reduced Noise**: Duplicate values are automatically filtered
- **Multi-Tool Efficiency**: One data object works with multiple tools
- **Flexible Workflows**: Mix and match data from different search patterns

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
- **Individual Value Extraction**: Each capture group value becomes a separate selectable item
- **Deduplication Logic**: Values with identical capture group names and values are merged
- **Multi-Pattern Support**: Capture groups from different search terms can be selected together
- Tools are matched based on their supported capture groups

**Scanner Data Flow:**
1. Raw pattern matches are processed to extract individual capture group values
2. Duplicate values are automatically filtered using `${groupName}-${value}` keys
3. Each unique capture group value becomes an individually selectable item
4. Selected items are combined into a single PatternMatch object for tool consumption
5. All selected tools receive the same combined data object

### Error Handling

- Invalid regular expressions are caught and logged
- Network errors when opening tools are handled gracefully
- Import/export errors show user-friendly messages
- Pattern detection failures don't break the application

## Usage Examples

### Example 1: Enhanced URL Analysis

1. Copy URL to clipboard: `https://www.example.com/page`
2. URL pattern extracts two values:
   - `url: https://www.example.com/page`
   - `domainName: www.example.com`
3. Create tools:
   - "Whois Lookup": `https://whois.net/{domainName}`
   - "URL Analyzer": `https://analyzer.com/?url={url}`
   - "Domain Tools": `https://tools.com/{domainName}`
4. In scanner, select both capture groups and all three tools
5. All tools open with appropriate data (domain tools get domain, URL analyzer gets full URL)

### Example 2: Multi-Pattern Data Extraction

1. Copy mixed content: `Contact john@example.com or visit https://example.com for more info`
2. Scanner extracts:
   - `email: john@example.com`
   - `url: https://example.com`
   - `domainName: example.com` (from URL pattern)
3. Create tools:
   - "Email Validator": `https://validator.com/{email}`
   - "Domain Checker": `https://checker.com/{domainName}`
   - "Multi-Tool": `https://tools.com/?email={email}&domain={domainName}&url={url}`
4. Select all capture groups and the multi-tool
5. Multi-tool receives all three values in a single request

### Example 3: Deduplication in Action

1. Copy content with multiple URLs from same domain:
   ```
   Visit https://github.com/user/repo1 and https://github.com/user/repo2
   ```
2. Scanner shows:
   - `url: https://github.com/user/repo1`
   - `url: https://github.com/user/repo2`
   - `domainName: github.com` (only shown once, deduplicated)
3. Selecting the domain and a domain analysis tool opens the tool once with `github.com`

## Configuration Sharing

Users can share Quick Clips configurations by:
1. Exporting their configuration to a JSON file
2. Sharing the file with other users
3. Other users can import the configuration to get the same search terms and tools

This makes it easy to distribute useful patterns and tools within teams or communities.
