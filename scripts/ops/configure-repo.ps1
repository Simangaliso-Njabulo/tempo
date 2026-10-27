param(
  [Parameter(Mandatory)][string]$Owner,
  [Parameter(Mandatory)][string]$Repo
)

$ErrorActionPreference = 'Stop'
$body = @{
  allow_squash_merge      = $true
  allow_merge_commit      = $false
  allow_rebase_merge      = $false
  delete_branch_on_merge  = $true
  allow_auto_merge        = $true
} | ConvertTo-Json

$body | gh api -X PATCH "repos/$Owner/$Repo" --input -
if ($LASTEXITCODE -ne 0) { throw 'Could not configure repository merge behavior.' }

gh api -X PATCH "repos/$Owner/$Repo" `
  -f security_and_analysis[secret_scanning][status]=enabled `
  -f security_and_analysis[secret_scanning_push_protection][status]=enabled
if ($LASTEXITCODE -ne 0) { throw 'Could not enable secret scanning and push protection.' }

gh api -X PUT "repos/$Owner/$Repo/private-vulnerability-reporting"
if ($LASTEXITCODE -ne 0) { throw 'Could not enable private vulnerability reporting.' }

Write-Host 'Repository merge behavior and security features are configured.'
