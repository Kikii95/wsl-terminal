use std::process::Stdio;
use tauri::{Manager, Emitter};
use tokio::io::{AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use std::sync::Arc;
use tokio::sync::Mutex;

// Store for active shell processes
struct ShellState {
    processes: Arc<Mutex<std::collections::HashMap<String, ShellProcess>>>,
}

struct ShellProcess {
    stdin: tokio::process::ChildStdin,
    _child: Child,
}

#[tauri::command]
async fn spawn_shell(
    tab_id: String,
    shell: String,
    state: tauri::State<'_, ShellState>,
    window: tauri::Window,
) -> Result<(), String> {
    let (cmd, args): (&str, Vec<&str>) = match shell.as_str() {
        "wsl" => ("wsl", vec!["-e", "bash", "-l"]),
        "powershell" => ("powershell", vec!["-NoLogo"]),
        "cmd" => ("cmd", vec!["/K"]),
        _ => ("wsl", vec!["-e", "bash", "-l"]),
    };

    let mut child = Command::new(cmd)
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
    let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to get stderr")?;

    // Store the process
    {
        let mut processes = state.processes.lock().await;
        processes.insert(
            tab_id.clone(),
            ShellProcess {
                stdin,
                _child: child,
            },
        );
    }

    // Read stdout in a separate task
    let tab_id_stdout = tab_id.clone();
    let window_stdout = window.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout);
        let mut buffer = vec![0u8; 4096];

        loop {
            match tokio::io::AsyncReadExt::read(&mut reader, &mut buffer).await {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = window_stdout.emit(&format!("shell-output-{}", tab_id_stdout), data);
                }
                Err(_) => break,
            }
        }
    });

    // Read stderr in a separate task
    let tab_id_stderr = tab_id.clone();
    let window_stderr = window.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr);
        let mut buffer = vec![0u8; 4096];

        loop {
            match tokio::io::AsyncReadExt::read(&mut reader, &mut buffer).await {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = window_stderr.emit(&format!("shell-output-{}", tab_id_stderr), data);
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
    state: tauri::State<'_, ShellState>,
) -> Result<(), String> {
    let mut processes = state.processes.lock().await;

    if let Some(process) = processes.get_mut(&tab_id) {
        process
            .stdin
            .write_all(data.as_bytes())
            .await
            .map_err(|e| format!("Failed to write to shell: {}", e))?;
        process
            .stdin
            .flush()
            .await
            .map_err(|e| format!("Failed to flush: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn kill_shell(
    tab_id: String,
    state: tauri::State<'_, ShellState>,
) -> Result<(), String> {
    let mut processes = state.processes.lock().await;
    processes.remove(&tab_id);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ShellState {
            processes: Arc::new(Mutex::new(std::collections::HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            spawn_shell,
            write_to_shell,
            kill_shell
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
