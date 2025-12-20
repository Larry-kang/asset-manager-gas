# start_project.ps1
# 資產管理系統 - 一鍵啟動與測試腳本

$ErrorActionPreference = 'Stop'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

Write-Host "--- [?? 技術總監代理: Ops] 正在啟動專案環境 ---" -ForegroundColor Cyan

# 1. 環境檢查
Write-Host "[1/3] 檢查環境依賴..." -ForegroundColor Yellow
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "錯誤: 找不到 Node.js，請先安裝 Node.js (v18+)" -ForegroundColor Red
    exit 1
}

# 2. 安裝套件
Write-Host "[2/3] 檢查並安裝套件 (npm install)..." -ForegroundColor Yellow
npm install

# 3. 執行測試
Write-Host "[3/3] 執行系統整合測試與單元測試..." -ForegroundColor Yellow
npm test

if ($LASTEXITCODE -ne 0) {
    Write-Host "警告: 測試未完全通過，請檢查邏輯。" -ForegroundColor Yellow
}
else {
    Write-Host "恭喜: 所有測試 (Unit/Integration) 已通過！" -ForegroundColor Green
}

# 4. 啟動本機預覽 (E2E Mock Server)
Write-Host "--- 啟動本機預覽伺服器 (http://localhost:3002) ---" -ForegroundColor Cyan
Write-Host "提示: 此伺服器模擬 GAS 環境，可用於 UI 預覽。" -ForegroundColor Gray
Write-Host "按下 Ctrl+C 可停止伺服器。" -ForegroundColor Gray

npm start
