# Clipboard Module

This module handles all clipboard-related functionality in Clipless, organized into separate files for better maintainability and code organization.

## Module Structure

### `index.ts`
Main entry point that re-exports all clipboard functionality and provides the `initializeClipboardSystem()` function for setting up the complete clipboard system.

### `data.ts`
Core clipboard data operations:
- `getCurrentClipboardData()` - Get current clipboard content with type prioritization
- Clipboard read operations (`getClipboardText`, `getClipboardHTML`, etc.)
- Clipboard write operations (`setClipboardText`, `setClipboardHTML`, etc.)

### `monitoring.ts`
Clipboard change detection and monitoring:
- `initializeClipboardMonitoring()` - Initialize clipboard state tracking
- `checkClipboard()` - Check for clipboard changes
- `startClipboardMonitoring()` / `stopClipboardMonitoring()` - Control monitoring

### `ipc.ts`
IPC (Inter-Process Communication) handlers:
- All `ipcMain.handle()` registrations for clipboard-related operations
- Bridges between renderer process requests and main process clipboard functions
- Prevents multiple IPC handler registrations

### `storage-integration.ts`
Integration with the storage system:
- Clip management (get, save, export, import, clear)
- Settings management
- Storage statistics

### `templates.ts`
Template management functions:
- CRUD operations for templates
- Template reordering
- Text generation from templates

### `search-terms.ts`
Search terms and pattern matching:
- CRUD operations for search terms
- Pattern testing functionality
- Regular expression handling

### `quick-tools.ts`
Quick tools management:
- CRUD operations for quick tools
- URL validation for tools
- Tool reordering

### `quick-clips.ts`
Quick clips scanning and processing:
- Text pattern scanning
- Opening tools with matched patterns
- URL generation with captured groups
- Configuration import/export

## Usage

Import the main initialization function in your main process:

```typescript
import { initializeClipboardSystem } from './clipboard';

// Initialize the complete clipboard system
initializeClipboardSystem(mainWindow);
```

Or import specific functionality:

```typescript
import { getCurrentClipboardData, setClipboardText } from './clipboard';
```

## Design Benefits

1. **Modularity**: Each file has a single responsibility
2. **Maintainability**: Easier to locate and modify specific functionality
3. **Reusability**: Functions can be imported individually as needed
4. **Testability**: Smaller modules are easier to unit test
5. **No Naming Conflicts**: Avoids conflicts between clipboard file and folder names
