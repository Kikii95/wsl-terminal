# WSL Terminal

A modern, lightweight terminal emulator for WSL2 built with Tauri, React, and xterm.js.

## Features

- **Multi-tab support** - Open multiple terminal sessions
- **Multiple shell profiles** - WSL, PowerShell, CMD
- **Theming** - 6 built-in themes (Catppuccin, Dracula, Nord, One Dark, Gruvbox, Tokyo Night)
- **Keyboard shortcuts** - Full keyboard navigation
- **Custom title bar** - Native-looking window controls
- **Lightweight** - ~10MB bundle size, ~50-100MB RAM usage

## Tech Stack

- **Frontend**: React 19, TypeScript, TailwindCSS, xterm.js
- **Backend**: Rust, Tauri 2.0
- **State**: Zustand with persistence

## Development

### Prerequisites

- Node.js 18+
- pnpm
- Rust 1.77+
- WSL2 (for testing)

### Setup

```bash
# Install dependencies
pnpm install

# Run in development
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Tab | `Ctrl+Shift+T` |
| Close Tab | `Ctrl+W` |
| Next Tab | `Ctrl+Tab` |
| Previous Tab | `Ctrl+Shift+Tab` |
| Switch to Tab 1-9 | `Ctrl+1-9` |

## Configuration

Configuration is stored in localStorage and persisted between sessions.

### Available Themes

- Catppuccin Mocha (default)
- Dracula
- Nord
- One Dark
- Gruvbox Dark
- Tokyo Night

## Roadmap

- [ ] Quake mode (dropdown terminal)
- [ ] Split panes
- [ ] SSH manager
- [ ] Search in terminal
- [ ] Plugin system

## License

MIT
