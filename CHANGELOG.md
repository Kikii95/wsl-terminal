# Changelog

All notable changes to WSL Terminal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.3] - 2024-12-13

### Fixed
- **Attach/Detach content preservation**: Terminal content is now preserved when detaching and reattaching windows
  - Added server-side output buffering (100KB max) in Rust backend
  - Added `get_shell_buffer` command to retrieve stored terminal output
  - Content is restored when window is reattached
- **Git Panel**: Branches and commits now display proper error messages when git commands fail
  - Added error state display for branches and commits sections
  - Improved backend error messages to include stderr output
- **Panels closing behavior**: SSH Manager and Services Dashboard no longer close when clicking outside
  - Panels now only close via X button or Escape key

## [0.9.2] - 2024-12-13

### Fixed
- Multi-window detach/attach improvements
- Docker and Git panel UI refinements

## [0.9.1] - 2024-12-13

### Fixed
- Critical bugfixes for v0.8.0 and v0.9.0 releases
- Session restore stability improvements

## [0.9.0] - 2024-12-13

### Added
- **Multi-window support**: Detach tabs into separate windows
- **Window reattach**: Bring detached windows back to main window
- **Content synchronization**: PTY sessions persist across window detach/attach

### Changed
- Improved window state management with Zustand
- Enhanced tab bar with detach button

## [0.8.0] - 2024-12-12

### Added
- **Git Panel**: Full git integration
  - Branch management (create, switch, delete)
  - File staging and unstaging
  - Commit creation with message
  - Push/pull operations
  - Recent commits display
- **Docker Panel**: Container and image management
  - View running/stopped containers
  - Start/stop/restart/remove containers
  - View images and remove unused
- **SSH Manager**: Quick SSH connections
  - Save SSH hosts with name, host, port, user
  - One-click connect to saved hosts
  - Edit and delete hosts
- **Services Dashboard**: Monitor local services
  - Docker daemon status
  - Database services (PostgreSQL, MySQL, MongoDB, Redis)
  - Web services (Node.js, Python, Nginx)

### Changed
- Status bar now shows git branch when in a repository
- Improved command palette with more actions

## [0.7.0] - 2024-12-11

### Added
- **Session Restore**: Automatic restoration on restart
  - Tabs and their shell types
  - Split pane layouts
  - Working directories (via OSC 7)
- **Project Switcher**: Quick project navigation
  - Categorized projects (ecole, perso, travail)
  - Configurable root path
  - Open in new tab or current

### Changed
- Configuration now persists working directories
- Improved pane container resize handling

## [0.6.0] - 2024-12-10

### Added
- **Split Panes**: Terminal splitting
  - Horizontal split (Ctrl+Shift+H)
  - Vertical split (Ctrl+Shift+V)
  - Resizable panels with drag
  - Independent sessions per pane
- **Pane Navigation**: Focus switching between panes

### Changed
- Tab system now supports pane layouts
- Improved keyboard navigation

## [0.5.0] - 2024-12-09

### Added
- **Search in Terminal**: Full text search
  - Ctrl+F to open search bar
  - Find next/previous
  - Highlight matches
- **Quick Commands**: Save frequent commands
  - Add/edit/delete commands
  - One-click execution
  - Categories support

### Changed
- Terminal now uses xterm.js search addon
- Improved command palette integration

## [0.4.0] - 2024-12-08

### Added
- **Command Palette**: Quick access to all features
  - Ctrl+Shift+P to open
  - Fuzzy search commands
  - Keyboard navigation
- **Desktop Notifications**: Long command alerts
  - Notify when commands take > 5 seconds
  - Configurable threshold
  - Only when window unfocused

### Changed
- Settings modal reorganized into sections
- Improved toast notification system

## [0.3.0] - 2024-12-07

### Added
- **Quake Mode**: Dropdown terminal
  - Toggle with Ctrl+` (configurable)
  - Slides from top of screen
  - Global hotkey support
- **More Themes**: Added 3 new themes
  - One Dark
  - Gruvbox Dark
  - Tokyo Night

### Changed
- Theme switching is now instant
- Improved font rendering

## [0.2.0] - 2024-12-06

### Added
- **Multi-tab Support**: Multiple terminal sessions
  - Tab bar with close buttons
  - Drag and drop reordering
  - Tab context menu
- **Shell Profiles**: Multiple shell types
  - WSL (all installed distros)
  - PowerShell
  - CMD
- **Keyboard Shortcuts**: Full keyboard navigation
  - Ctrl+Shift+T: New tab
  - Ctrl+W: Close tab
  - Ctrl+Tab/Ctrl+Shift+Tab: Navigate tabs
  - Ctrl+1-9: Switch to specific tab

### Changed
- Improved tab bar design
- Better shell detection

## [0.1.0] - 2024-12-05

### Added
- Initial release
- **Basic Terminal**: xterm.js based terminal emulator
- **WSL Integration**: Connect to WSL2 via PTY
- **Theming**: 3 built-in themes
  - Catppuccin Mocha (default)
  - Dracula
  - Nord
- **Custom Title Bar**: Native-looking window controls
- **Font Ligatures**: Support for programming fonts
- **Settings Modal**: Basic configuration
  - Theme selection
  - Font size and family
  - Cursor style and blink

### Technical
- Tauri 2.0 for native functionality
- React 19 for UI
- TypeScript for type safety
- TailwindCSS for styling
- Zustand for state management

---

## Release Notes Format

Each release should include:
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements
