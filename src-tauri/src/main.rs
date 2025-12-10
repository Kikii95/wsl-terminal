// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.contains(&"--mcp".to_string()) {
        // Run MCP server mode (stdin/stdout JSON-RPC)
        wsl_terminal_lib::mcp::run_mcp_server();
    } else if args.contains(&"--help".to_string()) || args.contains(&"-h".to_string()) {
        println!("WSL Terminal v0.4.0");
        println!();
        println!("Usage:");
        println!("  wsl-terminal          Start the GUI application");
        println!("  wsl-terminal --mcp    Run as MCP server (for Claude integration)");
        println!();
        println!("MCP Configuration (~/.claude.json):");
        println!(r#"  {{"mcpServers": {{"wsl-terminal": {{"command": "wsl-terminal", "args": ["--mcp"]}}}}}}"#);
    } else {
        // Run GUI application
        wsl_terminal_lib::run();
    }
}
