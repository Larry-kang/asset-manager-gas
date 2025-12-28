$ErrorActionPreference = "Stop"

function Convert-ToUtf8WithBom {
    param(
        [string]$Path
    )
    if (-not (Test-Path $Path)) {
        Write-Warning "File not found: $Path"
        return
    }
    
    # Read as UTF-8 (handling current state)
    # If it was written as UTF-8 no BOM, this correctly decodes it.
    $content = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    
    # Write as UTF-8 WITH BOM
    $utf8WithBom = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText($Path, $content, $utf8WithBom)
    
    Write-Host "Converted $Path to UTF-8 with BOM"
}

# Recursively find all .md files in my-ai-swarm
Get-ChildItem -Path "my-ai-swarm" -Recurse -Filter "*.md" | ForEach-Object {
    Convert-ToUtf8WithBom -Path $_.FullName
}
