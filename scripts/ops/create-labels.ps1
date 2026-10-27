$ErrorActionPreference = 'Stop'

$labels = @(
  @{ Name = 'loop:approved'; Color = '1D76DB'; Description = 'Human-approved work for the low-risk loop' },
  @{ Name = 'loop:proposed'; Color = '5319E7'; Description = 'Audit proposal; a human must approve it' },
  @{ Name = 'loop:pr'; Color = '0E8A16'; Description = 'A pull request opened by the loop' },
  @{ Name = 'loop:blocked'; Color = 'B60205'; Description = 'The loop is blocked or its circuit breaker is open' },
  @{ Name = 'risk:low'; Color = 'C2E0C6'; Description = 'Eligible for auto-merge on green CI' },
  @{ Name = 'risk:medium'; Color = 'FEF2C0'; Description = 'Human review required' },
  @{ Name = 'risk:high'; Color = 'F9D0C4'; Description = 'Human review always; no auto-merge' },
  @{ Name = 'security:drift'; Color = 'D93F0B'; Description = 'Security posture drifted from policy; loop paused' },
  @{ Name = 'loop:paused'; Color = 'B60205'; Description = 'Stop the loop until a human clears this' },
  @{ Name = 'dependencies'; Color = '0366D6'; Description = 'Dependency or supply-chain change' },
  @{ Name = 'security'; Color = 'D93F0B'; Description = 'Security-sensitive change' }
)

foreach ($label in $labels) {
  gh label create $label.Name --color $label.Color --description $label.Description --force
  if ($LASTEXITCODE -ne 0) { throw "Could not create label $($label.Name)" }
}

Write-Host 'Labels are ready.'
