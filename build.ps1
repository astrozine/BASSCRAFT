$ErrorActionPreference = "Stop"

$srcDir = "C:\Users\User\.gemini\antigravity\scratch\basscraft_v3light"
$deployDir = "C:\Users\User\.gemini\antigravity\scratch\basscraft_v3light_deploy"
$zipPath = "C:\Users\User\.gemini\antigravity\scratch\v3light_deploy.zip"

if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

$coreFiles = @("index.html", "styles.css", "app.js")
foreach ($f in $coreFiles) {
    if (Test-Path "$srcDir\$f") {
        Copy-Item -Path "$srcDir\$f" -Destination "$deployDir\$f"
    }
}

$filesToScan = @("index.html", "styles.css")
$assets = @()

foreach ($f in $filesToScan) {
    if (Test-Path "$srcDir\$f") {
        $content = Get-Content "$srcDir\$f" -Raw
        $matches = [regex]::Matches($content, 'assets/[^"''\>\)\r\n]+')
        foreach ($m in $matches) {
            $val = $m.Value.Trim()
            if ($val.EndsWith(",") -or $val.EndsWith("?") -or $val.EndsWith("#")) {
                $val = $val.Substring(0, $val.Length - 1)
            }
            if ($val.EndsWith("v=3")) {
                $val = $val.Split('?')[0]
            }
            $subMatches = $val.Split(',')
            foreach ($sm in $subMatches) {
                $sm = $sm.Trim()
                if ($sm.StartsWith("assets/")) {
                    $assets += $sm
                }
            }
        }
    }
}

$assets = $assets | Select-Object -Unique
Write-Host "Found $($assets.Count) unique assets."

$missing = @()
foreach ($asset in $assets) {
    # Decode URL encoded spaces if any, though our files actually have spaces
    $decodedAsset = [uri]::UnescapeDataString($asset)
    
    $assetPath = Join-Path $srcDir $asset
    if (-not (Test-Path $assetPath)) {
        $assetPath = Join-Path $srcDir $decodedAsset
        if (-not (Test-Path $assetPath)) {
            $missing += $asset
            continue
        }
    }
    
    $destPath = Join-Path $deployDir $decodedAsset
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    Copy-Item -Path $assetPath -Destination $destPath
}

if ($missing.Count -gt 0) {
    Write-Host "Warning, some assets not found:"
    foreach ($m in $missing) {
        Write-Host "  - $m"
    }
}

Write-Host "Creating zip at $zipPath"
Compress-Archive -Path "$deployDir\*" -DestinationPath $zipPath -Force
Write-Host "Done!"
