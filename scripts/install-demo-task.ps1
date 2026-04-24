#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Install two scheduled tasks for the dy-mcp-demo public server:
    1. dy-mcp-demo-api   - runs the HTTP API on :7879 at boot
    2. dy-mcp-demo-reset - wipes + reseeds the demo DB every hour

.DESCRIPTION
  Both tasks run as the current user via S4U (no saved password). The
  demo DB lives in the user's ~/.dy-mcp-demo/ directory, which is why
  the tasks run as the user rather than SYSTEM.

  Idempotent: re-running replaces any existing tasks with the same
  names and leaves everything in a known-good state.

.NOTES
  Must be run from an elevated PowerShell. S4U task creation
  requires administrator privileges.
#>

$ApiTask   = "dy-mcp-demo-api"
$ResetTask = "dy-mcp-demo-reset"
$RepoRoot  = "F:\.dy-mcp-demo"
$NodeExe   = "C:\Program Files\nodejs\node.exe"
$TsxCli    = Join-Path $RepoRoot "node_modules\tsx\dist\cli.mjs"
$SeedArgs  = "`"$TsxCli`" scripts\seed.ts"
$Port      = 7879

function Invoke-Schtasks {
    param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $Args)
    $out = & schtasks.exe @Args 2>&1
    return @{ ExitCode = $LASTEXITCODE; Output = $out }
}

if (-not (Test-Path $NodeExe)) {
    Write-Host "node.exe not found at $NodeExe. Install Node.js or edit this script." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $RepoRoot "dist\server.js"))) {
    Write-Host "dist\server.js missing. Run 'npm run build' in $RepoRoot first." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $TsxCli)) {
    Write-Host "tsx CLI missing at $TsxCli. Run 'npm install' in $RepoRoot first." -ForegroundColor Red
    exit 1
}

# Free port 7879 if a dev server is still bound.
$listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
            Select-Object -First 1
if ($listener) {
    Write-Host "Stopping existing process on :$Port (PID $($listener.OwningProcess))..."
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

$user = "$env:USERDOMAIN\$env:USERNAME"

# ── Task 1: the API server ────────────────────────────────────────────
$apiXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <URI>\$ApiTask</URI>
    <Description>Public demo MCP server - backs demo-mcp.dyuhaus.com via cloudflared.</Description>
  </RegistrationInfo>
  <Triggers>
    <BootTrigger><Enabled>true</Enabled></BootTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>$user</UserId>
      <LogonType>S4U</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>true</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>$NodeExe</Command>
      <Arguments>dist\server.js</Arguments>
      <WorkingDirectory>$RepoRoot</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@

$apiXmlFile = Join-Path $env:TEMP "dy-mcp-demo-api.xml"
[System.IO.File]::WriteAllText($apiXmlFile, $apiXml, [System.Text.Encoding]::Unicode)

Write-Host "Installing scheduled task '$ApiTask' (running as $user)..."
Invoke-Schtasks /Delete /TN $ApiTask /F | Out-Null
$create = Invoke-Schtasks /Create /XML $apiXmlFile /TN $ApiTask
if ($create.ExitCode -ne 0) {
    Write-Host "schtasks /Create failed:" -ForegroundColor Red
    $create.Output | ForEach-Object { Write-Host $_ }
    exit 1
}

# ── Task 2: the hourly reseed ─────────────────────────────────────────
# Start time is tomorrow at 00:00 with a 1-hour repetition running indefinitely,
# which effectively reseeds on every round hour.
$startBoundary = (Get-Date).Date.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")

$resetXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <URI>\$ResetTask</URI>
    <Description>Wipe + reseed the dy-mcp-demo database every hour.</Description>
  </RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <StartBoundary>$startBoundary</StartBoundary>
      <Enabled>true</Enabled>
      <Repetition>
        <Interval>PT1H</Interval>
        <StopAtDurationEnd>false</StopAtDurationEnd>
      </Repetition>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>$user</UserId>
      <LogonType>S4U</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>true</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT5M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>$NodeExe</Command>
      <Arguments>$SeedArgs</Arguments>
      <WorkingDirectory>$RepoRoot</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@

$resetXmlFile = Join-Path $env:TEMP "dy-mcp-demo-reset.xml"
[System.IO.File]::WriteAllText($resetXmlFile, $resetXml, [System.Text.Encoding]::Unicode)

Write-Host "Installing scheduled task '$ResetTask' (hourly reseed)..."
Invoke-Schtasks /Delete /TN $ResetTask /F | Out-Null
$create = Invoke-Schtasks /Create /XML $resetXmlFile /TN $ResetTask
if ($create.ExitCode -ne 0) {
    Write-Host "schtasks /Create failed:" -ForegroundColor Red
    $create.Output | ForEach-Object { Write-Host $_ }
    exit 1
}

# ── Initial seed + start the API ──────────────────────────────────────
Write-Host "Running initial seed..."
$seed = Invoke-Schtasks /Run /TN $ResetTask
if ($seed.ExitCode -ne 0) {
    Write-Host "schtasks /Run $ResetTask failed:" -ForegroundColor Red
    $seed.Output | ForEach-Object { Write-Host $_ }
}

Write-Host "Starting API task..."
$run = Invoke-Schtasks /Run /TN $ApiTask
if ($run.ExitCode -ne 0) {
    Write-Host "schtasks /Run $ApiTask failed:" -ForegroundColor Red
    $run.Output | ForEach-Object { Write-Host $_ }
    exit 1
}

Start-Sleep -Seconds 2
$listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
            Select-Object -First 1

if ($listener) {
    Write-Host ""
    Write-Host ("OK - listening on :" + $Port + " (PID " + $listener.OwningProcess + ")") -ForegroundColor Green
    Write-Host "Next: add an ingress rule for demo-mcp.dyuhaus.com in the systemprofile"
    Write-Host "cloudflared config and restart the cloudflared service."
    Write-Host ""
    Write-Host "Handy:"
    Write-Host "  schtasks /End    /TN $ApiTask           # stop API"
    Write-Host "  schtasks /Run    /TN $ApiTask           # start API"
    Write-Host "  schtasks /Run    /TN $ResetTask         # reseed now"
    Write-Host "  schtasks /Delete /TN $ApiTask /F        # uninstall API"
    Write-Host "  schtasks /Delete /TN $ResetTask /F      # uninstall reset"
} else {
    Write-Warning ("Port " + $Port + " is not listening. Check Task Scheduler > Task Scheduler Library > " + $ApiTask + " > Last Run Result.")
    exit 1
}
