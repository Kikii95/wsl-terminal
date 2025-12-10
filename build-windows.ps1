# Build script for Windows
# Run this from PowerShell on Windows side

$ErrorActionPreference = "Stop"

Write-Host "Building WSL Terminal for Windows..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Check Rust
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Rust not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install

# Build
Write-Host "Building application..." -ForegroundColor Yellow
pnpm tauri build

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "Installers available in: src-tauri/target/release/bundle/" -ForegroundColor Cyan
