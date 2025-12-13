# WSL Terminal - Roadmap

## Philosophy: Complete Features = UI + Settings + MCP Tools

A feature is **not complete** until it includes all three pillars:

### 1. User Interface
The visible feature that users interact with directly in the terminal.

### 2. Settings Panel
Configuration options so users can customize the feature's behavior.

### 3. MCP Tools (Model Context Protocol)
Expose the feature to AI assistants (Claude) so they can:
- Query information from the feature
- Execute actions on behalf of the user
- Integrate with AI-powered workflows

---

**Example**: GitHub Integration should include:

| Pillar | Implementation |
|--------|----------------|
| **UI** | GitHub panel showing repos, PRs, issues |
| **Settings** | Login/logout, default org, sync preferences |
| **MCP Tools** | `github_list_repos`, `github_create_pr`, `github_clone`, `github_switch_repo` |

This allows Claude to say: *"I'll clone the repo and switch to it"* and actually do it via MCP tools.

---

**Another Example**: Docker Panel

| Pillar | Implementation |
|--------|----------------|
| **UI** | Container list, start/stop buttons, logs view |
| **Settings** | Default docker host, refresh interval, show all/running |
| **MCP Tools** | `docker_list_containers`, `docker_start`, `docker_stop`, `docker_logs`, `docker_exec` |

This enables Claude to: *"Let me check if your database container is running... it's stopped, I'll start it for you."*

---

This approach creates a **truly integrated terminal** where:
- Users have full control via UI
- Everything is configurable via Settings
- Claude can assist and automate via MCP

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

### GitHub Integration
**Feature**: Full GitHub integration for seamless project/repo management

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Authentication | OAuth login to GitHub | Login button, token display, logout | `github_auth_status` |
| Repository List | Show user's repos in Project Switcher | Filter by owner/org, show private/public | `github_list_repos`, `github_switch_repo` |
| Clone | Clone repos directly from palette | Default clone directory | `github_clone` |
| Pull Requests | View/create PRs from Git Panel | Default reviewers, PR template | `github_list_prs`, `github_create_pr` |
| Issues | Quick issue creation | Default labels, assignees | `github_list_issues`, `github_create_issue` |

### Custom Shell Profiles
**Feature**: Define custom shell configurations

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Profile Editor | Create/edit shell profiles | Name, command, args, env vars | `shell_list_profiles`, `shell_create_profile` |
| Profile Icons | Custom icons per profile | Icon picker | - |
| Startup Script | Run commands on shell start | Script editor | `shell_set_startup_script` |
| Working Directory | Default CWD per profile | Directory picker | `shell_set_default_cwd` |

### SSH Manager Enhancement
**Feature**: Complete SSH management suite

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Key Management | Generate/import SSH keys | Key list, generate button | `ssh_list_keys`, `ssh_generate_key` |
| Agent Integration | SSH agent forwarding | Enable/disable agent | `ssh_agent_status` |
| Jump Hosts | Configure bastion servers | Jump host list | `ssh_list_jump_hosts` |
| Port Forwarding | Local/remote port forwarding | Forwarding rules | `ssh_forward_port`, `ssh_list_forwards` |
| Connection Profiles | Save connection settings | Timeout, keepalive, compression | `ssh_connect`, `ssh_list_hosts` |

---

## Mid-term Roadmap (v1.x)

### Workspace System
**Feature**: Save and restore complete workspace states

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Workspace Save | Save current layout + terminals | Auto-save interval | `workspace_save`, `workspace_list` |
| Workspace Load | Restore saved workspaces | Default workspace on startup | `workspace_load`, `workspace_delete` |
| Workspace Sync | Sync across machines | Sync provider (GitHub Gist, file) | `workspace_sync`, `workspace_export` |
| Templates | Pre-defined workspace templates | Template library | `workspace_from_template` |

### Snippet Manager
**Feature**: Code and command snippet library

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Snippet Library | Organize snippets by category | Categories configuration | `snippet_list`, `snippet_search` |
| Syntax Highlight | Highlight by language | Default language | - |
| Variables | Template variables in snippets | Variable defaults | `snippet_run`, `snippet_create` |
| Sharing | Export/import snippets | Export format | `snippet_export`, `snippet_import` |

### Advanced Git Features
**Feature**: Extended git functionality

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Interactive Rebase | Visual rebase interface | Default rebase options | `git_rebase_interactive` |
| Stash Manager | Manage git stashes | Auto-stash on switch | `git_stash`, `git_stash_pop`, `git_stash_list` |
| Diff Viewer | Side-by-side diff view | Diff algorithm | `git_diff`, `git_diff_file` |
| Blame View | Line-by-line blame | Show blame in gutter | `git_blame` |
| Conflict Resolution | Visual merge conflict resolver | Default merge tool | `git_conflicts`, `git_resolve` |

### Database Panel
**Feature**: Database management and queries

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Connections | Save database connections | Connection list | `db_list_connections`, `db_connect` |
| Query Editor | Execute SQL queries | Default database | `db_query`, `db_explain` |
| Results View | View query results | Max rows, export format | `db_export_results` |
| Schema Browser | Browse tables/columns | Auto-refresh | `db_list_tables`, `db_describe_table` |

---

## Long-term Roadmap (v2.0+)

### Plugin System
**Feature**: Extend functionality with plugins

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Plugin Manager | Install/update plugins | Plugin sources | `plugin_list`, `plugin_install`, `plugin_uninstall` |
| Plugin API | JavaScript plugin API | API version | `plugin_call` (invoke plugin methods) |
| Themes | Custom theme plugins | Theme installation | `theme_list`, `theme_apply` |
| Commands | Custom command plugins | Command registration | `command_list`, `command_run` |

### AI Assistant Integration
**Feature**: AI-powered terminal assistance

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Command Suggestions | AI suggests commands | Enable/disable, provider | `ai_suggest_command` |
| Error Explanation | Explain errors | Auto-explain on error | `ai_explain_error` |
| Script Generation | Generate scripts from description | Default language | `ai_generate_script` |
| Chat Interface | Interactive AI chat | Model selection | `ai_chat`, `ai_set_context` |

### Remote Development
**Feature**: Develop on remote machines

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| Remote Connections | Connect to remote servers | Server list | `remote_connect`, `remote_list` |
| File Sync | Sync files to remote | Sync rules | `remote_sync`, `remote_upload`, `remote_download` |
| Remote Extensions | Run extensions on remote | Extension sync | `remote_install_extension` |
| Port Forwarding | Automatic port forwarding | Port rules | `remote_forward_port` |

### Cloud Integration
**Feature**: Cloud provider integrations

| Component | Description | Settings | MCP Tools |
|-----------|-------------|----------|-----------|
| AWS | AWS CLI integration | Profile configuration | `aws_list_profiles`, `aws_switch_profile`, `aws_run` |
| Azure | Azure CLI integration | Subscription settings | `azure_list_subs`, `azure_switch_sub`, `azure_run` |
| GCP | Google Cloud integration | Project settings | `gcp_list_projects`, `gcp_switch_project`, `gcp_run` |
| Kubernetes | kubectl integration | Cluster config | `k8s_list_clusters`, `k8s_switch_context`, `k8s_run` |

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

## MCP Tools Architecture

The terminal exposes an MCP (Model Context Protocol) server that allows AI assistants like Claude to interact with terminal features programmatically.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude (AI)                             │
│  "Clone the repo and start the dev server"                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   WSL Terminal MCP Server                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ github_     │  │ docker_     │  │ terminal_   │         │
│  │ clone       │  │ start       │  │ run_command │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────┬───────────────────────────────────────┘
                      │ Tauri Commands
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Terminal Features                          │
│  Git Panel │ Docker Panel │ SSH Manager │ Terminal          │
└─────────────────────────────────────────────────────────────┘
```

### Core MCP Tools (Always Available)

| Tool | Description |
|------|-------------|
| `terminal_run_command` | Execute a command in the active terminal |
| `terminal_get_output` | Get recent terminal output |
| `terminal_new_tab` | Open a new terminal tab |
| `terminal_split` | Split current pane |
| `terminal_get_cwd` | Get current working directory |
| `file_read` | Read file contents |
| `file_write` | Write to a file |
| `file_list` | List directory contents |

### Tool Naming Convention

All MCP tools follow the pattern: `{feature}_{action}`

Examples:
- `github_clone` - Clone a GitHub repository
- `docker_start` - Start a Docker container
- `ssh_connect` - Connect to an SSH host
- `db_query` - Execute a database query

### Implementing MCP Tools for New Features

When adding a new feature, implement corresponding MCP tools:

```typescript
// Example: Adding MCP tools for a new "notes" feature
const notesTools = {
  notes_list: {
    description: "List all notes",
    parameters: { folder?: string },
    handler: async (params) => { /* ... */ }
  },
  notes_create: {
    description: "Create a new note",
    parameters: { title: string, content: string },
    handler: async (params) => { /* ... */ }
  },
  notes_search: {
    description: "Search notes by keyword",
    parameters: { query: string },
    handler: async (params) => { /* ... */ }
  }
};
```

---

## Contributing

Want to contribute to a feature? Check out:
1. Pick a feature from the roadmap
2. Ensure **all three pillars** are planned:
   - UI implementation
   - Settings integration
   - MCP Tools exposure
3. Open an issue to discuss implementation
4. Submit a PR with tests

Feature requests welcome via GitHub Issues!
