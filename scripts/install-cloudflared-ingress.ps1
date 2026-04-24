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
  http://localhost:7879 before the http_status:404 fallback. If the rule
  is already present it's left untouched.

.NOTES
  Requires an elevated PowerShell.
  Assumes DNS for demo-mcp.dyuhaus.com has already been routed via:
      cloudflared tunnel route dns <tunnel-id> demo-mcp.dyuhaus.com
#>

$ConfigPath = "C:\Windows\System32\config\systemprofile\.cloudflared\config.yml"
$Hostname   = "demo-mcp.dyuhaus.com"
$Service    = "http://localhost:7879"

if (-not (Test-Path $ConfigPath)) {
    Write-Host "Systemprofile cloudflared config not found at $ConfigPath." -ForegroundColor Red
    Write-Host "Has cloudflared been installed as a service on this box?"
    exit 1
}

$config = Get-Content -Raw $ConfigPath

if ($config -match [regex]::Escape($Hostname)) {
    Write-Host "Ingress rule for $Hostname already present. Nothing to do." -ForegroundColor Yellow
} else {
    $newBlock = "  - hostname: $Hostname`n    service: $Service`n"
    $updated  = $config -replace "(?s)(?=\s*-\s*service:\s*http_status:404\b)", $newBlock

    if ($updated -eq $config) {
        Write-Host "Could not find the 'http_status:404' fallback to insert before." -ForegroundColor Red
        Write-Host "Inspect $ConfigPath manually." -ForegroundColor Red
        exit 1
    }

    # Back up, then overwrite.
    Copy-Item $ConfigPath ($ConfigPath + ".bak") -Force
    [System.IO.File]::WriteAllText($ConfigPath, $updated)
    Write-Host "Added ingress rule for $Hostname (backup saved to $ConfigPath.bak)." -ForegroundColor Green
}

Write-Host "Restarting cloudflared service..."
Restart-Service cloudflared
Start-Sleep -Seconds 2
$status = (Get-Service cloudflared).Status
Write-Host "cloudflared service status: $status"

if ($status -ne "Running") {
    Write-Warning "Service is not Running. Check Event Viewer > Windows Logs > Application for 'cloudflared' errors."
    exit 1
}

Write-Host ""
Write-Host "Next: open https://$Hostname in a browser - should show the demo UI." -ForegroundColor Green
