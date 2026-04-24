#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Add the demo-mcp.dyuhaus.com ingress rule to the systemprofile
  cloudflared config and restart the cloudflared service.

.DESCRIPTION
  The cloudflared service runs under LocalSystem and reads its config
  from C:\Windows\System32\config\systemprofile\.cloudflared\config.yml.
  Editing the user-profile config won't affect the service.

  This script inserts a new hostname mapping for demo-mcp.dyuhaus.com ->
  http://localhost:7879 before the http_status:404 fallback. If a prior
  run wrote a broken rule (merged onto the wrong line), it automatically
  restores the .bak copy before re-inserting.

.NOTES
  Requires an elevated PowerShell.
  Assumes DNS for demo-mcp.dyuhaus.com has already been routed via:
      cloudflared tunnel route dns <tunnel-id> demo-mcp.dyuhaus.com
#>

$ConfigPath = "C:\Windows\System32\config\systemprofile\.cloudflared\config.yml"
$BackupPath = $ConfigPath + ".bak"
$Hostname   = "demo-mcp.dyuhaus.com"
$Service    = "http://localhost:7879"

if (-not (Test-Path $ConfigPath)) {
    Write-Host "Systemprofile cloudflared config not found at $ConfigPath." -ForegroundColor Red
    exit 1
}

# If a previous run left a mangled config, roll back first.
$rawNow = Get-Content -Raw $ConfigPath
$looksBroken = $rawNow -match "http://localhost:\d+\s+-\s+hostname:"
if ($looksBroken -and (Test-Path $BackupPath)) {
    Write-Host "Detected a broken config from a prior run. Restoring from $BackupPath..." -ForegroundColor Yellow
    Copy-Item $BackupPath $ConfigPath -Force
}

# Read as lines and check whether the rule is already present.
$lines = Get-Content $ConfigPath
if ($lines -match [regex]::Escape("hostname: $Hostname")) {
    Write-Host "Ingress rule for $Hostname already present. Nothing to do." -ForegroundColor Yellow
} else {
    $fallbackIndex = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*-\s+service:\s+http_status:404") {
            $fallbackIndex = $i
            break
        }
    }
    if ($fallbackIndex -lt 0) {
        Write-Host "Could not find the 'http_status:404' fallback line." -ForegroundColor Red
        Write-Host "Inspect $ConfigPath manually." -ForegroundColor Red
        exit 1
    }

    # Back up before editing.
    Copy-Item $ConfigPath $BackupPath -Force

    $before   = $lines[0..($fallbackIndex - 1)]
    $fallback = $lines[$fallbackIndex..($lines.Count - 1)]
    $inject   = @("  - hostname: $Hostname", "    service: $Service")
    $updated  = @()
    $updated += $before
    $updated += $inject
    $updated += $fallback

    # Preserve the existing file's encoding/line endings by writing via .NET.
    [System.IO.File]::WriteAllLines($ConfigPath, $updated)
    Write-Host "Added ingress rule for $Hostname (backup saved to $BackupPath)." -ForegroundColor Green
}

Write-Host "Restarting cloudflared service..."
try {
    Restart-Service cloudflared -ErrorAction Stop
} catch {
    Write-Host "Restart-Service failed: $_" -ForegroundColor Red
    Write-Host "Config at $ConfigPath (first 40 lines):"
    (Get-Content $ConfigPath -TotalCount 40) | ForEach-Object { Write-Host "  $_" }
    exit 1
}
Start-Sleep -Seconds 2
$status = (Get-Service cloudflared).Status
Write-Host "cloudflared service status: $status"

if ($status -ne "Running") {
    Write-Warning "Service is not Running. Check Event Viewer > Windows Logs > Application for 'cloudflared' errors."
    exit 1
}

Write-Host ""
Write-Host "Next: open https://$Hostname in a browser - should show the demo UI." -ForegroundColor Green
