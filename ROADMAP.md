# WSL Terminal - Roadmap

## Philosophy: Complete Features with Full Configuration

Each implemented feature should include its corresponding settings in the Settings panel. A feature is not complete until users can configure its behavior according to their preferences.

**Example**: GitHub integration shouldn't just connect - it should allow:
- Login/logout from Settings
- Configure default organization
- Set repository sync preferences
- Choose which panels show GitHub data

This approach ensures professional, polished features rather than half-implemented functionality.

---

## Completed Features

### v0.9.x (Current)
- [x] Multi-tab terminal with drag-and-drop reordering
- [x] Split panes (horizontal/vertical)
- [x] Multi-window with detach/reattach
- [x] Session restore (tabs, panes, CWD)
- [x] Search in terminal (Ctrl+F)
- [x] 6 built-in themes
- [x] Git Panel (branches, staging, commits)
- [x] Docker Panel (containers, images)
- [x] SSH Manager (save hosts, quick connect)
- [x] Project Switcher (by category)
- [x] Quick Commands
- [x] Command Palette
- [x] Services Dashboard
- [x] Quake Mode
- [x] Desktop notifications for long commands
- [x] Font ligatures support

---

## Short-term Roadmap (v1.0)

### GitHub Integration (Settings Required)
**Feature**: Full GitHub integration for seamless project/repo management

| Component | Description | Settings |
|-----------|-------------|----------|
| Authentication | OAuth login to GitHub | Login button, token display, logout |
| Repository List | Show user's repos in Project Switcher | Filter by owner/org, show private/public |
| Clone | Clone repos directly from palette | Default clone directory |
| Pull Requests | View/create PRs from Git Panel | Default reviewers, PR template |
| Issues | Quick issue creation | Default labels, assignees |

### Custom Shell Profiles (Settings Required)
**Feature**: Define custom shell configurations

| Component | Description | Settings |
|-----------|-------------|----------|
| Profile Editor | Create/edit shell profiles | Name, command, args, env vars |
| Profile Icons | Custom icons per profile | Icon picker |
| Startup Script | Run commands on shell start | Script editor |
| Working Directory | Default CWD per profile | Directory picker |

### SSH Manager Enhancement (Settings Required)
**Feature**: Complete SSH management suite

| Component | Description | Settings |
|-----------|-------------|----------|
| Key Management | Generate/import SSH keys | Key list, generate button |
| Agent Integration | SSH agent forwarding | Enable/disable agent |
| Jump Hosts | Configure bastion servers | Jump host list |
| Port Forwarding | Local/remote port forwarding | Forwarding rules |
| Connection Profiles | Save connection settings | Timeout, keepalive, compression |

---

## Mid-term Roadmap (v1.x)

### Workspace System
**Feature**: Save and restore complete workspace states

| Component | Description | Settings |
|-----------|-------------|----------|
| Workspace Save | Save current layout + terminals | Auto-save interval |
| Workspace Load | Restore saved workspaces | Default workspace on startup |
| Workspace Sync | Sync across machines | Sync provider (GitHub Gist, file) |
| Templates | Pre-defined workspace templates | Template library |

### Snippet Manager
**Feature**: Code and command snippet library

| Component | Description | Settings |
|-----------|-------------|----------|
| Snippet Library | Organize snippets by category | Categories configuration |
| Syntax Highlight | Highlight by language | Default language |
| Variables | Template variables in snippets | Variable defaults |
| Sharing | Export/import snippets | Export format |

### Advanced Git Features
**Feature**: Extended git functionality

| Component | Description | Settings |
|-----------|-------------|----------|
| Interactive Rebase | Visual rebase interface | Default rebase options |
| Stash Manager | Manage git stashes | Auto-stash on switch |
| Diff Viewer | Side-by-side diff view | Diff algorithm |
| Blame View | Line-by-line blame | Show blame in gutter |
| Conflict Resolution | Visual merge conflict resolver | Default merge tool |

### Database Panel
**Feature**: Database management and queries

| Component | Description | Settings |
|-----------|-------------|----------|
| Connections | Save database connections | Connection list |
| Query Editor | Execute SQL queries | Default database |
| Results View | View query results | Max rows, export format |
| Schema Browser | Browse tables/columns | Auto-refresh |

---

## Long-term Roadmap (v2.0+)

### Plugin System
**Feature**: Extend functionality with plugins

| Component | Description | Settings |
|-----------|-------------|----------|
| Plugin Manager | Install/update plugins | Plugin sources |
| Plugin API | JavaScript plugin API | API version |
| Themes | Custom theme plugins | Theme installation |
| Commands | Custom command plugins | Command registration |

### AI Assistant Integration
**Feature**: AI-powered terminal assistance

| Component | Description | Settings |
|-----------|-------------|----------|
| Command Suggestions | AI suggests commands | Enable/disable, provider |
| Error Explanation | Explain errors | Auto-explain on error |
| Script Generation | Generate scripts from description | Default language |
| Chat Interface | Interactive AI chat | Model selection |

### Remote Development
**Feature**: Develop on remote machines

| Component | Description | Settings |
|-----------|-------------|----------|
| Remote Connections | Connect to remote servers | Server list |
| File Sync | Sync files to remote | Sync rules |
| Remote Extensions | Run extensions on remote | Extension sync |
| Port Forwarding | Automatic port forwarding | Port rules |

### Cloud Integration
**Feature**: Cloud provider integrations

| Component | Description | Settings |
|-----------|-------------|----------|
| AWS | AWS CLI integration | Profile configuration |
| Azure | Azure CLI integration | Subscription settings |
| GCP | Google Cloud integration | Project settings |
| Kubernetes | kubectl integration | Cluster config |

---

## Settings Architecture

For each feature category, the Settings modal should have a dedicated section:

```
Settings
├── Appearance
│   ├── Theme
│   ├── Font
│   └── Cursor
├── Shell
│   ├── Default Profile
│   └── Custom Profiles
├── Window
│   ├── Quake Mode
│   └── Startup Behavior
├── Notifications
│   ├── Enable/Disable
│   └── Thresholds
├── Projects
│   ├── Root Path
│   └── Categories
├── GitHub (NEW)
│   ├── Authentication
│   ├── Repositories
│   └── PR/Issues
├── SSH (NEW)
│   ├── Keys
│   ├── Connections
│   └── Agent
├── Database (NEW)
│   ├── Connections
│   └── Query Defaults
└── Advanced
    ├── Experimental Features
    └── Debug Options
```

---

## Contributing

Want to contribute to a feature? Check out:
1. Pick a feature from the roadmap
2. Ensure Settings integration is planned
3. Open an issue to discuss implementation
4. Submit a PR with tests

Feature requests welcome via GitHub Issues!
