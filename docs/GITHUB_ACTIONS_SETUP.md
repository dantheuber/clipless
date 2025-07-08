# GitHub Actions Setup for Clipless

This document explains how to use the GitHub Actions workflow for building and releasing Clipless across multiple platforms.

## Overview

The GitHub Actions workflow (`/.github/workflows/build.yml`) automatically:

- **Builds** your Electron app on every push to main/master branches
- **Tests** builds on pull requests
- **Releases** your app when you push a version tag (e.g., `v1.0.1`)

## Supported Platforms

The workflow builds for all major platforms:

- **Windows**: Creates `.exe` installer (NSIS)
- **macOS**: Creates `.dmg` file (currently unsigned - see code signing section below)
- **Linux**: Creates AppImage, Snap, and Debian packages

## How to Release

To create a new release:

1. **Update version** in `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Release v1.0.1"
   ```

3. **Create and push a tag**:
   ```bash
   git tag v1.0.1
   git push origin main --tags
   ```

4. **GitHub Actions will automatically**:
   - Build for all platforms
   - Create a GitHub release draft
   - Upload all platform binaries as release assets

## Configuration Files

- **`/.github/workflows/build.yml`**: GitHub Actions workflow
- **`/electron-builder.yml`**: Electron Builder configuration
- **`/package.json`**: Contains repository URL and release script

## Code Signing (macOS)

Currently, macOS builds are **unsigned** because code signing requires:

- Apple Developer Account ($99/year)
- Code signing certificate
- App-specific password for notarization

### To enable macOS code signing later:

1. **Get Apple Developer certificates** and export as `.p12` file
2. **Add GitHub Secrets**:
   - `MAC_CERTS`: Base64-encoded certificate file
   - `MAC_CERTS_PASSWORD`: Certificate password
   - `API_KEY_ID`: App Store Connect API key ID
   - `API_KEY_ISSUER_ID`: App Store Connect issuer ID
   - `API_KEY`: App Store Connect API key content

3. **Update workflow** to include code signing steps

4. **Update electron-builder.yml**:
   ```yaml
   mac:
     # Remove this line: identity: null
     notarize: true
   ```

## Windows Code Signing

Windows code signing is also optional but recommended for distribution. Similar to macOS, you would need:

- Code signing certificate
- GitHub secrets: `WINDOWS_CERTS` and `WINDOWS_CERTS_PASSWORD`

## Troubleshooting

### Build Failures

- Check the Actions tab in your GitHub repository
- Common issues:
  - Node version compatibility
  - Missing dependencies
  - Platform-specific build requirements

### Release Not Created

Make sure:
- Tag follows format `v*.*.*` (e.g., `v1.0.0`)
- Repository has necessary permissions
- `GITHUB_TOKEN` has write access (should be automatic)

## Manual Build

To test builds locally:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux

# Release (with publishing)
npm run release
```

## Environment Variables

The workflow sets these environment variables:

- `CSC_IDENTITY_AUTO_DISCOVERY=false`: Disables automatic code signing discovery
- `CSC_LINK=""`: Empty certificate link
- `CSC_KEY_PASSWORD=""`: Empty certificate password

These prevent build failures when code signing certificates are not available.
