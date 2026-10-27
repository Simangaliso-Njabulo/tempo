$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$commands = @(
  @{ Name = 'verify'; Command = { npm run verify } },
  @{ Name = 'e2e'; Command = { npm run test:e2e -- --project=webkit-iphone } },
  @{ Name = 'a11y'; Command = { npm run test:a11y -- --project=webkit-iphone } },
  @{ Name = 'visual'; Command = { npm run test:visual -- --project=webkit-iphone } },
  @{ Name = 'lighthouse'; Command = { npm run lighthouse } }
)

foreach ($check in $commands) {
  Write-Host "== $($check.Name) =="
  & $check.Command
  if ($LASTEXITCODE -ne 0) { throw "$($check.Name) failed." }
}

$status = git status --porcelain
if ($status) { throw 'Release check changed the working tree; review before tagging.' }

Write-Host 'Release check passed. No tag was created.'
