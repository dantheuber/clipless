# Settings Window Positioning

## Overview

The settings window positioning system ensures that when the settings window is opened, it remains fully visible within the available screen area, regardless of where the main window is positioned.

## Problem

Previously, when the main window was positioned close to the edge of the screen, the settings window would sometimes open partially or completely off-screen, making it difficult or impossible for users to access the settings.

## Solution

### Smart Positioning Algorithm

The `calculateWindowPosition` function in `src/main/window/settings.ts` implements a smart positioning algorithm that:

1. **Primary Position**: Attempts to position the settings window to the right of the main window with a 20px gap
2. **Fallback Position**: If there's not enough space on the right, tries to position it to the left of the main window with a 20px gap
3. **Edge Case Handling**: If neither left nor right positioning with gaps works, positions the window with minimal padding (10px) from the screen edge
4. **Vertical Adjustment**: Adjusts the Y position only when necessary to prevent the window from going off the top or bottom of the screen

### Key Features

- **Minimal Edge Padding**: Uses only 10px padding from screen edges when necessary
- **Preferred Positioning**: Tries to maintain the preferred right/left positioning with proper gaps first
- **Overlap Tolerance**: Allows the settings window to overlap the main window if needed to stay close to screen edges
- **Conservative Adjustments**: Only adjusts position when the window would actually go off-screen

### Implementation Details

The positioning logic is implemented in two main parts:

1. **Helper Function** (`calculateWindowPosition` in `settings.ts`):
   - Takes main window reference and desired window dimensions
   - Returns optimal x,y coordinates or undefined if no main window exists
   - Includes logging for debugging positioning decisions

2. **Integration** (`createSettingsWindow` in `creation.ts`):
   - Uses the helper function when creating the settings window
   - Applies the calculated position to the BrowserWindow constructor

### Usage

The positioning is automatically applied whenever the settings window is created via:
- Status bar settings button
- System tray settings menu item
- Hotkey-triggered settings opening

### Testing Scenarios

The positioning system handles various edge cases:

1. **Right Edge**: Main window near right edge of screen
2. **Left Edge**: Main window near left edge of screen  
3. **Top Edge**: Main window near top of screen
4. **Bottom Edge**: Main window near bottom of screen
5. **Corner Cases**: Main window in screen corners
6. **Small Screens**: Ensures usability on smaller displays

### Code Location

- Main implementation: `src/main/window/settings.ts` - `calculateWindowPosition()`
- Integration: `src/main/window/creation.ts` - `createSettingsWindow()`
- Type definitions: Uses Electron's `BrowserWindow` and `screen` APIs

### Future Enhancements

Potential improvements could include:

- Support for multi-monitor setups (positioning on the display containing the main window)
- User preference for settings window position
- Remember last settings window position
- Animation during repositioning for better UX
