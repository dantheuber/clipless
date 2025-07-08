#!/bin/bash

# Release script for Clipless
# Usage: ./scripts/release.sh [version]
# Example: ./scripts/release.sh 1.0.1

set -e

# Get version from argument or prompt user
if [ -z "$1" ]; then
    echo "Current version: $(node -p "require('./package.json').version")"
    read -p "Enter new version: " VERSION
else
    VERSION=$1
fi

# Validate version format
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must be in format x.y.z (e.g., 1.0.1)"
    exit 1
fi

echo "Preparing release v$VERSION..."

# Update version in package.json
npm version $VERSION --no-git-tag-version

# Build and test
echo "Running build and tests..."
npm run typecheck
npm run lint

# Commit changes
git add package.json
git commit -m "Release v$VERSION"

# Create and push tag
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"

echo "✅ Release v$VERSION has been pushed!"
echo "🚀 GitHub Actions will now build and create the release."
echo "📦 Check the Actions tab: https://github.com/dantheuber/clipless/actions"
