param(
  [Parameter(Mandatory = $true)][string]$Owner,
  [Parameter(Mandatory = $true)][string]$Repo
)

$ErrorActionPreference = 'Stop'
$problems = @()

# gh writes HTTP failures to stderr. A missing setting is a finding for the
# audit to report, not a reason to abort it, so stderr is suppressed and the
# exit code decides. Some endpoints answer 204 with no body, so callers that
# only need "is it on" use Test-Endpoint rather than parsing JSON.
function Invoke-GhApi {
  param([string]$Endpoint)
  # Windows PowerShell turns a native command's stderr into a terminating error
  # while $ErrorActionPreference is 'Stop', before `2>$null` can help. Relax it
  # for the call (function scope only) and judge by the exit code.
  $ErrorActionPreference = 'Continue'
  $body = gh api $Endpoint 2>$null
  [pscustomobject]@{ Ok = ($LASTEXITCODE -eq 0); Body = ($body -join "`n") }
}

function Get-Json {
  param([string]$Endpoint)
  $result = Invoke-GhApi $Endpoint
  if (-not $result.Ok -or [string]::IsNullOrWhiteSpace($result.Body)) { return $null }
  return $result.Body | ConvertFrom-Json
}

function Test-Endpoint {
  param([string]$Endpoint)
  return (Invoke-GhApi $Endpoint).Ok
}

$policy = Get-Content (Join-Path $PSScriptRoot '..\..\security\policy.json') -Raw | ConvertFrom-Json

$protection = Get-Json "repos/$Owner/$Repo/branches/main/protection"
if (-not $protection) {
  $problems += 'main has no branch protection.'
} else {
  $required = @($policy.requiredChecks)
  $statusChecks = $protection.required_status_checks
  if (-not $statusChecks) {
    $problems += 'main protection does not require the status checks in security/policy.json.'
  } else {
    $contexts = @($statusChecks.contexts)
    $missing = @($required | Where-Object { $contexts -notcontains $_ })
    if ($missing.Count -gt 0) {
      $problems += "main protection is missing checks: $($missing -join ', ')"
    }
    if (-not $statusChecks.strict) {
      $problems += 'main protection does not require an up-to-date branch.'
    }
  }
  if (-not $protection.enforce_admins.enabled) {
    $problems += 'main protection does not enforce admins.'
  }
  if ($protection.allow_force_pushes.enabled) {
    $problems += 'main protection allows force pushes.'
  }
  if ($protection.allow_deletions.enabled) {
    $problems += 'main protection allows deletion.'
  }
  if (-not $protection.required_linear_history.enabled) {
    $problems += 'main protection does not require linear history.'
  }
  if (-not $protection.required_conversation_resolution.enabled) {
    $problems += 'main protection does not require conversation resolution.'
  }
}

$repoInfo = Get-Json "repos/$Owner/$Repo"
if (-not $repoInfo) {
  $problems += 'Could not read repository settings.'
} else {
  if ($repoInfo.security_and_analysis.secret_scanning.status -ne 'enabled') {
    $problems += 'Secret scanning is not enabled.'
  }
  if ($repoInfo.security_and_analysis.secret_scanning_push_protection.status -ne 'enabled') {
    $problems += 'Secret scanning push protection is not enabled.'
  }
}

if (-not (Test-Endpoint "repos/$Owner/$Repo/private-vulnerability-reporting")) {
  $problems += 'Private vulnerability reporting is not enabled.'
}

if (-not (Test-Endpoint "repos/$Owner/$Repo/vulnerability-alerts")) {
  $problems += 'Dependabot alerts are not enabled.'
}

$automatedSecurityFixes = Get-Json "repos/$Owner/$Repo/automated-security-fixes"
if (-not $automatedSecurityFixes -or -not $automatedSecurityFixes.enabled) {
  $problems += 'Dependabot security updates are not enabled.'
}

$workflowPermissions = Get-Json "repos/$Owner/$Repo/actions/permissions/workflow"
if (-not $workflowPermissions -or $workflowPermissions.default_workflow_permissions -ne 'read') {
  $problems += 'The default workflow token is not read-only.'
}

$actionsPermissions = Get-Json "repos/$Owner/$Repo/actions/permissions"
if (-not $actionsPermissions -or $actionsPermissions.allowed_actions -ne 'selected') {
  $problems += 'Actions are not restricted to selected creators.'
}
if ($actionsPermissions -and -not $actionsPermissions.sha_pinning_required) {
  $problems += 'Actions are not required to pin to a full commit SHA.'
}

if ($problems.Count -gt 0) {
  foreach ($problem in $problems) { Write-Host "MISSING: $problem" }
  exit 1
}

Write-Host 'Repository security settings match security/policy.json.'
