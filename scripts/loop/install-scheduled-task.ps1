[CmdletBinding()]
param(
  [switch]$Activate
)

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$runner = Join-Path $root 'scripts\loop\run.ps1'
if (-not (Test-Path $runner)) { throw "Runner not found: $runner" }

$problems = @()

$remotes = @(git -C $root remote)
if ($LASTEXITCODE -ne 0 -or $remotes -notcontains 'origin') {
  $problems += 'No origin remote. Push the repository before activating the loop.'
}

if (-not $env:GH_TOKEN) {
  $problems += 'GH_TOKEN is not set for this user. Create a fine-grained token outside the repository.'
} else {
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $null = gh auth status 2>&1
  $authExit = $LASTEXITCODE
  $ErrorActionPreference = $previous
  if ($authExit -ne 0) { $problems += 'gh is not authenticated. Run gh auth login or set GH_TOKEN correctly.' }
}

if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
  $problems += 'opencode is not on PATH.'
}

if ($problems.Count -gt 0) {
  Write-Host 'The loop is not ready to activate:'
  foreach ($problem in $problems) { Write-Host "  - $problem" }
  if ($Activate) { throw 'Fix the problems above, then run the installer again.' }
  Write-Host 'Preflight finished. Nothing was scheduled.'
  exit 0
}

if (-not $Activate) {
  Write-Host 'Preflight passed. Nothing was scheduled.'
  Write-Host 'Re-run with -Activate only after CI, the security checks, and branch protection are green on main.'
  exit 0
}

$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date '08:00') `
  -RepetitionInterval (New-TimeSpan -Hours 3) `
  -RepetitionDuration (New-TimeSpan -Hours 14)
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName 'TEMPO low-risk loop' `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Runs the TEMPO low-risk improvement loop every 3 hours, 08:00-22:00.' `
  -Force

Write-Host 'Scheduled task installed: TEMPO low-risk loop'
Write-Host 'Triggers at 08:00, 11:00, 14:00, 17:00, and 20:00 local time.'
Write-Host 'The task runs as the current user. A dedicated low-privilege user is a human setup step.'
