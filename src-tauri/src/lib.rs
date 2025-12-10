pub mod mcp;

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{BufRead, Read, Write};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tokio::sync::Mutex;
use serde_json::json;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// Windows flag to hide console window
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Create a Command that won't show a console window on Windows
#[allow(unused_mut)]
fn silent_command(program: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

struct PtyProcess {
    writer: Box<dyn Write + Send>,
    _pair: portable_pty::PtyPair,
}

struct AppState {
    processes: Arc<Mutex<HashMap<String, PtyProcess>>>,
}

#[tauri::command]
async fn get_wsl_distros() -> Result<Vec<String>, String> {
    let output = silent_command("wsl.exe")
        .args(["--list", "--quiet"])
        .output()
        .map_err(|e| e.to_string())?;

    // WSL outputs UTF-16LE, need to decode properly
    let stdout = if output.stdout.len() >= 2 && output.stdout[0] == 0xFF && output.stdout[1] == 0xFE {
        // Has BOM, skip it
        String::from_utf16_lossy(
            &output.stdout[2..]
                .chunks(2)
                .filter_map(|c| {
                    if c.len() == 2 {
                        Some(u16::from_le_bytes([c[0], c[1]]))
                    } else {
                        None
                    }
                })
                .collect::<Vec<u16>>()
        )
    } else {
        // Try UTF-16LE without BOM
        String::from_utf16_lossy(
            &output.stdout
                .chunks(2)
                .filter_map(|c| {
                    if c.len() == 2 {
                        Some(u16::from_le_bytes([c[0], c[1]]))
                    } else {
                        None
                    }
                })
                .collect::<Vec<u16>>()
        )
    };

    let distros: Vec<String> = stdout
        .lines()
        .map(|s| s.trim().replace("\u{0}", "").to_string())
        .filter(|s| !s.is_empty() && !s.contains("docker-desktop"))
        .collect();

    Ok(distros)
}

#[tauri::command]
async fn spawn_shell(
    tab_id: String,
    shell: String,
    distro: Option<String>,
    state: tauri::State<'_, AppState>,
    window: tauri::Window,
) -> Result<(), String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Get Windows user profile for proper CWD
    let userprofile = std::env::var("USERPROFILE")
        .unwrap_or_else(|_| "C:\\Users\\Public".to_string());

    let cmd = match shell.as_str() {
        "wsl" => {
            let mut c = CommandBuilder::new("wsl.exe");
            if let Some(d) = &distro {
                c.args(["-d", d]);
            }
            // Start WSL in home directory
            c.args(["--cd", "~"]);
            c
        }
        "powershell" => {
            let mut c = CommandBuilder::new("powershell.exe");
            c.args(["-NoLogo", "-NoExit"]);
            c.cwd(&userprofile);
            c
        }
        "cmd" => {
            let mut c = CommandBuilder::new("cmd.exe");
            c.cwd(&userprofile);
            c
        }
        _ => {
            let mut c = CommandBuilder::new("wsl.exe");
            if let Some(d) = &distro {
                c.args(["-d", d]);
            }
            c.args(["--cd", "~"]);
            c
        }
    };

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get writer: {}", e))?;

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get reader: {}", e))?;

    // Store writer
    {
        let mut processes = state.processes.lock().await;
        processes.insert(
            tab_id.clone(),
            PtyProcess {
                writer,
                _pair: pair,
            },
        );
    }

    // Read output in background thread
    let tab_id_clone = tab_id.clone();
    let window_clone = window.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = window_clone.emit(&format!("shell-output-{}", tab_id_clone), &data);
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn write_to_shell(
    tab_id: String,
    data: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut processes = state.processes.lock().await;
    if let Some(process) = processes.get_mut(&tab_id) {
        process
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Write failed: {}", e))?;
        process
            .writer
            .flush()
            .map_err(|e| format!("Flush failed: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn resize_pty(
    tab_id: String,
    cols: u16,
    rows: u16,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let processes = state.processes.lock().await;
    if let Some(process) = processes.get(&tab_id) {
        process
            ._pair
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Resize failed: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn kill_shell(tab_id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut processes = state.processes.lock().await;
    processes.remove(&tab_id);
    Ok(())
}

#[derive(serde::Serialize)]
struct GitInfo {
    branch: Option<String>,
    is_dirty: bool,
    ahead: u32,
    behind: u32,
}

#[derive(serde::Serialize)]
struct ProjectInfo {
    name: String,
    path: String,
    category: String,
    has_git: bool,
}

#[tauri::command]
async fn get_git_info(path: Option<String>) -> Result<GitInfo, String> {
    let cwd = path.unwrap_or_else(|| {
        std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
    });

    // Get current branch
    let branch_output = silent_command("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&cwd)
        .output();

    let branch = match branch_output {
        Ok(output) if output.status.success() => {
            Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
        }
        _ => None,
    };

    if branch.is_none() {
        return Ok(GitInfo {
            branch: None,
            is_dirty: false,
            ahead: 0,
            behind: 0,
        });
    }

    // Check if dirty (uncommitted changes)
    let status_output = silent_command("git")
        .args(["status", "--porcelain"])
        .current_dir(&cwd)
        .output();

    let is_dirty = match status_output {
        Ok(output) => !output.stdout.is_empty(),
        _ => false,
    };

    // Get ahead/behind count
    let ahead_behind = silent_command("git")
        .args(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])
        .current_dir(&cwd)
        .output();

    let (ahead, behind) = match ahead_behind {
        Ok(output) if output.status.success() => {
            let text = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = text.trim().split('\t').collect();
            if parts.len() == 2 {
                (
                    parts[0].parse().unwrap_or(0),
                    parts[1].parse().unwrap_or(0),
                )
            } else {
                (0, 0)
            }
        }
        _ => (0, 0),
    };

    Ok(GitInfo {
        branch,
        is_dirty,
        ahead,
        behind,
    })
}

#[derive(serde::Serialize)]
struct DockerStatus {
    running: bool,
    containers: Vec<DockerContainer>,
}

#[derive(serde::Serialize)]
struct DockerContainer {
    name: String,
    status: String,
    running: bool,
}

#[tauri::command]
async fn get_docker_status() -> Result<DockerStatus, String> {
    let output = silent_command("docker")
        .args(["ps", "-a", "--format", "{{.Names}}|{{.Status}}|{{.State}}"])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let containers: Vec<DockerContainer> = stdout
                .lines()
                .filter(|l| !l.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.split('|').collect();
                    DockerContainer {
                        name: parts.get(0).unwrap_or(&"").to_string(),
                        status: parts.get(1).unwrap_or(&"").to_string(),
                        running: parts.get(2).map(|s| *s == "running").unwrap_or(false),
                    }
                })
                .collect();

            let running = containers.iter().any(|c| c.running);

            Ok(DockerStatus { running, containers })
        }
        _ => Ok(DockerStatus {
            running: false,
            containers: Vec::new(),
        }),
    }
}

#[tauri::command]
async fn list_projects(root_path: String, categories: Vec<String>) -> Result<Vec<ProjectInfo>, String> {
    // Expand ~ to home directory
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home".to_string());
    let projects_base = if root_path.starts_with("~/") {
        root_path.replacen("~", &home, 1)
    } else if root_path == "~" {
        home.clone()
    } else {
        root_path
    };

    let mut projects = Vec::new();

    for category in &categories {
        let category_path = format!("{}/{}", projects_base, category);
        if let Ok(entries) = std::fs::read_dir(&category_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();

                    // Skip hidden directories
                    if name.starts_with('.') {
                        continue;
                    }

                    // Check if it's a git repo
                    let git_path = path.join(".git");
                    let has_git = git_path.exists();

                    // Check if it might be a subcategory (web, mobile, etc.)
                    let mut is_subcategory = false;
                    if let Ok(subentries) = std::fs::read_dir(&path) {
                        let subdirs: Vec<_> = subentries
                            .flatten()
                            .filter(|e| e.path().is_dir() && !e.path().join(".git").exists())
                            .collect();
                        // If has subdirs and none have .git, might be subcategory
                        if subdirs.len() > 0 && !has_git {
                            // Scan subdirectory for projects
                            for subentry in subdirs {
                                let subpath = subentry.path();
                                let subname = subpath.file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("")
                                    .to_string();

                                if subname.starts_with('.') {
                                    continue;
                                }

                                let sub_has_git = subpath.join(".git").exists();

                                projects.push(ProjectInfo {
                                    name: subname,
                                    path: subpath.to_string_lossy().to_string(),
                                    category: format!("{}/{}", category, name),
                                    has_git: sub_has_git,
                                });
                            }
                            is_subcategory = true;
                        }
                    }

                    if !is_subcategory {
                        projects.push(ProjectInfo {
                            name,
                            path: path.to_string_lossy().to_string(),
                            category: category.to_string(),
                            has_git,
                        });
                    }
                }
            }
        }
    }

    // Sort by category then name
    projects.sort_by(|a, b| {
        a.category.cmp(&b.category).then(a.name.cmp(&b.name))
    });

    Ok(projects)
}

#[tauri::command]
async fn toggle_quake_mode(window: tauri::Window) -> Result<(), String> {
    if window.is_visible().map_err(|e| e.to_string())? {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn set_quake_position(window: tauri::Window, height_percent: f64) -> Result<(), String> {
    use tauri::PhysicalPosition;

    // Get primary monitor
    if let Some(monitor) = window.primary_monitor().map_err(|e| e.to_string())? {
        let monitor_size = monitor.size();
        let new_height = (monitor_size.height as f64 * height_percent / 100.0) as u32;

        // Set window to top of screen, full width
        window.set_position(PhysicalPosition::new(0, 0)).map_err(|e| e.to_string())?;
        window.set_size(tauri::PhysicalSize::new(monitor_size.width, new_height)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// IPC response channel for MCP communication
type IpcResponseTx = Arc<Mutex<Option<tokio::sync::oneshot::Sender<serde_json::Value>>>>;

/// State for IPC communication
struct IpcState {
    response_tx: IpcResponseTx,
}

/// Handle IPC response from frontend
#[tauri::command]
async fn ipc_response(response: serde_json::Value, state: tauri::State<'_, IpcState>) -> Result<(), String> {
    let mut tx_lock = state.response_tx.lock().await;
    if let Some(tx) = tx_lock.take() {
        let _ = tx.send(response);
    }
    Ok(())
}

/// Start IPC server for MCP communication
fn start_ipc_server(app_handle: tauri::AppHandle, ipc_state: Arc<IpcState>) {
    std::thread::spawn(move || {
        #[cfg(windows)]
        {
            use std::net::TcpListener;

            let listener = match TcpListener::bind("127.0.0.1:45892") {
                Ok(l) => l,
                Err(e) => {
                    log::error!("Failed to bind IPC server: {}", e);
                    return;
                }
            };

            log::info!("IPC server listening on 127.0.0.1:45892");

            for stream in listener.incoming() {
                match stream {
                    Ok(mut stream) => {
                        let app_handle = app_handle.clone();
                        let ipc_state = ipc_state.clone();

                        std::thread::spawn(move || {
                            let mut reader = std::io::BufReader::new(stream.try_clone().unwrap());
                            let mut line = String::new();

                            while reader.read_line(&mut line).is_ok() && !line.is_empty() {
                                if let Ok(request) = serde_json::from_str::<serde_json::Value>(&line) {
                                    let action = request.get("action")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("");
                                    let payload = request.get("payload").cloned().unwrap_or(json!({}));

                                    // Create response channel
                                    let (tx, rx) = tokio::sync::oneshot::channel();

                                    // Store sender in state
                                    {
                                        let rt = tokio::runtime::Runtime::new().unwrap();
                                        rt.block_on(async {
                                            let mut tx_lock = ipc_state.response_tx.lock().await;
                                            *tx_lock = Some(tx);
                                        });
                                    }

                                    // Emit event to frontend
                                    let _ = app_handle.emit("mcp-action", json!({
                                        "action": action,
                                        "payload": payload
                                    }));

                                    // Wait for response with timeout
                                    let rt = tokio::runtime::Runtime::new().unwrap();
                                    let response = rt.block_on(async {
                                        tokio::time::timeout(
                                            std::time::Duration::from_secs(30),
                                            rx
                                        ).await
                                    });

                                    let response_value = match response {
                                        Ok(Ok(v)) => v,
                                        _ => json!({"error": "Timeout or no response"}),
                                    };

                                    // Send response back
                                    let response_str = serde_json::to_string(&response_value).unwrap();
                                    let _ = stream.write_all(response_str.as_bytes());
                                    let _ = stream.write_all(b"\n");
                                    let _ = stream.flush();
                                }
                                line.clear();
                            }
                        });
                    }
                    Err(e) => log::error!("IPC connection error: {}", e),
                }
            }
        }

        #[cfg(not(windows))]
        {
            use std::os::unix::net::UnixListener;

            let socket_path = format!(
                "{}/wsl-terminal.sock",
                std::env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| "/tmp".to_string())
            );

            // Remove existing socket
            let _ = std::fs::remove_file(&socket_path);

            let listener = match UnixListener::bind(&socket_path) {
                Ok(l) => l,
                Err(e) => {
                    log::error!("Failed to bind IPC server: {}", e);
                    return;
                }
            };

            log::info!("IPC server listening on {}", socket_path);

            for stream in listener.incoming() {
                match stream {
                    Ok(mut stream) => {
                        let app_handle = app_handle.clone();
                        let ipc_state = ipc_state.clone();

                        std::thread::spawn(move || {
                            let mut reader = std::io::BufReader::new(stream.try_clone().unwrap());
                            let mut line = String::new();

                            while reader.read_line(&mut line).is_ok() && !line.is_empty() {
                                if let Ok(request) = serde_json::from_str::<serde_json::Value>(&line) {
                                    let action = request.get("action")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("");
                                    let payload = request.get("payload").cloned().unwrap_or(json!({}));

                                    // Create response channel
                                    let (tx, rx) = tokio::sync::oneshot::channel();

                                    // Store sender in state
                                    {
                                        let rt = tokio::runtime::Runtime::new().unwrap();
                                        rt.block_on(async {
                                            let mut tx_lock = ipc_state.response_tx.lock().await;
                                            *tx_lock = Some(tx);
                                        });
                                    }

                                    // Emit event to frontend
                                    let _ = app_handle.emit("mcp-action", json!({
                                        "action": action,
                                        "payload": payload
                                    }));

                                    // Wait for response with timeout
                                    let rt = tokio::runtime::Runtime::new().unwrap();
                                    let response = rt.block_on(async {
                                        tokio::time::timeout(
                                            std::time::Duration::from_secs(30),
                                            rx
                                        ).await
                                    });

                                    let response_value = match response {
                                        Ok(Ok(v)) => v,
                                        _ => json!({"error": "Timeout or no response"}),
                                    };

                                    // Send response back
                                    let response_str = serde_json::to_string(&response_value).unwrap();
                                    let _ = stream.write_all(response_str.as_bytes());
                                    let _ = stream.write_all(b"\n");
                                    let _ = stream.flush();
                                }
                                line.clear();
                            }
                        });
                    }
                    Err(e) => log::error!("IPC connection error: {}", e),
                }
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ipc_state = Arc::new(IpcState {
        response_tx: Arc::new(Mutex::new(None)),
    });

    let ipc_state_clone = ipc_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState {
            processes: Arc::new(Mutex::new(HashMap::new())),
        })
        .manage(IpcState {
            response_tx: ipc_state.response_tx.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            spawn_shell,
            write_to_shell,
            resize_pty,
            kill_shell,
            get_wsl_distros,
            get_git_info,
            get_docker_status,
            list_projects,
            toggle_quake_mode,
            set_quake_position,
            ipc_response
        ])
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Start IPC server for MCP communication
            start_ipc_server(app.handle().clone(), ipc_state_clone.clone());

            if let Some(window) = app.get_webview_window("main") {
                log::info!("WSL Terminal started successfully");
                log::info!("MCP IPC server started");
                let _ = window.show();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
