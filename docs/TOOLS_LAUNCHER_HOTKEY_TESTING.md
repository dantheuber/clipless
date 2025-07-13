# Tools Launcher Hotkey Testing Guide

## New Hotkey: `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (Mac)

### Test Steps:

1. **Enable Hotkeys**: 
   - Open Clipless Settings (gear icon or Ctrl+Shift+V)
   - Go to "Hotkeys" tab
   - Ensure "Enable Global Hotkeys" is checked
   - Verify "Open Tools Launcher for Latest Clip" is listed and enabled

2. **Test with Existing Content**:
   - Ensure you have at least one clip in your clipboard history
   - Press `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac)
   - The Tools Launcher window should open with the most recent clip content
   - If patterns are found, they should be displayed
   - If no patterns are found, you should see "No patterns found" message

3. **Test from Hidden Window**:
   - Hide the main Clipless window
   - Press `Ctrl+Shift+T`
   - Tools Launcher should still open, demonstrating global hotkey functionality

4. **Test Pattern Detection**:
   - Copy some text that matches your configured search terms
   - Press `Ctrl+Shift+T`
   - Tools Launcher should open and show detected patterns
   - You should be able to select patterns and tools to launch

### Expected Behavior:
- Hotkey works even when main window is hidden/minimized
- Opens tools launcher with the first (most recent) clip content
- Automatically scans for patterns and displays results
- Window can be closed with Esc key or close button
- After launching tools, window closes automatically

### Configuration:
- Default hotkey: `CommandOrControl+Shift+T`
- Can be customized in Settings > Hotkeys
- Can be enabled/disabled individually
