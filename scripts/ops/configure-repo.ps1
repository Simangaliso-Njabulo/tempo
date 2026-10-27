param(
  [Parameter(Mandatory)][string]$Owner,
  [Parameter(Mandatory)][string]$Repo
)

$ErrorActionPreference = 'Stop'

function Invoke-Gh {
  param([string]$Message, [scriptblock]$Command)
  # Suppress the JSON body: it is noise here and can contain repository metadata.
  $null = & $Command
  if ($LASTEXITCODE -ne 0) { throw $Message }
}

Invoke-Gh 'Could not configure repository merge behavior.' {
  @{
    allow_squash_merge     = $true
    allow_merge_commit     = $false
    allow_rebase_merge     = $false
    delete_branch_on_merge = $true
    allow_auto_merge       = $true
  } | ConvertTo-Json | gh api -X PATCH "repos/$Owner/$Repo" --input -
}

Invoke-Gh 'Could not enable secret scanning and push protection.' {
  gh api -X PATCH "repos/$Owner/$Repo" `
    -f security_and_analysis[secret_scanning][status]=enabled `
    -f security_and_analysis[secret_scanning_push_protection][status]=enabled
}

Invoke-Gh 'Could not enable private vulnerability reporting.' {
  gh api -X PUT "repos/$Owner/$Repo/private-vulnerability-reporting"
}

Invoke-Gh 'Could not enable Dependabot alerts.' {
  gh api -X PUT "repos/$Owner/$Repo/vulnerability-alerts"
}

Invoke-Gh 'Could not enable Dependabot security updates.' {
  gh api -X PUT "repos/$Owner/$Repo/automated-security-fixes"
}

# The workflow token is read-only by default. Each workflow that needs more
# asks for it in its own `permissions` block.
Invoke-Gh 'Could not set read-only default workflow permissions.' {
  gh api -X PUT "repos/$Owner/$Repo/actions/permissions/workflow" `
    -F default_workflow_permissions=read `
    -F can_approve_pull_request_reviews=false
}

# Only GitHub-owned and verified actions, pinned to full SHAs, plus the one
# allow-listed publisher whose action is pinned in the workflows. Gitleaks is
# no longer an action: the workflow runs its release binary (D-038).
Invoke-Gh 'Could not restrict Actions to selected creators.' {
  gh api -X PUT "repos/$Owner/$Repo/actions/permissions" `
    -F enabled=true `
    -f allowed_actions=selected `
    -F sha_pinning_required=true
}

Invoke-Gh 'Could not set the allowed-actions list.' {
  @{
    github_owned_allowed = $true
    verified_allowed     = $true
    patterns_allowed     = @('ossf/scorecard-action@*')
  } | ConvertTo-Json | gh api -X PUT "repos/$Owner/$Repo/actions/permissions/selected-actions" --input -
}

Write-Host 'Repository merge behavior, security features, and Actions permissions are configured.'
