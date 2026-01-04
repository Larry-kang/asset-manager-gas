$ErrorActionPreference = 'Stop'

Write-Host "🚀 Starting Deployment Process..." -ForegroundColor Cyan

# 1. Run Tests
Write-Host "🧪 Running Tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Tests failed! Aborting deployment."
    exit 1
}
Write-Host "✅ Tests Passed." -ForegroundColor Green

# 2. Push to GAS
Write-Host "📤 Pushing to Google Apps Script..." -ForegroundColor Yellow
# Use npx to use the local clasp version
npx clasp push -f
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Clasp Push failed!"
    exit 1
}

Write-Host "✅ Deployment Complete! (Files synced to GAS Project)" -ForegroundColor Green
