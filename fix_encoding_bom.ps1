$ErrorActionPreference = "Stop"

function Convert-ToUtf8NoBom {
    param(
        [string]$Path
    )
    if (-not (Test-Path $Path)) {
        Write-Warning "File not found: $Path"
        return
    }

    try {
        # Read as UTF-8
        $content = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
        
        # Write as UTF-8 NO BOM
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($Path, $content, $utf8NoBom)
        
        Write-Host "Enforced UTF-8 (No BOM): $Path"
    }
    catch {
        Write-Warning "Failed to convert $Path : $_"
    }
}

# Recursively find source files (gs, html, js, json, md)
# Exclude .git, node_modules, .vscode
Get-ChildItem -Path . -Recurse -Include "*.gs", "*.html", "*.js", "*.json" | 
Where-Object { $_.FullName -notmatch "\\.git\\" -and $_.FullName -notmatch "\\node_modules\\" -and $_.FullName -notmatch "\\.vscode\\" } |
ForEach-Object {
    Convert-ToUtf8NoBom -Path $_.FullName
}
