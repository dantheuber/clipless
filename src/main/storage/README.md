# Storage Module

This directory contains the refactored storage system for Clipless, broken down into modular components for better maintainability and organization.

## Structure

### Core Files

- **`index.ts`** - Main `SecureStorage` class that orchestrates all storage operations
- **`defaults.ts`** - Default configurations, settings, and data structures
- **`migration.ts`** - Data migration logic for handling older data formats

### Functional Modules

- **`file-operations.ts`** - Low-level file I/O operations (encryption, decryption, file management)
- **`clips.ts`** - Clip-related data transformations and utilities
- **`settings.ts`** - Settings normalization and merging logic
- **`templates.ts`** - Template management operations and text generation
- **`search-terms.ts`** - Search term management and utilities
- **`quick-tools.ts`** - Quick tools management and configuration import
- **`window-bounds.ts`** - Window position/size persistence

## Key Benefits

1. **Modularity** - Each file has a single responsibility
2. **Maintainability** - Easier to locate and modify specific functionality
3. **Testability** - Individual modules can be tested in isolation
4. **Reusability** - Utility functions can be shared across modules
5. **Type Safety** - Better TypeScript support with focused imports

## Usage

The main storage instance is exported from `index.ts` and maintains the same API as the original monolithic file:

```typescript
import { storage } from './storage';

// All existing functionality works the same
const clips = await storage.getClips();
const settings = await storage.getSettings();
// etc.
```

## Migration

The original `storage.ts` file now simply re-exports the storage instance from this modular structure, ensuring backward compatibility with existing code.
