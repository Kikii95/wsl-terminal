use super::types::*;
use serde_json::json;

pub fn get_tools() -> Vec<ToolInfo> {
    vec![
        ToolInfo {
            name: "open_tab".to_string(),
            description: "Open a new terminal tab with specified shell (wsl, powershell, cmd)".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "shell": {
                        "type": "string",
                        "description": "Shell type: wsl, powershell, or cmd",
                        "enum": ["wsl", "powershell", "cmd"],
                        "default": "wsl"
                    },
                    "distro": {
                        "type": "string",
                        "description": "WSL distribution name (only for wsl shell)"
                    },
                    "cwd": {
                        "type": "string",
                        "description": "Working directory to start in"
                    },
                    "title": {
                        "type": "string",
                        "description": "Custom tab title"
                    }
                }
            }),
        },
        ToolInfo {
            name: "close_tab".to_string(),
            description: "Close a terminal tab by its ID".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "tab_id": {
                        "type": "string",
                        "description": "The tab ID to close"
                    }
                },
                "required": ["tab_id"]
            }),
        },
        ToolInfo {
            name: "focus_tab".to_string(),
            description: "Focus/activate a specific tab".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "tab_id": {
                        "type": "string",
                        "description": "The tab ID to focus"
                    }
                },
                "required": ["tab_id"]
            }),
        },
        ToolInfo {
            name: "get_tabs".to_string(),
            description: "List all open tabs with their info (id, title, shell, active state)".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolInfo {
            name: "run_command".to_string(),
            description: "Execute a command in a specific terminal tab".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "tab_id": {
                        "type": "string",
                        "description": "The tab ID to run command in"
                    },
                    "command": {
                        "type": "string",
                        "description": "The command to execute"
                    },
                    "wait_for_output": {
                        "type": "boolean",
                        "description": "Wait and return command output",
                        "default": false
                    },
                    "timeout_ms": {
                        "type": "integer",
                        "description": "Timeout in milliseconds when waiting for output",
                        "default": 5000
                    }
                },
                "required": ["tab_id", "command"]
            }),
        },
        ToolInfo {
            name: "get_output".to_string(),
            description: "Get recent output from a terminal tab".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "tab_id": {
                        "type": "string",
                        "description": "The tab ID to get output from"
                    },
                    "lines": {
                        "type": "integer",
                        "description": "Number of lines to retrieve",
                        "default": 100
                    }
                },
                "required": ["tab_id"]
            }),
        },
        ToolInfo {
            name: "set_theme".to_string(),
            description: "Change the terminal theme".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "theme": {
                        "type": "string",
                        "description": "Theme name (catppuccin-mocha, dracula, nord, etc.)"
                    }
                },
                "required": ["theme"]
            }),
        },
        ToolInfo {
            name: "get_themes".to_string(),
            description: "List all available themes".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolInfo {
            name: "add_ssh".to_string(),
            description: "Add a new SSH connection".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Display name for the connection"
                    },
                    "host": {
                        "type": "string",
                        "description": "SSH host address"
                    },
                    "port": {
                        "type": "integer",
                        "description": "SSH port",
                        "default": 22
                    },
                    "user": {
                        "type": "string",
                        "description": "SSH username"
                    }
                },
                "required": ["name", "host", "user"]
            }),
        },
        ToolInfo {
            name: "remove_ssh".to_string(),
            description: "Remove an SSH connection".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "SSH connection ID to remove"
                    }
                },
                "required": ["id"]
            }),
        },
        ToolInfo {
            name: "list_ssh".to_string(),
            description: "List all saved SSH connections".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolInfo {
            name: "connect_ssh".to_string(),
            description: "Open a new tab and connect via SSH".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "SSH connection ID to connect to"
                    }
                },
                "required": ["id"]
            }),
        },
        ToolInfo {
            name: "get_state".to_string(),
            description: "Get complete app state (tabs, theme, SSH connections)".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolInfo {
            name: "show_window".to_string(),
            description: "Show and focus the terminal window".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolInfo {
            name: "hide_window".to_string(),
            description: "Hide the terminal window".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolInfo {
            name: "split_pane".to_string(),
            description: "Split the current pane horizontally or vertically".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "tab_id": {
                        "type": "string",
                        "description": "The tab ID to split"
                    },
                    "direction": {
                        "type": "string",
                        "description": "Split direction",
                        "enum": ["horizontal", "vertical"]
                    },
                    "shell": {
                        "type": "string",
                        "description": "Shell for new pane",
                        "enum": ["wsl", "powershell", "cmd"],
                        "default": "wsl"
                    }
                },
                "required": ["tab_id", "direction"]
            }),
        },
    ]
}
