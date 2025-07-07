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
- **Clips Storage**: All clipboard items are automatically saved with their lock status
- **Settings Storage**: User preferences and application settings are persisted
- **Automatic Sync**: Data is automatically loaded on startup and saved when changed

## Stored Data

### Clips
Each clip is stored with:
- **Content**: The actual clipboard data (text, HTML, RTF, images as base64, bookmarks)
- **Type**: The clip type (text, html, rtf, image, bookmark)
- **Lock Status**: Whether the clip is locked to prevent removal
- **Timestamp**: When the clip was captured

### Settings
User preferences including:
- **maxClips**: Maximum number of clips to store (default: 10)
- **startMinimized**: Start application minimized (default: false)
- **autoStart**: Start with system (default: false)
- **theme**: UI theme preference (light/dark/system)

## Storage Location

Data is stored in the user's application data directory:
- **Windows**: `%APPDATA%\clipless\clipless-data\data.enc`
- **macOS**: `~/Library/Application Support/clipless/clipless-data/data.enc`
- **Linux**: `~/.config/clipless/clipless-data/data.enc`

## API Reference

### Main Process APIs (IPC Handlers)

#### Clips Management
- `storage-get-clips`: Retrieve all stored clips
- `storage-save-clips`: Save clips with lock states

#### Settings Management
- `storage-get-settings`: Get user settings
- `storage-save-settings`: Update user settings

#### Data Management
- `storage-get-stats`: Get storage statistics
- `storage-export-data`: Export data as JSON
- `storage-import-data`: Import data from JSON
- `storage-clear-all`: Clear all stored data

### Renderer Process APIs

#### Available through `window.api`:
```typescript
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
2. **Real-time Sync**: Changes are automatically saved with debouncing
3. **Error Handling**: Graceful fallbacks when storage is unavailable

### Manual Integration
You can also manually interact with storage:

```typescript
import { storage } from './main/storage';

// Initialize storage
await storage.initialize();

// Save clips
await storage.saveClips(clips, lockedIndices);

// Load clips  
const storedClips = await storage.getClips();

// Manage settings
await storage.saveSettings({ maxClips: 20 });
const settings = await storage.getSettings();
```

## Security Considerations

### Encryption
- Data is encrypted at rest using platform-native encryption
- Encryption keys are managed by the operating system
- No encryption key management required in application code

### Access Control
- Data is tied to the user account and application
- Other applications cannot access the encrypted data
- Data persists through application updates

### Fallback Behavior
- If encryption is unavailable, the app uses in-memory storage
- Data is not persisted if encryption fails
- User is not notified to maintain seamless experience

## Data Migration

The storage system includes automatic data migration:
- **Version Detection**: Checks data format version
- **Graceful Upgrades**: Migrates old data formats to new schemas
- **Validation**: Ensures data integrity during migration
- **Fallback**: Uses defaults for invalid or missing data

## Backup and Restore

### Export Data
Users can export their data as unencrypted JSON:
- Includes all clips and settings
- Human-readable format
- Can be used for manual backup

### Import Data
Users can import previously exported data:
- Validates JSON format
- Merges with existing data
- Preserves data integrity

## Performance

### Optimizations
- **Debounced Saves**: Prevents excessive disk writes
- **Lazy Loading**: Storage is initialized only when needed
- **Efficient Serialization**: Minimal data transformation
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

### Debug Information
Enable debug logging by setting environment variable:
```bash
DEBUG=clipless:storage
```

## Future Enhancements

### Planned Features
- **Cloud Sync**: Optional cloud storage synchronization
- **Encryption Options**: User-selectable encryption methods
- **Data Compression**: Reduce storage size for large datasets
- **Selective Backup**: Export/import specific data types
- **Storage Quotas**: Limit storage size with automatic cleanup
