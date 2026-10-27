[CmdletBinding()]
param(
  [switch]$Manual,
  [switch]$DryRun
)

# Windows PowerShell 5.1 turns native stderr (git progress, gh status) into an
# error record. Keep cmdlet errors non-terminating and check $LASTEXITCODE
# explicitly after every native command instead.
$ErrorActionPreference = 'Continue'
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $RepoRoot

$stateDir = Join-Path $RepoRoot '.loop'
$lockPath = Join-Path $stateDir 'lock.json'
$statePath = Join-Path $stateDir 'state.json'
$logPath = Join-Path $stateDir 'last-run.log'
$pausePath = Join-Path $RepoRoot 'PAUSE'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

$startedBranch = $false
$branchName = $null
$modelUsed = $null

function Write-RunLog {
  param([string]$Message)
  $line = "{0} {1}" -f (Get-Date).ToString('o'), $Message
  Write-Host "[loop] $Message"
  Add-Content -Path $logPath -Value $line -Encoding utf8
}

function Invoke-Checked {
  param([scriptblock]$Command, [string]$Message)
  & $Command
  if ($LASTEXITCODE -ne 0) { throw $Message }
}

function Get-State {
  if (Test-Path $statePath) {
    return Get-Content $statePath -Raw | ConvertFrom-Json
  }
  return [pscustomobject]@{ consecutiveFailures = 0; lastRunAt = $null; lastResult = $null }
}

function Save-State {
  param($State)
  $State | ConvertTo-Json | Set-Content -Path $statePath -Encoding utf8
}

function Reset-ModelChanges {
  # The run starts from a clean tree. Reset and remove untracked files so the
  # next model does not inherit a failed attempt. Ignored local state survives.
  Invoke-Checked { git reset --hard origin/main } 'Could not reset model changes.'
  Invoke-Checked { git clean -fd } 'Could not remove untracked model files.'
}

function Assert-Prerequisites {
  if (-not $env:GH_TOKEN) { throw 'GH_TOKEN is not set for the loop user.' }
  foreach ($command in @('git', 'gh', 'opencode', 'npm')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "$command is not on PATH." }
  }

  $remotes = @(git remote)
  if ($LASTEXITCODE -ne 0 -or $remotes -notcontains 'origin') {
    throw 'No origin remote is configured. The loop cannot run until the repository is pushed.'
  }

  $null = gh auth status 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'gh is not authenticated for the loop user.' }
}

function Get-StringHash {
  # Windows PowerShell 5.1 has no SHA256.HashData, so use the instance API.
  param([string]$Text)
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))
  } finally {
    $sha.Dispose()
  }
}

function Test-CiGreen {
  $json = gh run list --branch main --workflow CI --limit 1 --json conclusion
  if ($LASTEXITCODE -ne 0) { return $false }
  $runs = @($json | ConvertFrom-Json)
  if ($runs.Count -eq 0) { return $false }
  return $runs[0].conclusion -eq 'success'
}

function Test-DeployInProgress {
  $json = gh run list --workflow Deploy --status in_progress --limit 1 --json databaseId
  if ($LASTEXITCODE -ne 0) { return $false }
  return @($json | ConvertFrom-Json).Count -gt 0
}

function Assert-IssueUnchanged {
  param($Issue, [string]$ExpectedBodyHash, [string]$ExpectedRisk)

  $json = gh issue view $Issue.number --json state,body,labels
  if ($LASTEXITCODE -ne 0) { throw "Could not re-read issue #$($Issue.number)." }
  $fresh = $json | ConvertFrom-Json

  if ($fresh.state -ne 'OPEN') { throw "Issue #$($Issue.number) is no longer open." }

  $labels = @($fresh.labels | ForEach-Object { $_.name })
  if ($labels -notcontains 'loop:approved') { throw "Issue #$($Issue.number) lost the loop:approved label." }

  $freshRisk = @($labels | Where-Object { $_ -like 'risk:*' })
  if ($freshRisk.Count -ne 1 -or $freshRisk[0] -ne $ExpectedRisk) {
    throw "Issue #$($Issue.number) changed its risk label during the run."
  }

  $actualHash = Get-StringHash -Text ([string]$fresh.body)
  if ($actualHash -ne $ExpectedBodyHash) { throw "Issue #$($Issue.number) changed during the run." }
}

try {
  if (Test-Path $pausePath) {
    Write-RunLog 'PAUSE is present; exiting without work.'
    exit 0
  }

  Assert-Prerequisites

  if (Test-Path $lockPath) {
    $lock = Get-Content $lockPath -Raw | ConvertFrom-Json
    $age = (Get-Date) - [datetime]$lock.startedAt
    $alive = Get-Process -Id $lock.pid -ErrorAction SilentlyContinue
    if ($age.TotalMinutes -lt 90 -and $alive) {
      Write-RunLog 'Another loop run holds the lock; exiting.'
      exit 0
    }
    Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
  }

  @{ pid = $PID; startedAt = (Get-Date).ToString('o') } |
    ConvertTo-Json | Set-Content -Path $lockPath -Encoding utf8

  $state = Get-State
  if ([int]$state.consecutiveFailures -ge 3) {
    Write-RunLog 'Circuit breaker is open; a human must clear it.'
    exit 0
  }

  $status = git status --porcelain
  if ($LASTEXITCODE -ne 0) { throw 'git status failed.' }
  if ($status) { throw 'Working tree is dirty; refusing to run.' }

  Invoke-Checked { git fetch origin --prune } 'git fetch failed.'

  $currentBranch = git rev-parse --abbrev-ref HEAD
  if ($LASTEXITCODE -ne 0 -or $currentBranch -ne 'main') { throw "Expected main, found $currentBranch." }

  $behind = git rev-list --count HEAD..origin/main
  if ($LASTEXITCODE -ne 0) { throw 'Could not compare main with origin/main.' }
  if ([int]$behind -gt 0) { throw 'main is behind origin/main.' }

  $openPrJson = gh pr list --state open --label loop:pr --json number
  if ($LASTEXITCODE -ne 0) { throw 'Could not list open loop pull requests.' }
  if (@($openPrJson | ConvertFrom-Json).Count -gt 0) {
    Write-RunLog 'A loop PR is already open; exiting.'
    exit 0
  }

  if (-not (Test-CiGreen)) { throw 'CI on main is not green.' }
  if (Test-DeployInProgress) { throw 'A deploy is in progress; refusing to run.' }

  $issuesJson = gh issue list --state open --label loop:approved --limit 50 --json number,title,body,labels,url
  if ($LASTEXITCODE -ne 0) { throw 'Could not list approved issues.' }
  $issues = @($issuesJson | ConvertFrom-Json)
  if ($issues.Count -eq 0) {
    Write-RunLog 'No approved issues; exiting.'
    exit 0
  }

  $issue = $issues |
    Where-Object { @($_.labels | Where-Object { $_.name -like 'risk:*' }).Count -eq 1 } |
    Sort-Object number |
    Select-Object -First 1

  if (-not $issue) { throw 'No approved issue has exactly one risk label.' }

  $risk = @($issue.labels | Where-Object { $_.name -like 'risk:*' })[0].name
  Write-RunLog "Selected issue #$($issue.number) [$risk] $($issue.title)"

  if ($DryRun) {
    Write-RunLog 'Dry run: no branch, model, or PR will be created.'
    exit 0
  }

  $bodyHash = Get-StringHash -Text ([string]$issue.body)

  $slug = ($issue.title.ToLowerInvariant() -replace '[^a-z0-9]+', '-' -replace '^-|-$', '')
  if ([string]::IsNullOrWhiteSpace($slug)) { $slug = "issue-$($issue.number)" }
  if ($slug.Length -gt 48) { $slug = $slug.Substring(0, 48).TrimEnd('-') }
  $branchName = "loop/$($issue.number)-$slug"

  Invoke-Checked { git switch -c $branchName origin/main } "Could not create $branchName."
  $startedBranch = $true

  $promptTemplate = Get-Content (Join-Path $PSScriptRoot 'prompt.md') -Raw
  $prompt = $promptTemplate.
    Replace('{{ISSUE_NUMBER}}', [string]$issue.number).
    Replace('{{ISSUE_TITLE}}', [string]$issue.title).
    Replace('{{ISSUE_BODY}}', [string]$issue.body).
    Replace('{{RISK}}', [string]$risk)

  if ($prompt.Length -gt 12000) {
    throw 'The issue prompt is too large. Narrow the issue before running the loop.'
  }

  $models = @(
    'opencode/deepseek-v4.1-flash-free',
    'opencode/glm-5.3-flash-free',
    'opencode/mimo-v2.6-flash-free',
    'opencode/flint-40b-free',
    'ollama/qwen2.5-coder:7b'
  )

  $modelSucceeded = $false
  foreach ($model in $models) {
    Write-RunLog "Trying model $model"
    $job = Start-Job -ScriptBlock {
      param($Model, $Prompt, $Root)
      Set-Location $Root
      & opencode run --model $Model --agent build $Prompt
      if ($LASTEXITCODE -ne 0) { throw "opencode exited $LASTEXITCODE" }
    } -ArgumentList $model, $prompt, $RepoRoot

    $finished = Wait-Job -Job $job -Timeout 1800
    if (-not $finished) {
      Stop-Job -Job $job
      Remove-Job -Job $job
      Write-RunLog "Model timed out: $model"
      Reset-ModelChanges
      continue
    }

    $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
    $jobState = $job.State
    Remove-Job -Job $job

    if ($jobState -ne 'Completed') {
      Write-RunLog "Model failed: $model"
      Reset-ModelChanges
      continue
    }

    $changed = git status --porcelain
    if (-not $changed) {
      Write-RunLog "Model produced no changes: $model"
      Reset-ModelChanges
      continue
    }

    $modelUsed = $model
    $modelSucceeded = $true
    Write-RunLog "Model produced changes: $model"
    if ($output) { $output | Select-Object -First 20 | ForEach-Object { Write-RunLog "model: $_" } }
    break
  }

  if (-not $modelSucceeded) { throw 'All models failed to produce a change.' }

  $files = @(
    (git diff --name-only origin/main)
    (git ls-files --others --exclude-standard)
  ) | Where-Object { $_ } | Sort-Object -Unique

  if ($files.Count -eq 0) { throw 'No changed files were detected.' }
  if ($files.Count -gt 12) { throw "Change touches $($files.Count) files; limit is 12." }

  $forbidden = @(
    '^\.github/',
    '^scripts/loop/',
    '^scripts/ops/',
    '^security/',
    '^package\.json$',
    '^package-lock\.json$',
    '^vite\.config\.',
    '^docs/design/decisions\.md$',
    '^docs/security/',
    '^docs/reference/security\.md$',
    '^docs/reference/ai-development\.md$',
    '^docs/superpowers/specs/',
    '^docs/superpowers/plans/',
    '^AGENTS\.md$'
  )
  $violations = @()
  foreach ($file in $files) {
    foreach ($pattern in $forbidden) {
      if ($file -match $pattern) { $violations += $file }
    }
  }
  if ($violations.Count -gt 0) {
    throw "Protected path changed: $(@($violations | Sort-Object -Unique) -join ', ')"
  }

  $deleted = git diff --name-status origin/main |
    Where-Object { $_ -match '^D\s+' } |
    ForEach-Object { ($_ -split "`t")[1] }
  $deletedTests = @($deleted | Where-Object { $_ -match '(^|/)(tests?|__tests__)/|\.(test|spec)\.' })
  if ($deletedTests.Count -gt 0) {
    throw "Test deletion is forbidden: $($deletedTests -join ', ')"
  }

  $lineCount = 0
  foreach ($line in @(git diff --numstat origin/main)) {
    $parts = $line -split "`t"
    if ($parts[0] -match '^\d+$') { $lineCount += [int]$parts[0] + [int]$parts[1] }
  }
  foreach ($file in @(git ls-files --others --exclude-standard)) {
    if (Test-Path $file -PathType Leaf) {
      $lineCount += @(Get-Content $file -ErrorAction SilentlyContinue).Count
    }
  }
  if ($lineCount -gt 400) { throw "Change is $lineCount lines; limit is 400." }

  Invoke-Checked { git diff --check } 'Whitespace check failed.'
  Invoke-Checked { npm run verify } 'Repository verification failed.'
  Invoke-Checked { npm run test:e2e -- --project=webkit-iphone } 'End-to-end tests failed.'
  Invoke-Checked { npm run test:a11y -- --project=webkit-iphone } 'Accessibility tests failed.'
  Invoke-Checked { npm run test:visual -- --project=webkit-iphone } 'Visual regression failed.'

  Assert-IssueUnchanged -Issue $issue -ExpectedBodyHash $bodyHash -ExpectedRisk $risk

  Invoke-Checked { git add -A } 'git add failed.'
  Invoke-Checked { git commit -m "$($issue.title) (#$($issue.number))" } 'git commit failed.'
  Invoke-Checked { git push -u origin $branchName } 'git push failed.'

  $prBody = @"
Closes #$($issue.number)

## Risk

``$risk``

## Issue

$($issue.title) — $($issue.url)

## Decision IDs and references

See the issue. The runner did not invent scope.

## What changed

Model: ``$modelUsed``

## Verification

- ``npm run verify``
- ``npm run test:e2e -- --project=webkit-iphone``
- ``npm run test:a11y -- --project=webkit-iphone``
- ``npm run test:visual -- --project=webkit-iphone``
- Changed files: $($files.Count)
- Changed lines: $lineCount

## Not verified

- Real iPhone manual check, if the issue requires one.
- Any item the issue names as a human check.

## Data or migration impact

None unless the issue explicitly describes it. Any data impact should have been labeled `risk:high`.

## Screenshots or recording

Required for a visual change; see the issue.
"@

  $prUrl = gh pr create `
    --base main `
    --head $branchName `
    --title "$($issue.title) (#$($issue.number))" `
    --body $prBody `
    --label 'loop:pr' `
    --label $risk
  if ($LASTEXITCODE -ne 0) { throw 'Could not open the pull request.' }

  $prNumber = [int](gh pr view $prUrl --json number --jq '.number')
  Write-RunLog "Opened PR #$prNumber"

  if (-not $Manual -and $risk -eq 'risk:low') {
    gh pr merge $prNumber --auto --squash --delete-branch
    if ($LASTEXITCODE -ne 0) {
      Write-RunLog 'Auto-merge could not be enabled; leaving the PR for a human.'
    } else {
      Write-RunLog 'Auto-merge enabled; branch protection decides when it lands.'
    }
  } else {
    Write-RunLog 'Human review required; auto-merge not enabled.'
  }

  $mode = if ($Manual) { 'Manual run; auto-merge is disabled.' } else { 'Auto-merge is enabled only for risk:low on green CI.' }
  gh issue comment $issue.number --body "The loop opened $prUrl using ``$modelUsed``. Risk: ``$risk``. $mode"
  if ($LASTEXITCODE -ne 0) { Write-RunLog 'The PR opened, but the issue comment failed.' }

  $state.consecutiveFailures = 0
  $state.lastRunAt = (Get-Date).ToString('o')
  $state.lastResult = 'pr-opened'
  Save-State $state
  exit 0
}
catch {
  $message = $_.Exception.Message
  Write-RunLog "FAILED: $message"

  $state = Get-State
  $state.consecutiveFailures = [int]$state.consecutiveFailures + 1
  $state.lastRunAt = (Get-Date).ToString('o')
  $state.lastResult = 'failed'
  Save-State $state

  if ($startedBranch -and $branchName) {
    try {
      Reset-ModelChanges
      Invoke-Checked { git switch main } 'Could not switch back to main.'
      git branch -D $branchName | Out-Null
    } catch {
      Write-RunLog "Cleanup failed: $($_.Exception.Message)"
    }
  }

  if ([int]$state.consecutiveFailures -ge 3) {
    New-Item -ItemType File -Path $pausePath -Force | Out-Null
    try {
      gh issue create `
        --title 'Loop circuit breaker open' `
        --body "The TEMPO loop stopped after 3 consecutive failures. The latest failure: $message`n`nA human must fix the cause, delete the local PAUSE file, and reset .loop/state.json before the loop resumes." `
        --label 'loop:blocked'
    } catch {
      Write-RunLog 'Could not open the circuit-breaker issue.'
    }
    Write-RunLog 'Circuit breaker open; PAUSE created.'
  }

  exit 1
}
finally {
  Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
}
