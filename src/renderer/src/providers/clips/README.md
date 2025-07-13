# Clips Provider Module Structure

This directory contains the modular implementation of the clips provider, which was refactored from a single large file into smaller, more manageable modules.

## Module Structure

### `types.ts`

- Contains all TypeScript type definitions and interfaces
- Exports `ClipType`, `ClipItem`, `ClipsContextType`, and `ClipboardState`

### `utils.ts`

- Utility functions for creating different types of clips
- Array management functions like `updateClipsLength`
- Export functions: `createEmptyClip`, `createTextClip`, `createHtmlClip`, `createImageClip`, `createRtfClip`, `createBookmarkClip`, `updateClipsLength`

### `storage.ts`

- Hook for managing storage operations (`useClipsStorage`)
- Handles loading clips and settings from storage on mount
- Manages saving clips and settings with debouncing
- Listens for settings updates from other windows

### `clipboard.ts`

- Hook for clipboard operations (`useClipboardOperations`)
- Manages clipboard monitoring and change detection
- Handles copying clips to clipboard with proper format handling
- Implements hotkey operation tracking and duplicate prevention

### `state.ts`

- Hook for clip state management (`useClipState`)
- Manages clip operations like get, empty, update, lock/unlock
- Handles clip array manipulation and duplicate detection
- Manages the `clipboardUpdated` logic for adding new clips

### `index.tsx`

- Main provider component that orchestrates all modules
- Exports the `ClipsProvider` component and `useClips` hook
- Re-exports all types and utilities for external consumption
- Maintains the same API as the original monolithic provider

## Usage

The refactored provider maintains 100% API compatibility with the original implementation. All imports from `providers/clips` continue to work exactly as before:

```tsx
import { ClipsProvider, useClips, ClipItem } from './providers/clips';
```

The refactoring provides these benefits:

1. **Improved maintainability**: Each module has a single responsibility
2. **Better testability**: Individual hooks and functions can be tested in isolation
3. **Enhanced readability**: Smaller files are easier to understand and navigate
4. **Reduced complexity**: The main provider is now much simpler and easier to follow
5. **Better separation of concerns**: Storage, clipboard, and state management are clearly separated

## File Organization

```
providers/
├── clips.tsx              # Re-export wrapper (maintains backward compatibility)
└── clips/
    ├── index.tsx          # Main provider orchestration
    ├── types.ts           # Type definitions
    ├── utils.ts           # Utility functions
    ├── storage.ts         # Storage operations
    ├── clipboard.ts       # Clipboard operations
    └── state.ts           # State management
```
