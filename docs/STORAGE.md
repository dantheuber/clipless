# Clipless Storage System

This document describes the persistent storage system implemented for Clipless using Electron's safeStorage API.

## Features

### Secure Storage

- **Encryption**: All data is encrypted using Electron's safeStorage API, which uses the operating system's native encryption methods
- **Platform Security**:
  - Windows: Uses DPAPI (Data Protection API)
  - macOS: Uses Keychain Services
  - Linux: Uses Secret Service API or libsecret

### Data Persistence

- **Domain-Specific Files**: Data is split into separate encrypted files by domain for efficient per-domain saves
- **Settings Storage**: User preferences stored in `settings.enc`
- **Clips Storage**: Clipboard items stored in `clips.enc`
- **Templates Storage**: Templates, search terms, and quick tools stored in `templates.enc`
- **Metadata**: Unencrypted `meta.json` tracks storage version for migration
- **Automatic Sync**: Data is automatically loaded on startup and saved when changed

## Stored Data

### Clips (`clips.enc`)

Each clip is stored with:

- **Content**: The actual clipboard data (text, HTML, RTF, images as base64, bookmarks)
- **Type**: The clip type (text, html, rtf, image, bookmark)
- **Lock Status**: Whether the clip is locked to prevent removal
- **Timestamp**: When the clip was captured

### Settings (`settings.enc`)

User preferences including:

- **maxClips**: Maximum number of clips to store (default: 10)
- **startMinimized**: Start application minimized (default: false)
- **autoStart**: Start with system (default: false)
- **theme**: UI theme preference (light/dark/system)
- **hotkeys**: Global hotkey configuration

### Templates Data (`templates.enc`)

- **Templates**: Text generation templates with token placeholders
- **Search Terms**: Regex patterns for Quick Clips pattern scanning
- **Quick Tools**: URL templates for opening web resources with extracted data

### Metadata (`meta.json`)

- **version**: Application version that last wrote the data
- **storageVersion**: Storage format version for future migrations

### Window Bounds (`window-bounds.json`)

- Unencrypted JSON storing window position and size
- Read directly at startup without waiting for encrypted storage initialization

## Storage Location

Data is stored in the user's application data directory:

- **Windows**: `%APPDATA%\clipless\clipless-data\`
- **macOS**: `~/Library/Application Support/clipless/clipless-data/`
- **Linux**: `~/.config/clipless/clipless-data/`

Files:

- `settings.enc` — encrypted user settings
- `clips.enc` — encrypted clipboard data
- `templates.enc` — encrypted templates, search terms, quick tools
- `meta.json` — unencrypted storage version metadata
- `window-bounds.json` — unencrypted window position/size
- `images/{id}.enc` — encrypted full-size clipboard images
- `images/{id}_thumb.enc` — encrypted 200px-wide image thumbnails

## Startup Flow

1. **Window bounds** are loaded directly from `window-bounds.json` (no encryption dependency)
2. **Window displays immediately** with default data
3. **Storage initializes in background**: migrates legacy data if needed, then loads domain files
4. **`storage-ready` IPC event** notifies the renderer to re-fetch real data
5. **Window settings** are re-applied (transparency, always-on-top)

## API Reference

### Main Process APIs (IPC Handlers)

#### Clips Management

- `storage-get-clips`: Retrieve all stored clips
- `storage-save-clips`: Save clips with lock states

#### Settings Management

- `storage-get-settings`: Get user settings
- `storage-save-settings`: Update user settings

#### Data Management

- `storage-get-stats`: Get storage statistics (sums all domain file sizes)
- `storage-export-data`: Export data as JSON
- `storage-import-data`: Import data from JSON
- `storage-clear-all`: Clear all stored data

### Renderer Process APIs

#### Available through `window.api`:

```typescript
// Listen for storage ready (background load complete)
window.api.onStorageReady(() => {
  /* re-fetch data */
});

// Get clips from storage
const clips = await window.api.storageGetClips();

// Save clips to storage
const success = await window.api.storageSaveClips(clips, lockedIndices);

// Get settings
const settings = await window.api.storageGetSettings();

// Save settings
const success = await window.api.storageSaveSettings({ maxClips: 15 });

// Get storage statistics
const stats = await window.api.storageGetStats();

// Export data for backup
const jsonData = await window.api.storageExportData();

// Import data from backup
const success = await window.api.storageImportData(jsonData);

// Clear all data
const success = await window.api.storageClearAll();
```

## Integration

### Automatic Integration

The storage system is automatically integrated into the clips provider:

1. **Startup**: Clips and settings are loaded from storage
2. **Storage Ready**: When background load completes, renderer re-fetches real data
3. **Real-time Sync**: Changes are automatically saved with debouncing
4. **Error Handling**: Graceful fallbacks when storage is unavailable

### Manual Integration

You can also manually interact with storage:

```typescript
import { storage } from './main/storage';

// Initialize storage
await storage.initialize();

// Save clips (writes only clips.enc)
await storage.saveClips(clips, lockedIndices);

// Load clips
const storedClips = await storage.getClips();

// Manage settings (writes only settings.enc)
await storage.saveSettings({ maxClips: 20 });
const settings = await storage.getSettings();
```

## Security Considerations

### Encryption

- Data is encrypted at rest using platform-native encryption
- Encryption keys are managed by the operating system
- No encryption key management required in application code
- JSON is serialized without pretty-printing to minimize encrypted payload size

### Access Control

- Data is tied to the user account and application
- Other applications cannot access the encrypted data
- Data persists through application updates

### Fallback Behavior

- If encryption is unavailable, the app uses in-memory storage
- Data is not persisted if encryption fails
- User is not notified to maintain seamless experience

## Data Migration

### Legacy Migration (v1 → v2)

When upgrading from the monolithic `data.enc` format:

1. Detects `data.enc` exists but `clips.enc` does not
2. Reads and validates the legacy blob
3. Splits into domain-specific files (`settings.enc`, `clips.enc`, `templates.enc`, `meta.json`)
4. Renames `data.enc` to `data.enc.migrated`

### Ongoing Migration

- **Version Detection**: Checks data format version in `meta.json`
- **Graceful Upgrades**: Migrates old data formats to new schemas
- **Validation**: Ensures data integrity during migration
- **Fallback**: Uses defaults for invalid or missing data

## Backup and Restore

### Export Data

Users can export their data as unencrypted JSON:

- Includes all clips, settings, templates, search terms, and quick tools
- Human-readable format (pretty-printed for export only)
- Can be used for manual backup

### Import Data

Users can import previously exported data:

- Validates JSON format
- Splits into domain-specific files
- Preserves data integrity

## Performance

### Optimizations

- **Domain-Specific Saves**: Each save writes only the affected file, not the entire dataset
- **No Pretty-Printing**: Internal storage uses compact JSON to minimize encrypted size
- **Per-Domain Save Queuing**: Prevents concurrent writes to the same file while allowing parallel saves across domains
- **Debounced Saves**: Prevents excessive disk writes from the renderer
- **Non-Blocking Startup**: Window displays immediately; data loads in background
- **Direct Window Bounds**: `window-bounds.json` is read without encryption for instant position restore
- **Error Recovery**: Continues operation even if storage fails

### Storage Size

- Clips are filtered to remove empty content
- Image data is stored as base64 (may be large)
- Settings are lightweight JSON
- Total size typically under 1MB for normal usage

## Troubleshooting

### Common Issues

#### Storage Not Available

- Encryption may not be supported on the platform
- App falls back to in-memory storage
- Data is not persisted between sessions

#### Data Corruption

- Storage system validates data on load
- Corrupted data is replaced with defaults
- Error is logged for debugging

#### Permission Issues

- User data directory may not be accessible
- App falls back to temporary storage
- Consider running with proper permissions
