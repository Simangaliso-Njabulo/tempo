$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force -Path $out | Out-Null

function New-TempoIcon {
  param(
    [int]$Size,
    [string]$Name,
    [double]$DotScale = 0.48
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#05070C'))

  $dot = [int]($Size * $DotScale)
  $offset = [int](($Size - $dot) / 2)
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#7B5CFF'))
  $graphics.FillEllipse($brush, $offset, $offset, $dot, $dot)

  $bitmap.Save((Join-Path $out $Name), [System.Drawing.Imaging.ImageFormat]::Png)
  $brush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-TempoIcon -Size 192 -Name 'icon-192.png'
New-TempoIcon -Size 512 -Name 'icon-512.png'
New-TempoIcon -Size 1024 -Name 'icon-1024.png'
New-TempoIcon -Size 180 -Name 'apple-touch-icon.png'
New-TempoIcon -Size 512 -Name 'icon-maskable-512.png' -DotScale 0.34
