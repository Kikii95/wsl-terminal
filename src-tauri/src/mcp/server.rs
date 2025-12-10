use super::tools::get_tools;
use super::types::*;
use serde_json::json;
use std::io::{self, BufRead, Write};

const VERSION: &str = "0.4.0";

pub fn run_mcp_server() {
    eprintln!("[MCP] WSL Terminal MCP Server v{} starting...", VERSION);

    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[MCP] Read error: {}", e);
                continue;
            }
        };

        if line.is_empty() {
            continue;
        }

        let request: JsonRpcRequest = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[MCP] Parse error: {}", e);
                let response = JsonRpcResponse::error(
                    None,
                    -32700,
                    &format!("Parse error: {}", e),
                );
                let _ = writeln!(stdout, "{}", serde_json::to_string(&response).unwrap());
                let _ = stdout.flush();
                continue;
            }
        };

        let response = handle_request(&request);

        if let Err(e) = writeln!(stdout, "{}", serde_json::to_string(&response).unwrap()) {
            eprintln!("[MCP] Write error: {}", e);
        }
        let _ = stdout.flush();
    }
}

fn handle_request(request: &JsonRpcRequest) -> JsonRpcResponse {
    eprintln!("[MCP] Handling method: {}", request.method);

    match request.method.as_str() {
        "initialize" => handle_initialize(request),
        "initialized" => handle_initialized(request),
        "tools/list" => handle_list_tools(request),
        "tools/call" => handle_call_tool(request),
        "ping" => JsonRpcResponse::success(request.id.clone(), json!({})),
        _ => JsonRpcResponse::error(
            request.id.clone(),
            -32601,
            &format!("Method not found: {}", request.method),
        ),
    }
}

fn handle_initialize(request: &JsonRpcRequest) -> JsonRpcResponse {
    let result = InitializeResult {
        protocol_version: "2024-11-05".to_string(),
        capabilities: Capabilities {
            tools: Some(ToolsCapability {
                list_changed: false,
            }),
        },
        server_info: ServerInfo {
            name: "wsl-terminal".to_string(),
            version: VERSION.to_string(),
        },
    };

    JsonRpcResponse::success(request.id.clone(), serde_json::to_value(result).unwrap())
}

fn handle_initialized(_request: &JsonRpcRequest) -> JsonRpcResponse {
    eprintln!("[MCP] Client initialized");
    JsonRpcResponse::success(None, json!({}))
}

fn handle_list_tools(request: &JsonRpcRequest) -> JsonRpcResponse {
    let result = ListToolsResult { tools: get_tools() };
    JsonRpcResponse::success(request.id.clone(), serde_json::to_value(result).unwrap())
}

fn handle_call_tool(request: &JsonRpcRequest) -> JsonRpcResponse {
    let params: CallToolParams = match serde_json::from_value(request.params.clone()) {
        Ok(p) => p,
        Err(e) => {
            return JsonRpcResponse::error(
                request.id.clone(),
                -32602,
                &format!("Invalid params: {}", e),
            );
        }
    };

    let result = execute_tool(&params.name, params.arguments);
    JsonRpcResponse::success(request.id.clone(), serde_json::to_value(result).unwrap())
}

fn execute_tool(name: &str, args: serde_json::Value) -> ToolResult {
    eprintln!("[MCP] Executing tool: {} with args: {}", name, args);

    match name {
        "open_tab" => tool_open_tab(args),
        "close_tab" => tool_close_tab(args),
        "focus_tab" => tool_focus_tab(args),
        "get_tabs" => tool_get_tabs(),
        "run_command" => tool_run_command(args),
        "get_output" => tool_get_output(args),
        "set_theme" => tool_set_theme(args),
        "get_themes" => tool_get_themes(),
        "add_ssh" => tool_add_ssh(args),
        "remove_ssh" => tool_remove_ssh(args),
        "list_ssh" => tool_list_ssh(),
        "connect_ssh" => tool_connect_ssh(args),
        "get_state" => tool_get_state(),
        "show_window" => tool_show_window(),
        "hide_window" => tool_hide_window(),
        "split_pane" => tool_split_pane(args),
        _ => ToolResult::error(&format!("Unknown tool: {}", name)),
    }
}

fn send_to_app(action: &str, payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let ipc_path = get_ipc_path();

    #[cfg(windows)]
    {
        use std::os::windows::io::AsRawSocket;
        use std::net::TcpStream;

        match TcpStream::connect(&ipc_path) {
            Ok(mut stream) => {
                let message = json!({
                    "action": action,
                    "payload": payload
                });

                let msg_str = serde_json::to_string(&message).unwrap();
                if let Err(e) = stream.write_all(msg_str.as_bytes()) {
                    return Err(format!("Write failed: {}", e));
                }
                if let Err(e) = stream.write_all(b"\n") {
                    return Err(format!("Write newline failed: {}", e));
                }
                if let Err(e) = stream.flush() {
                    return Err(format!("Flush failed: {}", e));
                }

                let mut reader = io::BufReader::new(&stream);
                let mut response = String::new();
                if let Err(e) = reader.read_line(&mut response) {
                    return Err(format!("Read failed: {}", e));
                }

                serde_json::from_str(&response)
                    .map_err(|e| format!("Parse response failed: {}", e))
            }
            Err(e) => Err(format!("Connection failed: {}. Is WSL Terminal running?", e)),
        }
    }

    #[cfg(not(windows))]
    {
        use std::os::unix::net::UnixStream;

        match UnixStream::connect(&ipc_path) {
            Ok(mut stream) => {
                let message = json!({
                    "action": action,
                    "payload": payload
                });

                let msg_str = serde_json::to_string(&message).unwrap();
                if let Err(e) = stream.write_all(msg_str.as_bytes()) {
                    return Err(format!("Write failed: {}", e));
                }
                if let Err(e) = stream.write_all(b"\n") {
                    return Err(format!("Write newline failed: {}", e));
                }
                if let Err(e) = stream.flush() {
                    return Err(format!("Flush failed: {}", e));
                }

                let mut reader = io::BufReader::new(&stream);
                let mut response = String::new();
                if let Err(e) = reader.read_line(&mut response) {
                    return Err(format!("Read failed: {}", e));
                }

                serde_json::from_str(&response)
                    .map_err(|e| format!("Parse response failed: {}", e))
            }
            Err(e) => Err(format!("Connection failed: {}. Is WSL Terminal running?", e)),
        }
    }
}

fn get_ipc_path() -> String {
    #[cfg(windows)]
    {
        "127.0.0.1:45892".to_string()
    }
    #[cfg(not(windows))]
    {
        let runtime_dir = std::env::var("XDG_RUNTIME_DIR")
            .unwrap_or_else(|_| "/tmp".to_string());
        format!("{}/wsl-terminal.sock", runtime_dir)
    }
}

fn tool_open_tab(args: serde_json::Value) -> ToolResult {
    let params: OpenTabParams = match serde_json::from_value(args) {
        Ok(p) => p,
        Err(e) => return ToolResult::error(&format!("Invalid params: {}", e)),
    };

    match send_to_app("open_tab", serde_json::to_value(&params).unwrap()) {
        Ok(response) => {
            let tab_id = response.get("tab_id")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            ToolResult::text(&format!("Opened new {} tab with ID: {}", params.shell, tab_id))
        }
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_close_tab(args: serde_json::Value) -> ToolResult {
    let params: CloseTabParams = match serde_json::from_value(args) {
        Ok(p) => p,
        Err(e) => return ToolResult::error(&format!("Invalid params: {}", e)),
    };

    match send_to_app("close_tab", serde_json::to_value(&params).unwrap()) {
        Ok(_) => ToolResult::text(&format!("Closed tab: {}", params.tab_id)),
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_focus_tab(args: serde_json::Value) -> ToolResult {
    let params: FocusTabParams = match serde_json::from_value(args) {
        Ok(p) => p,
        Err(e) => return ToolResult::error(&format!("Invalid params: {}", e)),
    };

    match send_to_app("focus_tab", serde_json::to_value(&params).unwrap()) {
        Ok(_) => ToolResult::text(&format!("Focused tab: {}", params.tab_id)),
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_get_tabs() -> ToolResult {
    match send_to_app("get_tabs", json!({})) {
        Ok(response) => {
            let formatted = serde_json::to_string_pretty(&response).unwrap_or_default();
            ToolResult::text(&formatted)
        }
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_run_command(args: serde_json::Value) -> ToolResult {
    let params: RunCommandParams = match serde_json::from_value(args) {
        Ok(p) => p,
        Err(e) => return ToolResult::error(&format!("Invalid params: {}", e)),
    };

    match send_to_app("run_command", serde_json::to_value(&params).unwrap()) {
        Ok(response) => {
            if params.wait_for_output {
                let output = response.get("output")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                ToolResult::text(output)
            } else {
                ToolResult::text(&format!("Command sent to tab: {}", params.tab_id))
            }
        }
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_get_output(args: serde_json::Value) -> ToolResult {
    let params: GetOutputParams = match serde_json::from_value(args) {
        Ok(p) => p,
        Err(e) => return ToolResult::error(&format!("Invalid params: {}", e)),
    };

    match send_to_app("get_output", serde_json::to_value(&params).unwrap()) {
        Ok(response) => {
            let output = response.get("output")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            ToolResult::text(output)
        }
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_set_theme(args: serde_json::Value) -> ToolResult {
    let params: SetThemeParams = match serde_json::from_value(args) {
        Ok(p) => p,
        Err(e) => return ToolResult::error(&format!("Invalid params: {}", e)),
    };

    match send_to_app("set_theme", serde_json::to_value(&params).unwrap()) {
        Ok(_) => ToolResult::text(&format!("Theme changed to: {}", params.theme)),
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_get_themes() -> ToolResult {
    let themes = vec![
        "catppuccin-mocha", "dracula", "nord", "one-dark", "gruvbox-dark",
        "tokyo-night", "solarized-dark", "vs-code-dark", "monokai", "github-dark",
        "cyberpunk", "matrix", "synthwave", "vaporwave", "neon-tokyo",
        "hacker", "inferno", "toxic", "ultraviolet", "bloodmoon", "abyss",
        "rose-pine", "everforest", "kanagawa", "palenight", "material-ocean",
        "horizon", "andromeda", "moonlight", "night-owl", "poimandres", "vitesse-dark"
    ];

    ToolResult::text(&themes.join("\n"))
}

fn tool_add_ssh(args: serde_json::Value) -> ToolResult {
    let params: AddSshParams = match serde_json::from_value(args) {
        Ok(p) => p,
        Err(e) => return ToolResult::error(&format!("Invalid params: {}", e)),
    };

    match send_to_app("add_ssh", serde_json::to_value(&params).unwrap()) {
        Ok(response) => {
            let id = response.get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            ToolResult::text(&format!("Added SSH connection '{}' with ID: {}", params.name, id))
        }
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_remove_ssh(args: serde_json::Value) -> ToolResult {
    let params: RemoveSshParams = match serde_json::from_value(args) {
        Ok(p) => p,
        Err(e) => return ToolResult::error(&format!("Invalid params: {}", e)),
    };

    match send_to_app("remove_ssh", serde_json::to_value(&params).unwrap()) {
        Ok(_) => ToolResult::text(&format!("Removed SSH connection: {}", params.id)),
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_list_ssh() -> ToolResult {
    match send_to_app("list_ssh", json!({})) {
        Ok(response) => {
            let formatted = serde_json::to_string_pretty(&response).unwrap_or_default();
            ToolResult::text(&formatted)
        }
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_connect_ssh(args: serde_json::Value) -> ToolResult {
    let params: ConnectSshParams = match serde_json::from_value(args) {
        Ok(p) => p,
        Err(e) => return ToolResult::error(&format!("Invalid params: {}", e)),
    };

    match send_to_app("connect_ssh", serde_json::to_value(&params).unwrap()) {
        Ok(response) => {
            let tab_id = response.get("tab_id")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            ToolResult::text(&format!("SSH connection opened in tab: {}", tab_id))
        }
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_get_state() -> ToolResult {
    match send_to_app("get_state", json!({})) {
        Ok(response) => {
            let formatted = serde_json::to_string_pretty(&response).unwrap_or_default();
            ToolResult::text(&formatted)
        }
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_show_window() -> ToolResult {
    match send_to_app("show_window", json!({})) {
        Ok(_) => ToolResult::text("Window shown"),
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_hide_window() -> ToolResult {
    match send_to_app("hide_window", json!({})) {
        Ok(_) => ToolResult::text("Window hidden"),
        Err(e) => ToolResult::error(&e),
    }
}

fn tool_split_pane(args: serde_json::Value) -> ToolResult {
    match send_to_app("split_pane", args) {
        Ok(response) => {
            let pane_id = response.get("pane_id")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            ToolResult::text(&format!("Pane split, new pane ID: {}", pane_id))
        }
        Err(e) => ToolResult::error(&e),
    }
}
