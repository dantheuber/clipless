# Clipboard Types Extension with Automatic Monitoring

## Overview

The clips provider has been extended to support multiple clipboard data types based on Electron's clipboard API and now includes automatic clipboard monitoring. The app will automatically detect when content is copied to the clipboard and add it to the clips array.

## Features

### Automatic Clipboard Monitoring
- **Real-time Detection**: Monitors clipboard changes every 500ms
- **Multi-format Support**: Detects text, HTML, RTF, images, and bookmarks
- **Background Monitoring**: Runs continuously while the app is open
- **Initial Load**: Reads current clipboard content when the app starts
- **Duplicate Prevention**: Automatically prevents adding the same content twice in a row

### Supported Clipboard Types
- **Text**: Plain text content
- **HTML**: HTML markup with visual indicators
- **RTF**: Rich Text Format with labels
- **Image**: Image data as data URLs
- **Bookmark**: URLs with titles (macOS/Windows)

## Implementation Details

### Main Process (Electron)
- **Clipboard API Integration**: Uses Electron's native clipboard module
- **IPC Handlers**: Provides secure communication with renderer process
- **Polling System**: Checks clipboard every 500ms for changes
- **Cross-platform Support**: Works on Windows, macOS, and Linux
- **Prioritized Detection**: Uses text > RTF > HTML > image > bookmark priority
- **Single-Source Logic**: Prevents duplicate detection bugs by tracking one prioritized format

### Preload Script
- **API Exposure**: Safely exposes clipboard functions to renderer
- **Event Handling**: Manages clipboard change notifications
- **Type Safety**: Full TypeScript support for all functions

### React Provider
- **Automatic Integration**: Starts monitoring on component mount
- **State Management**: Manages clips array with automatic updates
- **Manual Control**: Provides functions for manual clipboard reading
- **Duplicate Detection**: Prevents adding identical content to the most recent clip
- **Cleanup**: Properly stops monitoring when component unmounts

## Changes Made

### 1. Main Process Updates (`src/main/index.ts`)
```typescript
// New single-source clipboard monitoring system
const getCurrentClipboardData = (): { type: string; content: string } | null => {
  // Priority: text > rtf > html > image > bookmark
  const text = clipboard.readText();
  if (text && text.trim()) {
    return { type: 'text', content: text };
  }
  // ... check other formats in priority order
};

// Track only one clipboard value instead of multiple
let lastClipboardContent = '';
let lastClipboardType = '';

const checkClipboard = () => {
  const currentClipData = getCurrentClipboardData();
  if (currentClipData && 
      (currentClipData.content !== lastClipboardContent || 
       currentClipData.type !== lastClipboardType)) {
    // Send single change notification
    mainWindow.webContents.send('clipboard-changed', currentClipData);
    lastClipboardContent = currentClipData.content;
    lastClipboardType = currentClipData.type;
  }
};
```

### 2. Preload Script Updates (`src/preload/index.ts`)
```typescript
const api = {
  // Individual clipboard format readers
  getClipboardText: () => electronAPI.ipcRenderer.invoke('get-clipboard-text'),
  getClipboardHTML: () => electronAPI.ipcRenderer.invoke('get-clipboard-html'),
  
  // NEW: Prioritized clipboard data getter
  getCurrentClipboardData: () => electronAPI.ipcRenderer.invoke('get-current-clipboard-data'),
  
  // Monitoring controls
  startClipboardMonitoring: () => electronAPI.ipcRenderer.invoke('start-clipboard-monitoring'),
  onClipboardChanged: (callback) => electronAPI.ipcRenderer.on('clipboard-changed', callback),
};
```

### 3. ClipsProvider Updates (`src/renderer/src/providers/clips.tsx`)
```typescript
// Enhanced manual clipboard reading using prioritized data
const readCurrentClipboard = useCallback(async (): Promise<void> => {
  const clipData = await window.api.getCurrentClipboardData();
  if (!clipData) return;

  let newClip: ClipItem | null = null;
  switch (clipData.type) {
    case 'text': newClip = createTextClip(clipData.content); break;
    case 'rtf': newClip = createRtfClip(clipData.content); break;
    case 'html': newClip = createHtmlClip(clipData.content); break;
    // ... handle other types
  }
  
  if (newClip && !isDuplicateOfMostRecent(newClip)) {
    clipboardUpdated(newClip);
  }
}, []);

// Duplicate detection function
const isDuplicateOfMostRecent = useCallback((newClip: ClipItem): boolean => {
  if (clips.length === 0) return false;
  const mostRecentClip = clips[0];
  return mostRecentClip.type === newClip.type && 
         mostRecentClip.content === newClip.content;
}, [clips]);

// Enhanced clipboard update with duplicate prevention
const clipboardUpdated = useCallback((newClip: ClipItem): void => {
  if (isDuplicateOfMostRecent(newClip)) {
    console.log('Duplicate clip detected, not adding to array');
    return; // Skip adding duplicate
  }
  // ... proceed with adding clip
}, [clips, isDuplicateOfMostRecent]);

// Automatic clipboard monitoring with single-change detection
useEffect(() => {
  const startMonitoring = async () => {
    await readCurrentClipboard(); // Read initial content
    await window.api.startClipboardMonitoring(); // Start monitoring
    
    // Listen for clipboard changes - now receives single prioritized change
    window.api.onClipboardChanged((clipData) => {
      const newClip = createClipFromData(clipData);
      if (!isDuplicateOfMostRecent(newClip)) {
        clipboardUpdated(newClip);
      }
    });
  };
  
  startMonitoring();
}, []);
```

## API Reference

### ClipsProvider Context
```typescript
interface ClipsContextType {
  clips: ClipItem[];
  clipboardUpdated: (newClip: ClipItem) => void;
  readCurrentClipboard: () => Promise<void>; // NEW: Manual clipboard reading
  // ... other existing functions
}
```

### Clipboard API (window.api)
```typescript
interface ClipboardAPI {
  // Individual format readers
  getClipboardText: () => Promise<string>;
  getClipboardHTML: () => Promise<string>;
  getClipboardRTF: () => Promise<string>;
  getClipboardImage: () => Promise<string | null>;
  getClipboardBookmark: () => Promise<{title: string, url: string} | null>;
  
  // NEW: Prioritized clipboard data getter
  getCurrentClipboardData: () => Promise<{ type: string; content: string } | null>;
  
  // Control functions
  startClipboardMonitoring: () => Promise<boolean>;
  stopClipboardMonitoring: () => Promise<boolean>;
  onClipboardChanged: (callback: (data: ClipData) => void) => void;
  removeClipboardListeners: () => void;
}
```

## Usage Examples

### Automatic Operation
The clipboard monitoring starts automatically when the ClipsProvider mounts:

```typescript
function App() {
  return (
    <ClipsProvider>
      {/* Clipboard monitoring is now active */}
      <YourComponents />
    </ClipsProvider>
  );
}
```

### Manual Control
```typescript
function ClipboardControls() {
  const { readCurrentClipboard } = useClips();
  
  return (
    <button onClick={readCurrentClipboard}>
      Refresh from Clipboard
    </button>
  );
}
```

### Testing
Use the test buttons in the app:
- **"Add Test Clips"**: Adds sample clips of different types
- **"Read Current Clipboard"**: Manually reads current clipboard content

## Integration Testing

1. **Copy Text**: Copy some text → Should appear in clips automatically
2. **Copy HTML**: Copy from a web page → Should detect as HTML format
3. **Copy Images**: Copy an image → Should appear with image indicator
4. **Manual Refresh**: Click "Read Current Clipboard" → Should add current content

## Performance Considerations

- **Polling Frequency**: 500ms intervals (configurable)
- **Memory Management**: Automatic cleanup on component unmount
- **Cross-platform**: Optimized for Windows, macOS, and Linux
- **Error Handling**: Graceful fallbacks for unsupported formats
- **Duplicate Prevention**: Efficient comparison to avoid unnecessary updates
- **Console Logging**: Informative logs for debugging duplicate detection
- **Single-Source Logic**: Eliminates race conditions and double-triggering bugs
- **Prioritized Detection**: Consistent format selection based on defined priorities

## Future Enhancements

- [ ] Configurable polling interval
- [x] Duplicate detection and prevention
- [x] Single-source clipboard monitoring (eliminates double-triggering bugs)
- [x] Prioritized format detection (text > RTF > HTML > image > bookmark)
- [ ] Clipboard history persistence
- [ ] Custom format detection
- [ ] Preview generation for images
- [ ] Search functionality across clip history
- [ ] Extended duplicate detection (compare against multiple recent clips)
- [ ] User-configurable duplicate detection sensitivity
- [ ] User-configurable format priority ordering
