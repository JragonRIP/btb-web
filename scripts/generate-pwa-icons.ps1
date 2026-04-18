$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$sizes = @(192, 512)
foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $g.Clear([System.Drawing.Color]::FromArgb(14, 14, 14))
  $rect = New-Object System.Drawing.RectangleF 0, 0, $s, $s
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, `
    ([System.Drawing.Color]::FromArgb(212, 175, 55)), `
    ([System.Drawing.Color]::FromArgb(120, 90, 20)), 45
  $pad = [int]($s * 0.12)
  $dia = [int]($s * 0.76)
  $g.FillEllipse($brush, $pad, $pad, $dia, $dia)
  $w = [Math]::Max(2, [int]($s / 48))
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(250, 250, 250)), $w
  $g.DrawEllipse($pen, $pad, $pad, $dia, $dia)
  $out = Join-Path $PSScriptRoot "..\public\icon-$s.png"
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}
Write-Host "Wrote PWA icons to public/"
