# Tools Launcher Window Implementation

## Overview

The QuickClipsScanner functionality has been extracted from the main window into a separate "tools-launcher" window. This provides a better user experience by opening scan results in a dedicated window that can be closed after launching tools.

## Changes Made

### 1. Configuration Updates
- **electron.vite.config.ts**: Added `tools-launcher` entry point to build configuration
- **HTML File**: Created `src/renderer/tools-launcher.html` for the tools launcher window
- **Entry Point**: Created `src/renderer/src/tools-launcher-main.tsx` to bootstrap the launcher

### 2. New Components
- **ToolsLauncher**: New React component that wraps the QuickClipsScanner in a window context
- **Updated QuickClipsScanner**: Modified to work both as a modal (legacy) and standalone window

### 3. Window Management
- **createToolsLauncherWindow()**: New function in `src/main/window/creation.ts`
- **Window positioning**: Similar to settings window, positioned relative to main window
- **Window properties**: 1000x700px, non-resizable, modal parent relationship

### 4. IPC Integration
- **open-tools-launcher**: Opens tools launcher window with clip content
- **close-tools-launcher**: Closes the tools launcher window
- **tools-launcher-ready**: Signals when window is ready for data
- **tools-launcher-initialize**: Sends clip content to window
- **onToolsLauncherInitialize**: Listener for initialization data

### 5. CSS Updates
- **Standalone Mode**: Added `.standalone` style for full-window display
- **Removed Overlay**: No overlay needed when used as dedicated window

## Usage

When users click the scan button (🔍) on any clip:
1. A new tools-launcher window opens with the clip content
2. The window automatically scans for patterns and displays results
3. Users can select patterns and tools, then launch them
4. Window closes automatically after tools are launched or when cancelled

## Benefits

- **Better UX**: Dedicated window doesn't block the main interface
- **Consistent Pattern**: Matches the existing settings window approach
- **Extensible**: Window can be expanded with additional tool functionality
- **Clean Architecture**: Separation of concerns between main app and tools

## Technical Notes

- Window name "tools-launcher" allows for future functionality expansion
- QuickClipsScanner component maintains backward compatibility
- IPC handlers follow existing patterns for maintainability
- CSS supports both modal and standalone modes
