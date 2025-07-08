@echo off
REM Release script for Clipless (Windows)
REM Usage: scripts\release.bat [version]
REM Example: scripts\release.bat 1.0.1

setlocal enabledelayedexpansion

if "%1"=="" (
    for /f "tokens=*" %%i in ('node -p "require('./package.json').version"') do set CURRENT_VERSION=%%i
    echo Current version: !CURRENT_VERSION!
    set /p VERSION=Enter new version: 
) else (
    set VERSION=%1
)

REM Basic version validation
echo !VERSION! | findstr /r "^[0-9]*\.[0-9]*\.[0-9]*$" >nul
if errorlevel 1 (
    echo Error: Version must be in format x.y.z (e.g., 1.0.1)
    exit /b 1
)

echo Preparing release v!VERSION!...

REM Update version in package.json
call npm version !VERSION! --no-git-tag-version

REM Build and test
echo Running build and tests...
call npm run typecheck
call npm run lint

REM Commit changes
git add package.json
git commit -m "Release v!VERSION!"

REM Create and push tag
git tag "v!VERSION!"
git push origin main
git push origin "v!VERSION!"

echo ✅ Release v!VERSION! has been pushed!
echo 🚀 GitHub Actions will now build and create the release.
echo 📦 Check the Actions tab: https://github.com/dantheuber/clipless/actions
