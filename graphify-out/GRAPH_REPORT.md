# Graph Report - .  (2026-06-08)

## Corpus Check
- 232 files · ~112,010 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 915 nodes · 1895 edges · 61 communities (53 shown, 8 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.81)
- Token cost: 0 input · 278,150 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Secure Storage & Persistence|Secure Storage & Persistence]]
- [[_COMMUNITY_Clipboard Monitoring & IPC|Clipboard Monitoring & IPC]]
- [[_COMMUNITY_Clips Provider & Rendering|Clips Provider & Rendering]]
- [[_COMMUNITY_Window Management|Window Management]]
- [[_COMMUNITY_Website & Project Docs|Website & Project Docs]]
- [[_COMMUNITY_Language Detection|Language Detection]]
- [[_COMMUNITY_Global Hotkeys|Global Hotkeys]]
- [[_COMMUNITY_Dev Dependencies & Tooling|Dev Dependencies & Tooling]]
- [[_COMMUNITY_User Settings UI|User Settings UI]]
- [[_COMMUNITY_Quick Clips Settings UI|Quick Clips Settings UI]]
- [[_COMMUNITY_Hotkey Settings UI|Hotkey Settings UI]]
- [[_COMMUNITY_Screenshot Capture & Demo Data|Screenshot Capture & Demo Data]]
- [[_COMMUNITY_NPM Scripts|NPM Scripts]]
- [[_COMMUNITY_Theme & Updater Providers|Theme & Updater Providers]]
- [[_COMMUNITY_Quick Clips Scanner|Quick Clips Scanner]]
- [[_COMMUNITY_App UI Screens|App UI Screens]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Storage Settings UI|Storage Settings UI]]
- [[_COMMUNITY_CICD Workflow Docs|CI/CD Workflow Docs]]
- [[_COMMUNITY_Package Manifest & Config|Package Manifest & Config]]
- [[_COMMUNITY_Feature Overview Concepts|Feature Overview Concepts]]
- [[_COMMUNITY_Screenshots TSConfig|Screenshots TSConfig]]
- [[_COMMUNITY_Quick Clips Pattern Matching|Quick Clips Pattern Matching]]
- [[_COMMUNITY_Storage System Design|Storage System Design]]
- [[_COMMUNITY_Renderer Implementation Docs|Renderer Implementation Docs]]
- [[_COMMUNITY_E2E TSConfig|E2E TSConfig]]
- [[_COMMUNITY_Web TSConfig|Web TSConfig]]
- [[_COMMUNITY_Branding & Icon Assets|Branding & Icon Assets]]
- [[_COMMUNITY_E2E Tools Tests & Helpers|E2E Tools Tests & Helpers]]
- [[_COMMUNITY_Theme System Docs|Theme System Docs]]
- [[_COMMUNITY_Electron Mocks|Electron Mocks]]
- [[_COMMUNITY_ESLint TSConfig|ESLint TSConfig]]
- [[_COMMUNITY_Node TSConfig|Node TSConfig]]
- [[_COMMUNITY_TLD Validation Data|TLD Validation Data]]
- [[_COMMUNITY_Clipboard Capture Concepts|Clipboard Capture Concepts]]
- [[_COMMUNITY_VSCode Settings|VSCode Settings]]
- [[_COMMUNITY_Process Architecture|Process Architecture]]
- [[_COMMUNITY_Update Banner|Update Banner]]
- [[_COMMUNITY_Website Theme Script|Website Theme Script]]
- [[_COMMUNITY_Syntax Highlighting|Syntax Highlighting]]
- [[_COMMUNITY_Context Menu E2E Test|Context Menu E2E Test]]
- [[_COMMUNITY_Test CI Jobs|Test CI Jobs]]
- [[_COMMUNITY_VSCode Launch Config|VSCode Launch Config]]
- [[_COMMUNITY_Root TSConfig|Root TSConfig]]
- [[_COMMUNITY_VSCode Tasks|VSCode Tasks]]
- [[_COMMUNITY_Preload Type Definitions|Preload Type Definitions]]
- [[_COMMUNITY_VSCode Extensions|VSCode Extensions]]
- [[_COMMUNITY_PR Template|PR Template]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 74 edges
2. `SecureStorage` - 44 edges
3. `UserSettings` - 26 edges
4. `scripts` - 22 edges
5. `storage` - 19 edges
6. `SearchTerm` - 19 edges
7. `QuickTool` - 19 edges
8. `ClipItem` - 18 edges
9. `HotkeyManager` - 15 edges
10. `Clipless Documentation Page` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Encrypted Storage (OS keystore)` --references--> `SecureStorage (safeStorage)`  [INFERRED]
  README.md → docs/STORAGE.md
- `Quick Clips Feature Implementation` --references--> `Quick Clips (pattern detection)`  [INFERRED]
  docs/QUICK_CLIPS_IMPLEMENTATION.md → README.md
- `Dev Auto-update Config (GitHub provider)` --conceptually_related_to--> `action-electron-builder (build/release)`  [INFERRED]
  dev-app-update.yml → .github/workflows/manual-tag-release.yml
- `Main Process (src/main)` --references--> `SecureStorage (safeStorage)`  [INFERRED]
  CLAUDE.md → docs/STORAGE.md
- `Clipboard Data Flow` --conceptually_related_to--> `Automatic Clipboard Monitoring (polling)`  [INFERRED]
  CLAUDE.md → docs/CLIP_TYPES_USAGE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI/CD Release Pipeline (validate, tag, build, promote)** — build_pr_validation, merge_to_main_auto_tag, manual_tag_release_action_electron_builder, github_actions_setup_promote_release [EXTRACTED 0.90]
- **Clipboard Capture to Encrypted Storage Flow** — clip_types_usage_monitoring, clip_types_usage_clipsprovider, storage_securestorage, claude_md_data_flow [INFERRED 0.85]
- **Non-blocking Startup Optimizations** — startup_performance_optimizations_deferred_updater, startup_performance_optimizations_parallel_storage, startup_performance_optimizations_ipc_guard, storage_storage_ready_event [EXTRACTED 0.85]
- **clipless.app Static Site Pages** — site_index_landing, site_docs_documentation, site_download_download_page, site_404_not_found [EXTRACTED 1.00]
- **Hotkeys Registry/Actions/Manager Pattern** — hotkeys_readme_registry, hotkeys_readme_actions, hotkeys_readme_manager [EXTRACTED 1.00]
- **Clips Provider Hook Composition** — clips_readme_use_clips_storage, clips_readme_use_clipboard_operations, clips_readme_use_clip_state, clips_readme_clips_provider [EXTRACTED 1.00]
- **Quick Tools Launch Flow (patterns to tools to templates)** — screens_found_patterns, screens_available_tools, screens_matched_templates [EXTRACTED 1.00]
- **Clip List Row Interactions (type, lock, search)** — screens_clip_type_indicator, screens_lock_toggle, screens_per_clip_search_icon [EXTRACTED 1.00]
- **Settings Tabs (General, Hotkeys, Tools)** — screens_settings_general, screens_settings_hotkeys, screens_settings_tabs [EXTRACTED 1.00]

## Communities (61 total, 8 thin omitted)

### Community 0 - "Secure Storage & Persistence"
Cohesion: 0.05
Nodes (51): api, DeleteConfirmState, QuickClipsActions, QuickClipsState, AppData, BookmarkData, ClipboardData, ClipType (+43 more)

### Community 1 - "Clipboard Monitoring & IPC"
Cohesion: 0.05
Nodes (69): clearImageCache(), getClipboardBookmark(), getClipboardHTML(), getClipboardImage(), getClipboardRTF(), getClipboardText(), getCurrentClipboardData(), getImageFingerprint() (+61 more)

### Community 2 - "Clips Provider & Rendering"
Cohesion: 0.06
Nodes (50): BookmarkClip, BookmarkClipProps, ClipContextMenu(), ClipContextMenuProps, ClipOptions(), ClipOptionsProps, ClipProps, ClipWrapper (+42 more)

### Community 3 - "Window Management"
Cohesion: 0.09
Nodes (33): initializeApp(), initializeServices(), setupAppEvents(), applyAutoStart(), canManageAutoStart(), getAutoStartState(), isAutoStartSupported(), hotkeyManager (+25 more)

### Community 4 - "Website & Project Docs"
Cohesion: 0.06
Nodes (46): ClipsProvider Component, Clips Provider Module Structure Doc, useClipState Hook, useClipboardOperations Hook, useClipsStorage Hook, electron-builder Packaging Config, GitHub Releases Publish (draft), Linux Targets (AppImage/snap/deb) (+38 more)

### Community 5 - "Language Detection"
Cohesion: 0.07
Nodes (38): SyntaxHighlightedCode, { mockThemeState }, TextClip(), TextClipProps, defaultSettings, DetectedLanguageInfo, LanguageDetectionContext, LanguageDetectionContextType (+30 more)

### Community 6 - "Global Hotkeys"
Cohesion: 0.09
Nodes (10): HotkeyManager, HotkeyRegistry, HotkeyCallbackMap, HotkeyRegistryState, RegisteredHotkey, UserSettings, ApplicationSettingsProps, baseSettings (+2 more)

### Community 7 - "Dev Dependencies & Tooling"
Cohesion: 0.07
Nodes (29): devDependencies, electron, electron-builder, @electron-toolkit/eslint-config-prettier, @electron-toolkit/eslint-config-ts, @electron-toolkit/tsconfig, electron-vite, eslint (+21 more)

### Community 8 - "User Settings UI"
Cohesion: 0.17
Nodes (18): useTheme(), UserSettings(), UserSettingsProps, ApplicationSettings(), CloseButton(), CloseButtonProps, ErrorState(), ErrorStateProps (+10 more)

### Community 9 - "Quick Clips Settings UI"
Cohesion: 0.14
Nodes (17): ConfirmDialog(), ConfirmDialogProps, InfoTooltip(), InfoTooltipProps, BUILTIN_PATTERNS, SearchTermsSection(), SearchTermsSectionProps, TestPatternsSection() (+9 more)

### Community 10 - "Hotkey Settings UI"
Cohesion: 0.16
Nodes (16): GlobalToggle(), GlobalToggleProps, HotkeyHeader(), HotkeyInstructions(), HotkeyInstructionsProps, HotkeyList(), HotkeyListProps, LoadingState() (+8 more)

### Community 11 - "Screenshot Capture & Demo Data"
Cohesion: 0.16
Nodes (19): DEMO_CLIPS, DemoClip, QUICK_TOOLS, SEARCH_TERMS, TEMPLATES, THEMES, cleanup(), launchApp() (+11 more)

### Community 12 - "NPM Scripts"
Cohesion: 0.09
Nodes (22): scripts, build, build:linux, build:mac, build:unpack, build:win, dev, format (+14 more)

### Community 13 - "Theme & Updater Providers"
Cohesion: 0.12
Nodes (14): ThemeDisplay(), Theme, ThemeContext, ThemeContextType, ThemeProvider(), ThemeProviderProps, ToolsManager(), UpdaterControl() (+6 more)

### Community 14 - "Quick Clips Scanner"
Cohesion: 0.15
Nodes (6): AccordionSection, QuickClipsScanner(), QuickClipsScannerProps, CaptureItem, computeAmbiguousGroups(), computeInitialSelection()

### Community 15 - "App UI Screens"
Cohesion: 0.15
Nodes (19): Available Quick Tools List, Clip List (numbered slots), Clip Locking, Clip Type Indicator (HTML/Text), Found Patterns Panel, Application Preferences (Max Clips, Start Minimized, Auto Start, Auto Updates), Global Hotkeys Configuration, Clip Lock Toggle (+11 more)

### Community 16 - "Runtime Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, classnames, @electron-toolkit/preload, @electron-toolkit/utils, electron-updater, @fortawesome/fontawesome-svg-core, @fortawesome/free-solid-svg-icons, @fortawesome/react-fontawesome (+5 more)

### Community 17 - "Storage Settings UI"
Cohesion: 0.29
Nodes (8): StorageSettings(), StorageSettingsProps, StorageStats, DataManagement(), DataManagementProps, StorageStatistics(), StorageStatisticsProps, useStorageSettings()

### Community 18 - "CI/CD Workflow Docs"
Cohesion: 0.24
Nodes (12): Prettier Config, PR Validation Workflow, Version Bump Check, CI/CD Workflow Documentation, Code Signing Status (unsigned builds), Release Promotion (manual dispatch), action-electron-builder (build/release), Manual Tag Release Workflow (+4 more)

### Community 19 - "Package Manifest & Config"
Cohesion: 0.17
Nodes (10): author, description, homepage, license, main, name, repository, type (+2 more)

### Community 20 - "Feature Overview Concepts"
Cohesion: 0.21
Nodes (12): Clipless (clipboard manager), Encrypted Storage (OS keystore), Global Hotkeys, Quick Clips (pattern detection), Tools Launcher, calculateWindowPosition(), createSettingsWindow(), Settings Window Positioning (+4 more)

### Community 21 - "Screenshots TSConfig"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, lib, module, moduleResolution, skipLibCheck, strict, target (+2 more)

### Community 22 - "Quick Clips Pattern Matching"
Cohesion: 0.24
Nodes (10): Domain Name TLD Regex Pattern, tlds.ts TLD List, CaptureItem Interface, Capture Group Deduplication, Quick Clips Feature Implementation, RegExp Pattern Matching, Quick Clips Scanner, Search Terms (regex named groups) (+2 more)

### Community 23 - "Storage System Design"
Cohesion: 0.27
Nodes (9): Parallel/Non-blocking Storage Init, Domain-Specific Encrypted Files, Export/Import Data (JSON), Legacy Migration (v1 to v2), SecureStorage (safeStorage), storage-ready IPC Event, Clipless Storage System, getWindowBounds() (+1 more)

### Community 24 - "Renderer Implementation Docs"
Cohesion: 0.25
Nodes (9): ClipsProvider, Dev Auto-update Config (GitHub provider), codeDetectionEnabled Setting, Language Detection Provider, Language Detection Implementation, languageDetection Utility, Deferred Auto-updater Check, Startup Performance Optimizations (+1 more)

### Community 25 - "E2E TSConfig"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, module, moduleResolution, skipLibCheck, strict, target, include

### Community 26 - "Web TSConfig"
Cohesion: 0.22
Nodes (8): compilerOptions, baseUrl, composite, jsx, paths, extends, include, @renderer/*

### Community 27 - "Branding & Icon Assets"
Cohesion: 0.36
Nodes (8): Clipless Brand Mark (stylized 'e' / paperclip glyph), Clipless Brand Mark (site PNG, white-on-dark), Electron Logo (decorative framework asset), Clipless Site Icon (brand mark on dark tile), Wavy Lines Background (decorative gradient oscillation), E2E Test Image Fixture (solid blue tile), Clipless App Icon (multi-DPI set: 1x..5x), Clipless Logo (vector brand mark)

### Community 28 - "E2E Tools Tests & Helpers"
Cohesion: 0.29
Nodes (4): appPath, findWindowByUrl(), openSettingsToolsTab(), UNIQUE

### Community 29 - "Theme System Docs"
Cohesion: 0.25
Nodes (8): react-syntax-highlighter (Prism), Quick Clips Manager Styling, Theming (system light/dark), CSS Modules over Tailwind, Dark-first Light-override CSS Pattern, Theme System Implementation, Theme Provider (React Context), useTheme Hook

### Community 30 - "Electron Mocks"
Cohesion: 0.25
Nodes (7): app, BrowserWindow, clipboard, globalShortcut, nativeImage, safeStorage, shell

### Community 31 - "ESLint TSConfig"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, strict, strictNullChecks, exclude, extends, include

### Community 32 - "Node TSConfig"
Cohesion: 0.25
Nodes (7): compilerOptions, composite, module, moduleResolution, types, extends, include

### Community 33 - "TLD Validation Data"
Cohesion: 0.25
Nodes (5): ALL_TLDS, COMMON_CCTLDS, COMMON_GTLDS, ORIGINAL_TLDS, SPECIAL_USE_TLDS

### Community 34 - "Clipboard Capture Concepts"
Cohesion: 0.38
Nodes (7): Duplicate Prevention, Clipboard Types Extension & Monitoring, Automatic Clipboard Monitoring (polling), Prioritized Format Detection, Clip Quick Search, Clipboard Capture (multi-format), Lock Clips

### Community 35 - "VSCode Settings"
Cohesion: 0.29
Nodes (6): [javascript], editor.defaultFormatter, [json], editor.defaultFormatter, [typescript], editor.defaultFormatter

### Community 36 - "Process Architecture"
Cohesion: 0.40
Nodes (6): Clipboard Data Flow, Main Process (src/main), Preload Context Bridge (src/preload), CLAUDE.md Project Guidance, Renderer React App (src/renderer), Electron Three-Process Architecture

### Community 38 - "Website Theme Script"
Cohesion: 0.60
Nodes (3): applyThemeLabels(), setTheme(), toggleTheme()

### Community 41 - "Test CI Jobs"
Cohesion: 0.67
Nodes (4): Coverage Report PR Comment, E2E Tests Job (Playwright), Tests Workflow, Unit Tests Job (Vitest coverage)

### Community 42 - "VSCode Launch Config"
Cohesion: 0.50
Nodes (3): compounds, configurations, version

## Knowledge Gaps
- **249 isolated node(s):** `recommendations`, `version`, `configurations`, `compounds`, `editor.defaultFormatter` (+244 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserSettings` connect `Global Hotkeys` to `Secure Storage & Persistence`, `Clipboard Monitoring & IPC`, `Clips Provider & Rendering`, `User Settings UI`, `Hotkey Settings UI`, `Theme & Updater Providers`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `SecureStorage (safeStorage)` connect `Storage System Design` to `Renderer Implementation Docs`, `Theme System Docs`, `Process Architecture`, `Feature Overview Concepts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `recommendations`, `version`, `configurations` to the rest of the system?**
  _251 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Secure Storage & Persistence` be split into smaller, more focused modules?**
  _Cohesion score 0.05201465201465202 - nodes in this community are weakly interconnected._
- **Should `Clipboard Monitoring & IPC` be split into smaller, more focused modules?**
  _Cohesion score 0.05133161512027491 - nodes in this community are weakly interconnected._
- **Should `Clips Provider & Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.059466848940533154 - nodes in this community are weakly interconnected._
- **Should `Window Management` be split into smaller, more focused modules?**
  _Cohesion score 0.09438775510204081 - nodes in this community are weakly interconnected._