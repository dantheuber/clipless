# Hotkeys Module Refactoring

This document describes the refactoring of the monolithic `hotkeys.ts` file into a modular structure.

## Previous Structure

- `src/main/hotkeys.ts` - Single file containing all hotkey functionality (~219 lines)

## New Modular Structure

```
src/main/hotkeys/
├── index.ts         # Module exports and singleton instance
├── types.ts         # Type definitions and interfaces
├── registry.ts      # Low-level hotkey registration/unregistration
├── actions.ts       # Action handlers (window focus, clip copying)
└── manager.ts       # Main coordinator class
```

## Module Responsibilities

### `types.ts`
- Contains TypeScript interfaces and type definitions
- Defines callback maps, registry state, and registered hotkey structures

### `registry.ts` 
- `HotkeyRegistry` class handles low-level hotkey registration with Electron's `globalShortcut`
- Manages the set of currently registered hotkeys
- Provides registration, unregistration, and cleanup functionality

### `actions.ts`
- `HotkeyActions` class implements all hotkey action handlers
- Handles window focusing, clip copying, and clipboard format conversion
- Separates action logic from registration logic

### `manager.ts`
- `HotkeyManager` class coordinates between registry and actions
- Manages initialization, settings changes, and high-level hotkey operations
- Orchestrates the registration of different hotkey types

### `index.ts`
- Exports all public classes and types
- Creates and exports the singleton `hotkeyManager` instance
- Provides the main module interface

## Benefits

1. **Separation of Concerns**: Each module has a single, focused responsibility
2. **Maintainability**: Smaller, focused files are easier to understand and modify
3. **Testability**: Individual components can be tested in isolation
4. **Reusability**: Components can be reused or replaced independently
5. **Type Safety**: Better type definitions and interfaces

## Backward Compatibility

- All existing imports continue to work unchanged
- The `hotkeyManager` singleton maintains the same public API
- No changes required in dependent code

## Migration Notes

- The original `hotkeys.ts` file has been renamed to `hotkeys.ts.old` for safety
- All imports from `../hotkeys` automatically resolve to the new `hotkeys/index.ts`
- The public API remains identical to ensure seamless migration
