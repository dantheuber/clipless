# CI/CD Workflow Summary

## Quick Reference

### For Developers

1. **Work on feature branch**
2. **Update version in package.json** (e.g., `1.0.0` → `1.0.1`)
3. **Create PR** → automated validation runs
4. **Merge PR** → tag automatically created → draft release built

### For Release Managers

1. **Go to Actions tab** in GitHub
2. **Run "Promote Release" workflow**
3. **Enter tag** (e.g., `v1.0.1`)
4. **Edit release notes**
5. **Publish release**

## Workflow Files

- **`.github/workflows/build.yml`** - PR validation & build on tags
- **`.github/workflows/auto-tag.yml`** - Auto-create tags on merge
- **`.github/workflows/promote-release.yml`** - Manual release promotion

## Key Features

✅ **Automated PR validation** (typecheck, lint, version check)  
✅ **Automatic tagging** on merge  
✅ **Multi-platform builds** (Windows, macOS, Linux)  
✅ **Draft releases** for safe promotion  
✅ **Manual release control** with custom notes  
✅ **Version collision prevention**

## What Changed from Previous Setup

❌ **Removed**: Manual release scripts  
❌ **Removed**: Manual tag creation  
❌ **Removed**: Building on every push

✅ **Added**: PR validation workflow  
✅ **Added**: Automatic tag creation  
✅ **Added**: Draft release system  
✅ **Added**: Manual release promotion  
✅ **Added**: Version bump validation

This ensures better code quality, safer releases, and more professional deployment process.
