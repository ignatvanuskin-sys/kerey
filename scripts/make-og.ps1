# Приводит исходный баннер к размеру Open Graph 1200×630 (без искажений: обрезка по центру).
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/make-og.ps1 -Source media-output\img-....png

param(
  [string]$Source = 'media-output\img-mudn9pnl-10fdbf12.png',
  [string]$Target = 'public\og.png',
  [int]$Width = 1200,
  [int]$Height = 630
)

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root $Source
$targetPath = Join-Path $root $Target

if (-not (Test-Path $sourcePath)) {
  Write-Error "Не найден исходник: $sourcePath"
  exit 1
}

$image = [System.Drawing.Image]::FromFile($sourcePath)
try {
  Write-Output ("Источник: " + $image.Width + "x" + $image.Height)

  # Обрезаем по центру до нужного соотношения, затем масштабируем.
  $targetRatio = $Width / $Height
  $sourceRatio = $image.Width / $image.Height

  if ($sourceRatio -gt $targetRatio) {
    $cropHeight = $image.Height
    $cropWidth = [int][Math]::Round($image.Height * $targetRatio)
  } else {
    $cropWidth = $image.Width
    $cropHeight = [int][Math]::Round($image.Width / $targetRatio)
  }
  $cropX = [int](($image.Width - $cropWidth) / 2)
  $cropY = [int](($image.Height - $cropHeight) / 2)

  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage(
      $image,
      (New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)),
      (New-Object System.Drawing.Rectangle($cropX, $cropY, $cropWidth, $cropHeight)),
      [System.Drawing.GraphicsUnit]::Pixel
    )
  } finally {
    $graphics.Dispose()
  }

  if ($targetPath.ToLower().EndsWith('.jpg') -or $targetPath.ToLower().EndsWith('.jpeg')) {
    # JPEG keeps the social preview light (~200 КБ вместо ~1,1 МБ у PNG).
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]88)
    $bitmap.Save($targetPath, $codec, $encoderParams)
  } else {
    $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }

  $bitmap.Dispose()
  Write-Output ("Сохранено: $Target (" + $Width + "x" + $Height + ")")
} finally {
  $image.Dispose()
}
