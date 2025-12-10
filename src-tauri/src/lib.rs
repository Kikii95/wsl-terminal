use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tokio::sync::Mutex;

struct PtyProcess {
    writer: Box<dyn Write + Send>,
    _pair: portable_pty::PtyPair,
}

struct AppState {
    processes: Arc<Mutex<HashMap<String, PtyProcess>>>,
}

#[tauri::command]
async fn get_wsl_distros() -> Result<Vec<String>, String> {
    let output = std::process::Command::new("wsl.exe")
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(AppState {
            processes: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            spawn_shell,
            write_to_shell,
            resize_pty,
            kill_shell,
            get_wsl_distros
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            if let Some(window) = app.get_webview_window("main") {
                log::info!("WSL Terminal started successfully");
                let _ = window.show();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
