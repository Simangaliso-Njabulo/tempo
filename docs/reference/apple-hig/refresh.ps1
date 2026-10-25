# Refresh the local Apple Human Interface Guidelines snapshots.
# Usage (from the repository root):
#   pwsh docs/reference/apple-hig/refresh.ps1

$ErrorActionPreference = "Stop"

$pages = @(
    "accessibility",
    "alerts",
    "buttons",
    "color",
    "context-menus",
    "dark-mode",
    "designing-for-ios",
    "drag-and-drop",
    "entering-data",
    "feedback",
    "gestures",
    "inclusion",
    "layout",
    "lists-and-tables",
    "loading",
    "modality",
    "motion",
    "notifications",
    "offering-help",
    "onboarding",
    "privacy",
    "progress-indicators",
    "scroll-views",
    "searching",
    "segmented-controls",
    "settings",
    "sheets",
    "steppers",
    "tab-bars",
    "text-fields",
    "toggles",
    "toolbars",
    "typography",
    "undo-and-redo",
    "virtual-keyboards",
    "writing"
)

$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$baseUrl = "https://developer.apple.com/design/human-interface-guidelines"

foreach ($page in $pages) {
    $url = "$baseUrl/$page.md"
    $outFile = Join-Path $outDir "$page.md"
    Write-Host "Fetching $page..."
    & curl.exe -sS $url -o $outFile
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to fetch $url"
    }
}

Write-Host "Refreshed $($pages.Count) Apple HIG snapshots in $outDir"
