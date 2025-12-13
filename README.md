# WSL Terminal

A modern, feature-rich terminal emulator for WSL2 built with Tauri 2.0, React 19, and xterm.js.

![Version](https://img.shields.io/badge/version-0.9.3-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20(WSL2)-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Terminal Core
- **Multi-tab support** - Open unlimited terminal sessions with drag-and-drop tab reordering
- **Split panes** - Horizontal and vertical splits with resizable panels
- **Multi-window** - Detach tabs into separate windows with content preservation
- **Session restore** - Automatic restoration of tabs, panes, and working directories on restart
- **Search in terminal** - Full text search with Ctrl+F

### Shell Profiles
- **WSL** - All installed distributions auto-detected
- **PowerShell** - Windows PowerShell integration
- **CMD** - Command Prompt support

### Developer Tools
- **Git Panel** - Branch management, staging, commits, push/pull
- **Docker Panel** - Container and image management with start/stop/remove
- **SSH Manager** - Save and quick-connect to SSH hosts
- **Project Switcher** - Navigate projects by category (~/projects/ecole, perso, travail)
- **Quick Commands** - Save and execute frequent commands

### UI/UX
- **6 Built-in themes** - Catppuccin Mocha, Dracula, Nord, One Dark, Gruvbox Dark, Tokyo Night
- **Command Palette** - Quick access to all features with Ctrl+Shift+P
- **Status Bar** - Current shell, working directory, git branch
- **Services Dashboard** - Monitor Docker, database, and web services
- **Quake Mode** - Dropdown terminal with customizable hotkey
- **Desktop notifications** - Alert when long-running commands complete

### Technical
- **Lightweight** - ~15MB installer, ~80-120MB RAM
- **Font ligatures** - Support for Fira Code, JetBrains Mono, etc.
- **Persistent configuration** - All settings saved locally

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5, TailwindCSS 4, Framer Motion |
| Terminal | xterm.js 5 with addons (fit, search, web-links, ligatures) |
| Backend | Rust 1.77+, Tauri 2.0 |
| State | Zustand with localStorage persistence |
| Build | Vite 7, pnpm |

## Installation

### From Releases
Download the latest `.msi` installer from [Releases](https://github.com/Kikii95/wsl-terminal/releases).

### From Source
```bash
# Prerequisites: Node.js 18+, pnpm, Rust 1.77+, WSL2

# Clone and install
git clone https://github.com/Kikii95/wsl-terminal.git
cd wsl-terminal
pnpm install

# Development
pnpm tauri dev

# Build
pnpm tauri build
```

## Keyboard Shortcuts

### Tabs & Navigation
| Action | Shortcut |
|--------|----------|
| New Tab | `Ctrl+Shift+T` |
| Close Tab | `Ctrl+W` |
| Next Tab | `Ctrl+Tab` |
| Previous Tab | `Ctrl+Shift+Tab` |
| Switch to Tab 1-9 | `Ctrl+1-9` |

### Terminal
| Action | Shortcut |
|--------|----------|
| Copy | `Ctrl+C` (with selection) or `Ctrl+Shift+C` |
| Paste | `Ctrl+V` or `Ctrl+Shift+V` |
| Search | `Ctrl+F` |
| Clear | `Ctrl+L` |

### Panes
| Action | Shortcut |
|--------|----------|
| Split Horizontal | `Ctrl+Shift+H` |
| Split Vertical | `Ctrl+Shift+V` |
| Close Pane | `Ctrl+Shift+W` |

### Features
| Action | Shortcut |
|--------|----------|
| Command Palette | `Ctrl+Shift+P` |
| Settings | `Ctrl+,` |
| Toggle Quake Mode | `Ctrl+\`` (configurable) |

## Configuration

All settings are accessible via Settings (`Ctrl+,`) and persisted in localStorage.

### Appearance
- Theme selection
- Font family and size
- Cursor style (block, underline, bar)
- Font ligatures toggle

### Shell
- Default shell profile
- Custom shell profiles (coming soon)

### Window
- Quake mode toggle and hotkey
- Start minimized option

### Notifications
- Enable/disable desktop notifications
- Minimum command duration threshold

### Projects
- Root path for project switcher
- Category folders

## Screenshots

*Coming soon*

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see [LICENSE](LICENSE) for details.
