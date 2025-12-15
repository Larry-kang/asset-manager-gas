$ErrorActionPreference = 'Stop'

Write-Host "? Starting Asset Manager (Self-Hosted)..." -ForegroundColor Cyan

# 1. Check Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "? Node.js not found! Please install Node.js from https://nodejs.org/"
    exit 1
}

# 2. Install Dependencies
if (!(Test-Path "node_modules")) {
    Write-Host "? Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# 3. Start Server & Open Browser
Write-Host "? Starting Mock Server at http://localhost:3002..." -ForegroundColor Green
Write-Host "? Opening Browser..."

# Start server in background? No, keep it foreground for logs. 
# But we want to open browser too.
Start-Process "http://localhost:3002"

# Run Server
node tests/server.js
