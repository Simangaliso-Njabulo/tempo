param(
  [Parameter(Mandatory = $true)][string]$Owner,
  [Parameter(Mandatory = $true)][string]$Repo
)

$ErrorActionPreference = 'Stop'

gh api -X POST "repos/$Owner/$Repo/pages" -f build_type=workflow
if ($LASTEXITCODE -ne 0) {
  gh api -X PUT "repos/$Owner/$Repo/pages" -f build_type=workflow
}
if ($LASTEXITCODE -ne 0) { throw 'Could not enable Pages.' }

$pages = gh api "repos/$Owner/$Repo/pages" | ConvertFrom-Json
Write-Host "Pages enabled: $($pages.html_url)"
