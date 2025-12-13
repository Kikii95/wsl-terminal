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

/// Escape a string for use in single-quoted bash strings
fn bash_escape(s: &str) -> String {
    // In single quotes, only single quotes need escaping: ' -> '\''
    s.replace("'", "'\\''")
}

/// Execute a command through WSL (for Linux paths like /home/user/...)
/// Returns (stdout, stderr, success)
fn wsl_git_command(args: &[&str], wsl_path: &str) -> Result<std::process::Output, std::io::Error> {
    // Quote each argument to prevent bash interpretation of special chars like %
    let quoted_args: Vec<String> = args.iter()
        .map(|arg| format!("'{}'", bash_escape(arg)))
        .collect();

    // Build the git command to run inside WSL
    let git_cmd = format!("cd '{}' && git {}", bash_escape(wsl_path), quoted_args.join(" "));

    silent_command("wsl.exe")
        .args(["-e", "bash", "-c", &git_cmd])
        .output()
}

/// Check if a path is a WSL Linux path (starts with /)
fn is_wsl_path(path: &str) -> bool {
    path.starts_with('/') && !path.starts_with("//")
}

struct PtyProcess {
    writer: Box<dyn Write + Send>,
    _pair: portable_pty::PtyPair,
}

// Maximum buffer size per terminal (100KB)
const MAX_BUFFER_SIZE: usize = 100 * 1024;

struct AppState {
    processes: Arc<Mutex<HashMap<String, PtyProcess>>>,
    // Store output buffers per tab for detach/reattach
    output_buffers: Arc<std::sync::Mutex<HashMap<String, Vec<u8>>>>,
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
    initial_cwd: Option<String>,
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
            // Use initial_cwd if provided, otherwise home directory
            if let Some(ref cwd) = initial_cwd {
                c.args(["--cd", cwd]);
            } else {
                c.args(["--cd", "~"]);
            }
            c
        }
        "powershell" => {
            let mut c = CommandBuilder::new("powershell.exe");
            c.args(["-NoLogo", "-NoExit"]);
            if let Some(ref cwd) = initial_cwd {
                c.cwd(cwd);
            } else {
                c.cwd(&userprofile);
            }
            c
        }
        "cmd" => {
            let mut c = CommandBuilder::new("cmd.exe");
            if let Some(ref cwd) = initial_cwd {
                c.cwd(cwd);
            } else {
                c.cwd(&userprofile);
            }
            c
        }
        _ => {
            let mut c = CommandBuilder::new("wsl.exe");
            if let Some(d) = &distro {
                c.args(["-d", d]);
            }
            if let Some(ref cwd) = initial_cwd {
                c.args(["--cd", cwd]);
            } else {
                c.args(["--cd", "~"]);
            }
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

    // Initialize buffer for this tab
    {
        let mut buffers = state.output_buffers.lock().unwrap();
        buffers.insert(tab_id.clone(), Vec::with_capacity(MAX_BUFFER_SIZE));
    }

    // Read output in background thread
    let tab_id_clone = tab_id.clone();
    // Use app_handle instead of window to emit to all windows (including detached ones)
    let app_handle = window.app_handle().clone();
    let buffers_clone = state.output_buffers.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    // Emit to all windows so detached windows also receive the output
                    let _ = app_handle.emit(&format!("shell-output-{}", tab_id_clone), &data);

                    // Also store in buffer for detach/reattach
                    if let Ok(mut buffers) = buffers_clone.lock() {
                        if let Some(buffer) = buffers.get_mut(&tab_id_clone) {
                            buffer.extend_from_slice(&buf[..n]);
                            // Trim to max size (keep most recent data)
                            if buffer.len() > MAX_BUFFER_SIZE {
                                let excess = buffer.len() - MAX_BUFFER_SIZE;
                                buffer.drain(0..excess);
                            }
                        }
                    }
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
    // Also clean up buffer
    if let Ok(mut buffers) = state.output_buffers.lock() {
        buffers.remove(&tab_id);
    }
    Ok(())
}

/// Get the output buffer for a shell (for detach/reattach)
#[tauri::command]
async fn get_shell_buffer(tab_id: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let buffers = state.output_buffers.lock()
        .map_err(|e| format!("Failed to lock buffers: {}", e))?;

    if let Some(buffer) = buffers.get(&tab_id) {
        Ok(String::from_utf8_lossy(buffer).to_string())
    } else {
        Ok(String::new())
    }
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

// Service management for Phase 2
#[derive(serde::Serialize)]
struct ProcessStats {
    cpu: f64,
    memory: u64,
}

#[tauri::command]
async fn start_service(command: String, cwd: Option<String>) -> Result<u32, String> {
    use std::process::{Command, Stdio};

    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }

    let program = parts[0];
    let args = &parts[1..];

    let mut cmd = Command::new(program);
    cmd.args(args)
       .stdin(Stdio::null())
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if let Some(ref dir) = cwd {
        // Expand ~ to home
        let expanded = if dir.starts_with("~/") || dir == "~" {
            let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).unwrap_or_default();
            dir.replacen("~", &home, 1)
        } else {
            dir.clone()
        };
        cmd.current_dir(expanded);
    }

    let child = cmd.spawn().map_err(|e| format!("Failed to start service: {}", e))?;
    let pid = child.id();

    Ok(pid)
}

#[tauri::command]
async fn stop_service(pid: u32) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F", "/T"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;
    }

    #[cfg(not(windows))]
    {
        use std::process::Command;
        // Try SIGTERM first, then SIGKILL
        let _ = Command::new("kill")
            .args(["-15", &pid.to_string()])
            .output();

        // Wait a bit then force kill if still running
        std::thread::sleep(std::time::Duration::from_millis(500));

        let _ = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }

    Ok(())
}

#[tauri::command]
async fn get_process_stats(pid: u32) -> Result<ProcessStats, String> {
    #[cfg(windows)]
    {
        use std::process::Command;

        // Get CPU and memory using wmic
        let output = Command::new("wmic")
            .args(["process", "where", &format!("ProcessId={}", pid), "get", "WorkingSetSize,PercentProcessorTime", "/format:csv"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to get stats: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = stdout.lines().filter(|l| !l.is_empty()).collect();

        if lines.len() >= 2 {
            let parts: Vec<&str> = lines[1].split(',').collect();
            if parts.len() >= 3 {
                let cpu = parts[1].trim().parse::<f64>().unwrap_or(0.0);
                let memory = parts[2].trim().parse::<u64>().unwrap_or(0);
                return Ok(ProcessStats { cpu, memory });
            }
        }

        Ok(ProcessStats { cpu: 0.0, memory: 0 })
    }

    #[cfg(not(windows))]
    {
        use std::process::Command;

        // Get stats from /proc on Linux
        let stat_output = Command::new("ps")
            .args(["-p", &pid.to_string(), "-o", "%cpu,rss", "--no-headers"])
            .output()
            .map_err(|e| format!("Failed to get stats: {}", e))?;

        let stdout = String::from_utf8_lossy(&stat_output.stdout);
        let parts: Vec<&str> = stdout.trim().split_whitespace().collect();

        if parts.len() >= 2 {
            let cpu = parts[0].parse::<f64>().unwrap_or(0.0);
            let memory = parts[1].parse::<u64>().unwrap_or(0) * 1024; // Convert KB to bytes
            Ok(ProcessStats { cpu, memory })
        } else {
            Err("Process not found".to_string())
        }
    }
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

// ============================================================================
// SSH Config Parsing & Secure Credentials (Phase 3)
// ============================================================================

#[derive(serde::Serialize)]
struct SSHConfigHost {
    name: String,
    host: String,
    user: Option<String>,
    port: u16,
    identity_file: Option<String>,
}

/// Parse ~/.ssh/config and return all hosts
#[tauri::command]
async fn parse_ssh_config() -> Result<Vec<SSHConfigHost>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;

    // Try multiple paths (Windows native, WSL home, etc.)
    let config_paths = vec![
        home.join(".ssh").join("config"),
        // Also try WSL path if on Windows
        #[cfg(windows)]
        std::path::PathBuf::from(format!("\\\\wsl$\\Ubuntu\\home\\{}/.ssh/config",
            std::env::var("USERNAME").unwrap_or_default())),
    ];

    for config_path in config_paths {
        if config_path.exists() {
            return parse_ssh_config_file(&config_path);
        }
    }

    // If no file found, return empty list (not an error)
    Ok(vec![])
}

fn parse_ssh_config_file(path: &std::path::Path) -> Result<Vec<SSHConfigHost>, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read SSH config: {}", e))?;

    let mut hosts: Vec<SSHConfigHost> = Vec::new();
    let mut current_host: Option<SSHConfigHost> = None;

    for line in content.lines() {
        let line = line.trim();

        // Skip comments and empty lines
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // Split on first whitespace
        let parts: Vec<&str> = line.splitn(2, |c: char| c.is_whitespace()).collect();
        if parts.len() != 2 {
            continue;
        }

        let key = parts[0].to_lowercase();
        let value = parts[1].trim();

        match key.as_str() {
            "host" => {
                // Save previous host if exists
                if let Some(host) = current_host.take() {
                    // Only add if it's not a wildcard
                    if !host.name.contains('*') && !host.name.contains('?') {
                        hosts.push(host);
                    }
                }

                // Start new host
                current_host = Some(SSHConfigHost {
                    name: value.to_string(),
                    host: value.to_string(), // Default to same as name
                    user: None,
                    port: 22,
                    identity_file: None,
                });
            }
            "hostname" => {
                if let Some(ref mut host) = current_host {
                    host.host = value.to_string();
                }
            }
            "user" => {
                if let Some(ref mut host) = current_host {
                    host.user = Some(value.to_string());
                }
            }
            "port" => {
                if let Some(ref mut host) = current_host {
                    host.port = value.parse().unwrap_or(22);
                }
            }
            "identityfile" => {
                if let Some(ref mut host) = current_host {
                    // Expand ~ in path
                    let expanded = if value.starts_with("~/") {
                        if let Some(home) = dirs::home_dir() {
                            value.replacen("~", home.to_string_lossy().as_ref(), 1)
                        } else {
                            value.to_string()
                        }
                    } else {
                        value.to_string()
                    };
                    host.identity_file = Some(expanded);
                }
            }
            _ => {}
        }
    }

    // Don't forget the last host
    if let Some(host) = current_host {
        if !host.name.contains('*') && !host.name.contains('?') {
            hosts.push(host);
        }
    }

    Ok(hosts)
}

const KEYRING_SERVICE: &str = "wsl-terminal-ssh";

/// Store a password securely in the system keychain
#[tauri::command]
async fn store_ssh_credential(connection_id: String, password: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &connection_id)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry.set_password(&password)
        .map_err(|e| format!("Failed to store password: {}", e))?;

    Ok(())
}

/// Retrieve a password from the system keychain
#[tauri::command]
async fn get_ssh_credential(connection_id: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &connection_id)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to retrieve password: {}", e)),
    }
}

/// Delete a password from the system keychain
#[tauri::command]
async fn delete_ssh_credential(connection_id: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &connection_id)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already deleted, that's fine
        Err(e) => Err(format!("Failed to delete password: {}", e)),
    }
}

/// Check if a credential exists in the keychain
#[tauri::command]
async fn has_ssh_credential(connection_id: String) -> Result<bool, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &connection_id)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(format!("Failed to check password: {}", e)),
    }
}

// ============================================================================
// Multi-Window Support (Phase 4)
// ============================================================================

/// Create a new window for a detached tab
#[tauri::command]
async fn create_detached_window(
    app_handle: tauri::AppHandle,
    tab_id: String,
    title: String,
    shell: String,
    distro: Option<String>,
) -> Result<String, String> {
    use tauri::WebviewWindowBuilder;
    use tauri::WebviewUrl;

    let window_id = format!("detached-{}", &tab_id[..8]);

    let window = WebviewWindowBuilder::new(
        &app_handle,
        &window_id,
        WebviewUrl::App("index.html".into())
    )
    .title(&title)
    .inner_size(800.0, 500.0)
    .min_inner_size(400.0, 300.0)
    .decorations(false)
    .transparent(true)
    .shadow(true)
    .resizable(true)
    .center()
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;

    // Escape strings for JavaScript
    let escaped_title = title.replace('\\', "\\\\").replace('\'', "\\'");
    let distro_js = match &distro {
        Some(d) => format!("'{}'", d.replace('\\', "\\\\").replace('\'', "\\'")),
        None => "null".to_string(),
    };

    // Pass the tab info to the new window
    let _ = window.eval(&format!(
        "window.__DETACHED_TAB_ID__ = '{}'; window.__WINDOW_ID__ = '{}'; window.__TAB_TITLE__ = '{}'; window.__TAB_SHELL__ = '{}'; window.__TAB_DISTRO__ = {};",
        tab_id, window_id, escaped_title, shell, distro_js
    ));

    Ok(window_id)
}

/// Close a detached window
#[tauri::command]
async fn close_detached_window(
    app_handle: tauri::AppHandle,
    window_id: String,
) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(&window_id) {
        window.close().map_err(|e| format!("Failed to close window: {}", e))?;
    }
    Ok(())
}

/// Set always on top for a window
#[tauri::command]
async fn set_always_on_top(
    window: tauri::Window,
    always_on_top: bool,
) -> Result<(), String> {
    window.set_always_on_top(always_on_top)
        .map_err(|e| format!("Failed to set always on top: {}", e))?;
    Ok(())
}

/// Get list of all windows
#[tauri::command]
async fn get_all_windows(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let windows: Vec<String> = app_handle.webview_windows()
        .keys()
        .cloned()
        .collect();
    Ok(windows)
}

/// Attach a detached window back to main (close window, tab goes back to main)
#[tauri::command]
async fn attach_window_to_main(
    app_handle: tauri::AppHandle,
    window_id: String,
    tab_id: String,
) -> Result<(), String> {
    // Emit event to main window to add the tab back
    if let Some(main_window) = app_handle.get_webview_window("main") {
        main_window.emit("attach-tab", serde_json::json!({
            "tabId": tab_id,
            "fromWindow": window_id
        })).map_err(|e| format!("Failed to emit attach event: {}", e))?;
    }

    // Close the detached window
    if let Some(window) = app_handle.get_webview_window(&window_id) {
        window.close().map_err(|e| format!("Failed to close window: {}", e))?;
    }

    Ok(())
}

// ============================================================================
// Git Integration (Phase 5)
// ============================================================================

#[derive(serde::Serialize)]
struct GitStatusFile {
    path: String,
    status: String,      // "M", "A", "D", "R", "C", "U", "?"
    staged: bool,
}

#[derive(serde::Serialize)]
struct GitStatusResult {
    branch: String,
    upstream: Option<String>,
    ahead: u32,
    behind: u32,
    files: Vec<GitStatusFile>,
}

#[derive(serde::Serialize)]
struct GitBranch {
    name: String,
    current: bool,
    upstream: Option<String>,
}

#[derive(serde::Serialize)]
struct GitCommit {
    hash: String,
    short_hash: String,
    message: String,
    author: String,
    date: String,
}

/// Get comprehensive git status
#[tauri::command]
async fn git_status(cwd: String) -> Result<GitStatusResult, String> {
    let use_wsl = is_wsl_path(&cwd);

    // Get branch info
    let branch_output = if use_wsl {
        wsl_git_command(&["rev-parse", "--abbrev-ref", "HEAD"], &cwd)
            .map_err(|e| format!("Git not available: {}", e))?
    } else {
        silent_command("git")
            .args(["rev-parse", "--abbrev-ref", "HEAD"])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Git not available: {}", e))?
    };

    if !branch_output.status.success() {
        return Err("Not a git repository".to_string());
    }

    let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();

    // Get upstream
    let upstream_output = if use_wsl {
        wsl_git_command(&["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], &cwd).ok()
    } else {
        silent_command("git")
            .args(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"])
            .current_dir(&cwd)
            .output()
            .ok()
    };

    let upstream = upstream_output
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

    // Get ahead/behind
    let (ahead, behind) = if upstream.is_some() {
        let ab_output = if use_wsl {
            wsl_git_command(&["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], &cwd).ok()
        } else {
            silent_command("git")
                .args(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])
                .current_dir(&cwd)
                .output()
                .ok()
        };

        match ab_output {
            Some(o) if o.status.success() => {
                let text = String::from_utf8_lossy(&o.stdout);
                let parts: Vec<&str> = text.trim().split('\t').collect();
                if parts.len() == 2 {
                    (parts[0].parse().unwrap_or(0), parts[1].parse().unwrap_or(0))
                } else {
                    (0, 0)
                }
            }
            _ => (0, 0)
        }
    } else {
        (0, 0)
    };

    // Get file status (porcelain v1 for better parsing)
    let status_output = if use_wsl {
        wsl_git_command(&["status", "--porcelain=v1"], &cwd)
            .map_err(|e| format!("Failed to get status: {}", e))?
    } else {
        silent_command("git")
            .args(["status", "--porcelain=v1"])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to get status: {}", e))?
    };

    let stdout = String::from_utf8_lossy(&status_output.stdout);
    let mut files = Vec::new();

    for line in stdout.lines() {
        if line.len() < 4 {
            continue;
        }

        let index_status = line.chars().nth(0).unwrap_or(' ');
        let worktree_status = line.chars().nth(1).unwrap_or(' ');
        let path = line[3..].to_string();

        // Staged changes (index has modification)
        if index_status != ' ' && index_status != '?' {
            files.push(GitStatusFile {
                path: path.clone(),
                status: index_status.to_string(),
                staged: true,
            });
        }

        // Unstaged changes (worktree has modification)
        if worktree_status != ' ' {
            let status = if worktree_status == '?' { "?".to_string() } else { worktree_status.to_string() };
            files.push(GitStatusFile {
                path,
                status,
                staged: false,
            });
        }
    }

    Ok(GitStatusResult {
        branch,
        upstream,
        ahead,
        behind,
        files,
    })
}

/// Get list of branches
#[tauri::command]
async fn git_branches(cwd: String) -> Result<Vec<GitBranch>, String> {
    let use_wsl = is_wsl_path(&cwd);

    let output = if use_wsl {
        wsl_git_command(&["branch", "-a", "--format=%(HEAD) %(refname:short) %(upstream:short)"], &cwd)
            .map_err(|e| format!("Failed to list branches: {}", e))?
    } else {
        silent_command("git")
            .args(["branch", "-a", "--format=%(HEAD) %(refname:short) %(upstream:short)"])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to list branches: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to list branches: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut branches = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let current = line.starts_with('*');
        // Trim leading '*' and whitespace before parsing
        let line_content = line.trim_start_matches(|c: char| c == '*' || c.is_whitespace());
        let parts: Vec<&str> = line_content.split_whitespace().collect();

        if let Some(name) = parts.first() {
            // Skip remotes/origin/HEAD
            if name.contains("HEAD") {
                continue;
            }

            branches.push(GitBranch {
                name: name.to_string(),
                current,
                upstream: parts.get(1).map(|s| s.to_string()),
            });
        }
    }

    Ok(branches)
}

/// Get commit log
#[tauri::command]
async fn git_log(cwd: String, count: Option<u32>) -> Result<Vec<GitCommit>, String> {
    let use_wsl = is_wsl_path(&cwd);
    let count_str = count.unwrap_or(20).to_string();
    let count_arg = format!("-{}", count_str);

    let output = if use_wsl {
        wsl_git_command(&["log", &count_arg, "--format=%H|%h|%s|%an|%ar"], &cwd)
            .map_err(|e| format!("Failed to get log: {}", e))?
    } else {
        silent_command("git")
            .args(["log", &count_arg, "--format=%H|%h|%s|%an|%ar"])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to get log: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to get log: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(5, '|').collect();
        if parts.len() >= 5 {
            commits.push(GitCommit {
                hash: parts[0].to_string(),
                short_hash: parts[1].to_string(),
                message: parts[2].to_string(),
                author: parts[3].to_string(),
                date: parts[4].to_string(),
            });
        }
    }

    Ok(commits)
}

/// Stage a file
#[tauri::command]
async fn git_stage(cwd: String, path: String) -> Result<(), String> {
    let use_wsl = is_wsl_path(&cwd);

    let output = if use_wsl {
        wsl_git_command(&["add", &path], &cwd)
            .map_err(|e| format!("Failed to stage: {}", e))?
    } else {
        silent_command("git")
            .args(["add", &path])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to stage: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to stage: {}", stderr));
    }

    Ok(())
}

/// Stage all files
#[tauri::command]
async fn git_stage_all(cwd: String) -> Result<(), String> {
    let use_wsl = is_wsl_path(&cwd);

    let output = if use_wsl {
        wsl_git_command(&["add", "-A"], &cwd)
            .map_err(|e| format!("Failed to stage all: {}", e))?
    } else {
        silent_command("git")
            .args(["add", "-A"])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to stage all: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to stage all: {}", stderr));
    }

    Ok(())
}

/// Unstage a file
#[tauri::command]
async fn git_unstage(cwd: String, path: String) -> Result<(), String> {
    let use_wsl = is_wsl_path(&cwd);

    let output = if use_wsl {
        wsl_git_command(&["reset", "HEAD", &path], &cwd)
            .map_err(|e| format!("Failed to unstage: {}", e))?
    } else {
        silent_command("git")
            .args(["reset", "HEAD", &path])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to unstage: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to unstage: {}", stderr));
    }

    Ok(())
}

/// Commit staged changes
#[tauri::command]
async fn git_commit(cwd: String, message: String) -> Result<String, String> {
    let use_wsl = is_wsl_path(&cwd);

    // Escape single quotes in message for shell command
    let escaped_message = message.replace('\'', "'\\''");

    let output = if use_wsl {
        wsl_git_command(&["commit", "-m", &format!("'{}'", escaped_message)], &cwd)
            .map_err(|e| format!("Failed to commit: {}", e))?
    } else {
        silent_command("git")
            .args(["commit", "-m", &message])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to commit: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Commit failed: {}", stderr));
    }

    // Get the commit hash
    let hash_output = if use_wsl {
        wsl_git_command(&["rev-parse", "--short", "HEAD"], &cwd).ok()
    } else {
        silent_command("git")
            .args(["rev-parse", "--short", "HEAD"])
            .current_dir(&cwd)
            .output()
            .ok()
    };

    let hash = hash_output
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default();

    Ok(hash)
}

/// Checkout a branch
#[tauri::command]
async fn git_checkout(cwd: String, branch: String) -> Result<(), String> {
    let use_wsl = is_wsl_path(&cwd);

    let output = if use_wsl {
        wsl_git_command(&["checkout", &branch], &cwd)
            .map_err(|e| format!("Failed to checkout: {}", e))?
    } else {
        silent_command("git")
            .args(["checkout", &branch])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to checkout: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Checkout failed: {}", stderr));
    }

    Ok(())
}

/// Discard changes to a file
#[tauri::command]
async fn git_discard(cwd: String, path: String) -> Result<(), String> {
    let use_wsl = is_wsl_path(&cwd);

    let output = if use_wsl {
        wsl_git_command(&["checkout", "--", &path], &cwd)
            .map_err(|e| format!("Failed to discard: {}", e))?
    } else {
        silent_command("git")
            .args(["checkout", "--", &path])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to discard: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Discard failed: {}", stderr));
    }

    Ok(())
}

/// Pull from remote
#[tauri::command]
async fn git_pull(cwd: String) -> Result<String, String> {
    let use_wsl = is_wsl_path(&cwd);

    let output = if use_wsl {
        wsl_git_command(&["pull"], &cwd)
            .map_err(|e| format!("Failed to pull: {}", e))?
    } else {
        silent_command("git")
            .args(["pull"])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to pull: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Pull failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.trim().to_string())
}

/// Push to remote
#[tauri::command]
async fn git_push(cwd: String) -> Result<String, String> {
    let use_wsl = is_wsl_path(&cwd);

    let output = if use_wsl {
        wsl_git_command(&["push"], &cwd)
            .map_err(|e| format!("Failed to push: {}", e))?
    } else {
        silent_command("git")
            .args(["push"])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to push: {}", e))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Push failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    Ok(format!("{}{}", stdout.trim(), stderr.trim()))
}

// ============================================================================
// Docker Integration (Phase 5)
// ============================================================================

#[derive(serde::Serialize)]
struct DockerContainerFull {
    id: String,
    name: String,
    image: String,
    status: String,
    state: String,  // "running", "exited", "paused", "created", "restarting"
    ports: Vec<String>,
    created: String,
}

#[derive(serde::Serialize)]
struct DockerImage {
    id: String,
    repository: String,
    tag: String,
    size: String,
    created: String,
}

#[derive(serde::Serialize)]
struct DockerVolume {
    name: String,
    driver: String,
    mountpoint: String,
}

/// Get all docker containers (running and stopped)
#[tauri::command]
async fn docker_containers() -> Result<Vec<DockerContainerFull>, String> {
    let output = silent_command("docker")
        .args(["ps", "-a", "--format", "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}|{{.CreatedAt}}"])
        .output()
        .map_err(|e| format!("Docker not available: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to list containers: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut containers = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.splitn(7, '|').collect();
        if parts.len() >= 7 {
            let ports: Vec<String> = parts[5]
                .split(", ")
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect();

            containers.push(DockerContainerFull {
                id: parts[0].to_string(),
                name: parts[1].to_string(),
                image: parts[2].to_string(),
                status: parts[3].to_string(),
                state: parts[4].to_lowercase(),
                ports,
                created: parts[6].to_string(),
            });
        }
    }

    Ok(containers)
}

/// Get all docker images
#[tauri::command]
async fn docker_images() -> Result<Vec<DockerImage>, String> {
    let output = silent_command("docker")
        .args(["images", "--format", "{{.ID}}|{{.Repository}}|{{.Tag}}|{{.Size}}|{{.CreatedAt}}"])
        .output()
        .map_err(|e| format!("Docker not available: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to list images: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut images = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.splitn(5, '|').collect();
        if parts.len() >= 5 {
            images.push(DockerImage {
                id: parts[0].to_string(),
                repository: parts[1].to_string(),
                tag: parts[2].to_string(),
                size: parts[3].to_string(),
                created: parts[4].to_string(),
            });
        }
    }

    Ok(images)
}

/// Get all docker volumes
#[tauri::command]
async fn docker_volumes() -> Result<Vec<DockerVolume>, String> {
    let output = silent_command("docker")
        .args(["volume", "ls", "--format", "{{.Name}}|{{.Driver}}|{{.Mountpoint}}"])
        .output()
        .map_err(|e| format!("Docker not available: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to list volumes: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut volumes = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.splitn(3, '|').collect();
        if parts.len() >= 2 {
            volumes.push(DockerVolume {
                name: parts[0].to_string(),
                driver: parts[1].to_string(),
                mountpoint: parts.get(2).unwrap_or(&"").to_string(),
            });
        }
    }

    Ok(volumes)
}

/// Start a container
#[tauri::command]
async fn docker_start(container_id: String) -> Result<(), String> {
    let output = silent_command("docker")
        .args(["start", &container_id])
        .output()
        .map_err(|e| format!("Failed to start container: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Start failed: {}", stderr));
    }

    Ok(())
}

/// Stop a container
#[tauri::command]
async fn docker_stop(container_id: String) -> Result<(), String> {
    let output = silent_command("docker")
        .args(["stop", &container_id])
        .output()
        .map_err(|e| format!("Failed to stop container: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Stop failed: {}", stderr));
    }

    Ok(())
}

/// Restart a container
#[tauri::command]
async fn docker_restart(container_id: String) -> Result<(), String> {
    let output = silent_command("docker")
        .args(["restart", &container_id])
        .output()
        .map_err(|e| format!("Failed to restart container: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Restart failed: {}", stderr));
    }

    Ok(())
}

/// Remove a container
#[tauri::command]
async fn docker_remove(container_id: String) -> Result<(), String> {
    let output = silent_command("docker")
        .args(["rm", "-f", &container_id])
        .output()
        .map_err(|e| format!("Failed to remove container: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Remove failed: {}", stderr));
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
            output_buffers: Arc::new(std::sync::Mutex::new(HashMap::new())),
        })
        .manage(IpcState {
            response_tx: ipc_state.response_tx.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            spawn_shell,
            write_to_shell,
            resize_pty,
            kill_shell,
            get_shell_buffer,
            get_wsl_distros,
            get_git_info,
            get_docker_status,
            list_projects,
            toggle_quake_mode,
            set_quake_position,
            ipc_response,
            start_service,
            stop_service,
            get_process_stats,
            parse_ssh_config,
            store_ssh_credential,
            get_ssh_credential,
            delete_ssh_credential,
            has_ssh_credential,
            // Multi-window (Phase 4)
            create_detached_window,
            close_detached_window,
            set_always_on_top,
            get_all_windows,
            attach_window_to_main,
            // Git Integration (Phase 5)
            git_status,
            git_branches,
            git_log,
            git_stage,
            git_stage_all,
            git_unstage,
            git_commit,
            git_checkout,
            git_discard,
            git_pull,
            git_push,
            // Docker Integration (Phase 5)
            docker_containers,
            docker_images,
            docker_volumes,
            docker_start,
            docker_stop,
            docker_restart,
            docker_remove
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
