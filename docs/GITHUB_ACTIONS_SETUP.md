# CI/CD Workflow for Clipless

This document explains the automated CI/CD workflow for building and releasing Clipless across multiple platforms.

## Overview

The CI/CD workflow consists of three main components:

1. **PR Validation** - Automated checks on pull requests
2. **Auto-tagging** - Automatic tag creation when PRs are merged
3. **Release Promotion** - Manual promotion of draft releases to published releases

## Workflow Components

### 1. PR Validation (`build.yml`)

**Triggers**: On every pull request to `main`/`master`

**Actions**:
- ✅ Typechecking (`npm run typecheck`)
- ✅ Linting (`npm run lint`)  
- ✅ Version bump validation (ensures version in `package.json` doesn't already exist as a tag)

**Requirements**: Developers must update the version in `package.json` as part of their PR.

### 2. Auto-tagging (`auto-tag.yml`)

**Triggers**: When PRs are merged to `main`/`master`

**Actions**:
- Reads version from `package.json`
- Creates a git tag (e.g., `v1.0.1`)
- Pushes the tag to trigger the build workflow

### 3. Build & Draft Release (`build.yml`)

**Triggers**: When a version tag is pushed (e.g., `v1.0.1`)

**Actions**:
- Builds for Windows, macOS, and Linux
- Creates a **draft release** with all platform binaries
- Uploads artifacts to the draft release

### 4. Release Promotion (`promote-release.yml`)

**Triggers**: Manual workflow dispatch

**Actions**:
- Promotes a draft release to published
- Allows editing release notes
- Option to mark as pre-release

## Developer Workflow

### Making Changes with Version Bump

1. **Create feature branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** and update version in `package.json`:
   ```json
   {
     "version": "1.0.2"  // Bump from 1.0.1
   }
   ```

3. **Create pull request**:
   - PR validation will run automatically
   - Ensures version 1.0.2 doesn't already exist as a tag
   - Runs typecheck and linting

4. **Merge PR**:
   - Auto-tagging workflow creates `v1.0.2` tag
   - Build workflow automatically creates draft release

5. **Promote release** (when ready):
   - Go to Actions → "Promote Release"
   - Enter tag `v1.0.2`
   - Edit release notes
   - Run workflow to publish

## Release Management

### Promoting a Draft Release

1. **Navigate to Actions** in your GitHub repository
2. **Select "Promote Release"** workflow  
3. **Click "Run workflow"** and provide:
   - **Tag**: `v1.0.2` (the version to promote)
   - **Release Notes**: Markdown-formatted notes
   - **Pre-release**: Check if this is a beta/alpha release

4. **Run the workflow** to publish the release

### Release Notes Template

The workflow includes a default template:

```markdown
## What's New

- Feature updates and improvements  
- Bug fixes

## Download

Choose the appropriate download for your operating system:
- **Windows**: `clipless-{version}-setup.exe`
- **macOS**: `clipless-{version}.dmg`
- **Linux**: `clipless-{version}.AppImage` or install via Snap Store
```

The `{version}` placeholder is automatically replaced with the actual version.

## Platform Support

### ✅ **Supported Platforms**:

- **Windows**: `.exe` installer (NSIS format)
- **Linux**: AppImage, Snap package, and Debian package  
- **macOS**: `.dmg` file (currently unsigned)

### 🔐 **Code Signing Status**:

- **Windows**: ❌ Unsigned (builds work fine)
- **macOS**: ❌ Unsigned (builds work but show security warnings)  
- **Linux**: ✅ No signing required

## Version Management

### Version Naming Convention
- Use semantic versioning: `MAJOR.MINOR.PATCH`
- Examples: `1.0.0`, `1.2.5`, `2.0.0`

### When to Bump Versions
- **Patch** (1.0.0 → 1.0.1): Bug fixes, small improvements
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

## Troubleshooting

### PR Validation Fails

**"Tag already exists"**: The version in `package.json` is already released
- Solution: Bump the version number in your PR

**Typecheck/Lint errors**: Code quality issues
- Solution: Fix the errors shown in the workflow logs

### Auto-tag Not Created

**Check the auto-tag workflow**: Look at Actions → "Auto Tag on Merge"
- May indicate version wasn't bumped in the merged PR

### Build Failures

**Platform-specific issues**: Check the build logs for each OS
- Linux: Missing system dependencies
- Windows: Build environment issues  
- macOS: Code signing conflicts

### Release Promotion Fails

**Tag doesn't exist**: Verify the tag was created by the auto-tag workflow
**Release not found**: Ensure the build workflow completed and created a draft

## Manual Operations

### Create Tag Manually (if needed)
```bash
git tag v1.0.2
git push origin v1.0.2
```

### Local Testing
```bash
# Run the same checks as CI
npm run typecheck
npm run lint

# Test local builds
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux
```

This workflow ensures code quality, automates repetitive tasks, and provides controlled release management while maintaining flexibility for manual oversight.
