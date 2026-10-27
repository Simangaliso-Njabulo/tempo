param(
  [Parameter(Mandatory = $true)][string]$Owner,
  [Parameter(Mandatory = $true)][string]$Repo
)

$ErrorActionPreference = 'Stop'

# The required checks live in one place. Reading the policy here keeps branch
# protection, the workflow files, and `security-policy` from drifting apart.
$policyPath = Join-Path $PSScriptRoot '..\..\security\policy.json'
if (-not (Test-Path $policyPath)) { throw "Missing policy file: $policyPath" }
$policy = Get-Content $policyPath -Raw | ConvertFrom-Json
$requiredChecks = @($policy.requiredChecks)
if ($requiredChecks.Count -lt 14) { throw 'security/policy.json lists fewer than 14 required checks.' }

$body = @{
  required_status_checks = @{
    strict   = $true
    contexts = $requiredChecks
  }
  enforce_admins                = $true
  required_pull_request_reviews = $null
  restrictions                  = $null
  allow_force_pushes            = $false
  allow_deletions               = $false
  required_linear_history       = $true
  required_conversation_resolution = $true
} | ConvertTo-Json -Depth 10

$body | gh api -X PUT "repos/$Owner/$Repo/branches/main/protection" --input -
if ($LASTEXITCODE -ne 0) { throw 'Could not protect main.' }

Write-Host 'main is protected. Required checks:'
$requiredChecks | ForEach-Object { Write-Host " - $_" }
