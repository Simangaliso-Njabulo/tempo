[CmdletBinding()]
param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $RepoRoot

$pausePath = Join-Path $RepoRoot 'PAUSE'
if (Test-Path $pausePath) { Write-Host 'PAUSE is present; audit exits.'; exit 0 }
if (-not $env:GH_TOKEN) { throw 'GH_TOKEN is not set.' }

$status = git status --porcelain
if ($status) { throw 'Working tree is dirty; audit refuses to run.' }

$prompt = @"
You are auditing TEMPO. Read AGENTS.md, docs/design/feel-contract.md,
docs/design/decisions.md, docs/reference/source-map.md, and
docs/reference/ai-development.md.

Look for evidence-backed, small improvements: a failing test, a measured
regression, stale documentation, a broken link, or a small bug with a clear
reproduction. Do not invent product features. Do not write code.

Return ONLY a JSON array. Each item must have:
- title: a short issue title
- body: problem, evidence, expected behavior, acceptance criteria, out-of-scope
- evidence: file/line, command output, or reference
- suggestedRisk: low, medium, or high
- decisionIds: array of decision IDs or []

Return at most 3 items. If there is nothing worth proposing, return [].
"@

$job = Start-Job -ScriptBlock {
  param($Prompt, $Root)
  Set-Location $Root
  & opencode run --model deepseek-v4.1-flash-free --agent plan $Prompt
  if ($LASTEXITCODE -ne 0) { throw "opencode exited $LASTEXITCODE" }
} -ArgumentList $prompt, $RepoRoot

$finished = Wait-Job -Job $job -Timeout 1200
if (-not $finished) {
  Stop-Job -Job $job
  Remove-Job -Job $job
  throw 'Audit model timed out.'
}

$output = (Receive-Job -Job $job) -join "`n"
$jobState = $job.State
Remove-Job -Job $job
if ($jobState -ne 'Completed') { throw 'Audit model failed.' }

$match = [regex]::Match($output, '(?s)\[\s*.*\s*\]')
if (-not $match.Success) { throw 'Audit model did not return a JSON array.' }

$proposals = $match.Value | ConvertFrom-Json
if ($null -eq $proposals) { $proposals = @() }
if (@($proposals).Count -gt 3) { $proposals = @($proposals)[0..2] }

foreach ($proposal in @($proposals)) {
  if ([string]::IsNullOrWhiteSpace($proposal.title) -or [string]::IsNullOrWhiteSpace($proposal.body)) {
    Write-Host 'Skipping a malformed proposal.'
    continue
  }
  $body = @"
## Evidence

$($proposal.evidence)

## Proposal

$($proposal.body)

## Suggested risk

$($proposal.suggestedRisk)

## Decision IDs

$($proposal.decisionIds -join ', ')

---
Proposed by audit mode. A human must review, add a risk label, and promote to `loop:approved` before any code is written.
"@
  if ($DryRun) {
    Write-Host "Would propose: $($proposal.title)"
    continue
  }
  gh issue create --title $proposal.title --body $body --label loop:proposed
  if ($LASTEXITCODE -ne 0) { throw "Could not create proposal: $($proposal.title)" }
}

$status = git status --porcelain
if ($status) {
  throw 'Audit modified the working tree; resetting is forbidden because user work may be present. Review manually.'
}
Write-Host 'Audit complete.'
