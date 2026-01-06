param (
    [Parameter(Mandatory=$true)]
    [string]$Command,

    [Parameter(Mandatory=$false)]
    [string]$SuccessString = "DONE",

    [Parameter(Mandatory=$false)]
    [int]$MaxIterations = 10
)

$iteration = 1
$found = $false

Write-Host "�� Starting Ralph Loop (RWL)..." -ForegroundColor Cyan
Write-Host "Target Command: $Command"
Write-Host "Success Marker: $SuccessString"

while ($iteration -le $MaxIterations) {
    Write-Host "--- Iteration $iteration / $MaxIterations ---" -ForegroundColor Yellow
    
    # Execute the command and capture output
    # Use powershell.exe to execute specifically to ensure output is captured as a single string cleanly
    $output = powershell.exe -Command "$Command" 2>&1 | Out-String
    Write-Host $output

    if ($output -like "*$SuccessString*") {
        Write-Host "✅ Success string '$SuccessString' detected!" -ForegroundColor Green
        $found = $true
        break
    }

    Write-Host "❌ Success string not found. Retrying..." -ForegroundColor Red
    $iteration++
}

if (-not $found) {
    Write-Host "🚨 Max iterations reached without success." -ForegroundColor DarkRed
    exit 1
} else {
    Write-Host "🎊 Ralph Loop Finished Successfully." -ForegroundColor Green
}
