# Clipboard Types Extension

## Overview

The clips provider has been extended to support multiple clipboard data types based on Electron's clipboard API. Each clip is now an object containing the content, type, and additional metadata.

## Changes Made

### 1. New Types and Interfaces

```typescript
export type ClipType = 'text' | 'html' | 'image' | 'rtf' | 'bookmark';

export interface ClipItem {
  type: ClipType;
  content: string;
  title?: string; // for bookmark type
  url?: string;   // for bookmark type
}
```

### 2. Updated ClipsProvider

- `clips` is now an array of `ClipItem[]` instead of `string[]`
- `getClip()` returns a `ClipItem` instead of a string
- `clipboardUpdated()` accepts a `ClipItem` instead of a string

### 3. Utility Functions

New helper functions for creating different clip types:

```typescript
createTextClip(content: string): ClipItem
createHtmlClip(content: string): ClipItem
createImageClip(content: string): ClipItem
createRtfClip(content: string): ClipItem
createBookmarkClip(title: string, url: string): ClipItem
```

### 4. Updated Components

- `Clip.tsx` now renders different content based on the clip type
- Added type labels for non-text clips
- Supports all Electron clipboard formats

## Supported Clipboard Types

### Text
Regular plain text content.
```typescript
const textClip = createTextClip("Hello, World!");
```

### HTML
HTML markup content.
```typescript
const htmlClip = createHtmlClip("<b>Bold text</b>");
```

### Image
Image data (typically as data URLs or file paths).
```typescript
const imageClip = createImageClip("data:image/png;base64,iVBORw0...");
```

### RTF (Rich Text Format)
Rich text format content.
```typescript
const rtfClip = createRtfClip("{\\rtf1\\ansi\\deff0 Rich text content}");
```

### Bookmark
Bookmark with title and URL (macOS/Windows).
```typescript
const bookmarkClip = createBookmarkClip("Google", "https://www.google.com");
```

## Usage Example

```typescript
import { useClips, createTextClip, createHtmlClip } from './providers/clips';

function MyComponent() {
  const { clipboardUpdated } = useClips();
  
  const addTextClip = () => {
    clipboardUpdated(createTextClip("Some text content"));
  };
  
  const addHtmlClip = () => {
    clipboardUpdated(createHtmlClip("<em>Emphasized</em> content"));
  };
  
  return (
    <div>
      <button onClick={addTextClip}>Add Text Clip</button>
      <button onClick={addHtmlClip}>Add HTML Clip</button>
    </div>
  );
}
```

## Integration with Electron Clipboard

To integrate with Electron's actual clipboard API, you would typically:

1. **Reading from clipboard:**
```typescript
const text = clipboard.readText();
const html = clipboard.readHTML();
const image = clipboard.readImage();
const rtf = clipboard.readRTF();
const bookmark = clipboard.readBookmark();
```

2. **Writing to clipboard:**
```typescript
clipboard.writeText(clip.content);
clipboard.writeHTML(clip.content);
clipboard.writeImage(nativeImage);
clipboard.writeRTF(clip.content);
clipboard.writeBookmark(clip.title, clip.url);
```

## Migration Notes

- Components using the old `clips` array will need to access `clip.content` instead of the clip directly
- Any code that expects clips to be strings will need to be updated to work with `ClipItem` objects
- The test buttons in `App.tsx` demonstrate how to create and add different clip types

## Future Enhancements

- Add clipboard format detection
- Support for multiple formats in a single clip
- Automatic conversion between formats
- Preview components for different clip types
- Clipboard monitoring integration
