param(
  [Parameter(Mandatory = $true)][string]$Owner,
  [Parameter(Mandatory = $true)][string]$Repo
)

$ErrorActionPreference = 'Stop'
$problems = @()

function Get-Json {
  param([string]$Endpoint)
  $raw = gh api $Endpoint
  if ($LASTEXITCODE -ne 0) { return $null }
  return $raw | ConvertFrom-Json
}

$policy = Get-Content (Join-Path $PSScriptRoot '..\..\security\policy.json') -Raw | ConvertFrom-Json

$protection = Get-Json "repos/$Owner/$Repo/branches/main/protection"
if (-not $protection) {
  $problems += 'main has no branch protection.'
} else {
  $required = @($policy.requiredChecks)
  $contexts = @($protection.required_status_checks.contexts)
  $missing = @($required | Where-Object { $contexts -notcontains $_ })
  if ($missing.Count -gt 0) { $problems += "main protection is missing checks: $($missing -join ', ')" }
  if (-not $protection.required_status_checks.strict) { $problems += 'main protection does not require an up-to-date branch.' }
  if (-not $protection.enforce_admins.enabled) { $problems += 'main protection does not enforce admins.' }
  if ($protection.allow_force_pushes.enabled) { $problems += 'main protection allows force pushes.' }
  if ($protection.allow_deletions.enabled) { $problems += 'main protection allows deletion.' }
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

$vuln = Get-Json "repos/$Owner/$Repo/private-vulnerability-reporting"
if (-not $vuln -or -not $vuln.enabled) { $problems += 'Private vulnerability reporting is not enabled.' }

$vulnerabilityAlerts = Get-Json "repos/$Owner/$Repo/vulnerability-alerts"
if ($LASTEXITCODE -ne 0) { $problems += 'Dependabot alerts are not enabled.' }

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

if ($problems.Count -gt 0) {
  foreach ($problem in $problems) { Write-Host "MISSING: $problem" }
  exit 1
}

Write-Host 'Repository security settings match security/policy.json.'
