# Context Menu Implementation Guide

I've implemented two different approaches for adding right-click context menus to your clip items. Here's how to use them:

## Option 1: CSS-based Context Menu (Recommended)

This approach uses pure React and CSS, similar to your existing `ClipOptions` component but triggered by right-click instead of button click.

### Files Created:
- `src/renderer/src/components/clips/clip/ClipContextMenu.tsx` - The context menu component
- `src/renderer/src/components/clips/clip/ClipContextMenu.module.css` - The styles
- `src/renderer/src/hooks/useContextMenu.ts` - Custom hook for managing context menu state

### How it works:
1. The `ClipWrapper` component has been updated to include `onContextMenu={handleContextMenu}` 
2. When right-clicked, it opens a custom context menu at the cursor position
3. The menu includes all the same actions as the gear menu: Copy, Scan, Lock, Delete
4. The menu automatically positions itself to stay within the viewport
5. Clicking outside or pressing Escape closes the menu

### Features:
- **Smart Positioning**: Menu repositions if it would go off-screen
- **Visual Feedback**: Items highlight on hover, disabled items are grayed out
- **Pattern Detection**: Shows ⚡ icon when Quick Clips patterns are detected
- **Theme Support**: Works with both light and dark themes
- **Animations**: Smooth fade-in animation

## Option 2: Native Electron Context Menu

This approach uses Electron's native context menu system for a more platform-native experience.

### Files Created:
- `src/main/ipc/index.ts` - Updated with context menu IPC handlers
- `src/preload/index.ts` - Updated with context menu API
- `src/preload/index.d.ts` - Updated with context menu types
- `src/renderer/src/hooks/useNativeContextMenu.ts` - Hook for native context menus

### How it works:
1. Right-click triggers an IPC call to the main process
2. Main process creates a native OS context menu
3. Menu selections send IPC messages back to the renderer
4. Hook listens for these messages and executes the appropriate actions

### Features:
- **Native Look**: Uses the OS's native context menu styling
- **Keyboard Navigation**: Supports arrow keys and keyboard shortcuts
- **Accessibility**: Better screen reader support
- **Platform Consistency**: Matches other native app context menus

## Usage Examples

### Using the CSS Context Menu (Current Implementation)

The CSS context menu is already integrated into your `ClipWrapper` component. Just right-click any clip item to see it in action.

```tsx
// Already implemented in ClipWrapper.tsx
return (
  <li className={styles.clip}>
    <div
      className={classNames(/* ... */)}
      onContextMenu={handleContextMenu} // This triggers the context menu
    >
      {/* Your existing clip content */}
    </div>
    
    {/* Context menu is conditionally rendered */}
    {contextMenu.isOpen && contextMenu.targetIndex === index && (
      <ClipContextMenu
        index={index}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={closeContextMenu}
      />
    )}
  </li>
);
```

### Using the Native Context Menu

To switch to the native context menu, replace the current implementation in `ClipWrapper.tsx`:

```tsx
import { useNativeContextMenu } from '../../../hooks/useNativeContextMenu';

export function ClipWrapper({ clip, index }: ClipProps) {
  // Replace useContextMenu with useNativeContextMenu
  const { showContextMenu } = useNativeContextMenu({ index });
  
  // ... other code ...
  
  return (
    <li className={styles.clip}>
      <div
        className={classNames(/* ... */)}
        onContextMenu={showContextMenu} // Use native context menu
      >
        {/* Your existing clip content */}
      </div>
      {/* No need to render custom context menu component */}
    </li>
  );
}
```

## Customization

### Adding New Menu Items

**For CSS Context Menu:**
Edit `ClipContextMenu.tsx` to add new menu items:

```tsx
<div className={styles.menuItem} onClick={handleYourNewAction}>
  <FontAwesomeIcon icon="your-icon" className={styles.menuIcon} />
  <span>Your New Action</span>
</div>
```

**For Native Context Menu:**
Edit the template array in `src/main/ipc/index.ts`:

```typescript
const template = [
  // ... existing items ...
  {
    label: 'Your New Action',
    click: () => {
      event.sender.send('context-menu-action', { action: 'your-action', index });
    },
  },
];
```

### Styling the CSS Context Menu

Edit `ClipContextMenu.module.css` to customize:
- Colors: Change `background`, `color`, and hover states
- Animations: Modify the `@keyframes contextMenuFadeIn`
- Spacing: Adjust `padding`, `gap`, and `margin` values
- Shadows: Update `box-shadow` for different depth effects

## Recommendation

I recommend using **Option 1 (CSS-based Context Menu)** because:

1. **Consistency**: Matches your existing UI design and theme system
2. **Flexibility**: Easier to customize and style to match your app
3. **Control**: You have full control over behavior and appearance
4. **No IPC Overhead**: Doesn't require communication between processes
5. **Debugging**: Easier to debug since it's all in the renderer process

The native context menu is better if you want maximum platform integration, but the CSS approach gives you more design control and consistency with your existing UI.
