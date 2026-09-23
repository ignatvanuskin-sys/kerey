# Готовит изображения сайта из исходников в media-output:
# обрезка по центру под нужное соотношение, ресайз и сжатие в JPEG.
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/make-images.ps1

param(
  [string]$Source = 'media-output',
  [string]$Target = 'public\images'
)

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $root $Source
$targetDir = Join-Path $root $Target

if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }

# исходник -> имя файла, ширина, высота
$jobs = @(
  # Фон первого экрана лежит под тёмным градиентом и полупрозрачный,
  # поэтому сжимаем его заметно — на глаз это не видно, а LCP на телефоне быстрее.
  @{ src = 'img-mudq224x-bd4e8250.png'; out = 'hero.jpg';                  w = 1600; h = 900 },
  @{ src = 'img-mudq224x-bd4e8250.png'; out = 'hero-mobile.jpg';           w = 720;  h = 405 },
  @{ src = 'img-mudq224x-bd4e8250.png'; out = 'og.jpg';                    w = 1200; h = 630 },
  @{ src = 'img-mudq27o7-d82e32f6.png'; out = 'gallery-service-bay.jpg';   w = 1000; h = 750 },
  @{ src = 'img-mudq1wje-5908924c.png'; out = 'gallery-diagnostics.jpg';   w = 1000; h = 750 },
  @{ src = 'img-mudq2ccf-be237643.png'; out = 'gallery-suspension.jpg';    w = 1000; h = 750 },
  @{ src = 'img-mudq3htq-3542a225.png'; out = 'gallery-tools.jpg';         w = 1000; h = 750 },
  @{ src = 'img-mudq2vd2-1bb05af3.png'; out = 'gallery-wheel.jpg';         w = 1000; h = 750 },
  @{ src = 'img-mudq39sm-6c18a69b.png'; out = 'gallery-night.jpg';         w = 1000; h = 750 }
)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

foreach ($job in $jobs) {
  $srcPath = Join-Path $sourceDir $job.src
  if (-not (Test-Path $srcPath)) { Write-Host ("нет исходника: " + $job.src) -ForegroundColor Yellow; continue }

  $image = [System.Drawing.Image]::FromFile($srcPath)
  try {
    $targetRatio = $job.w / $job.h
    $sourceRatio = $image.Width / $image.Height

    if ($sourceRatio -gt $targetRatio) {
      $cropH = $image.Height
      $cropW = [int][Math]::Round($image.Height * $targetRatio)
    } else {
      $cropW = $image.Width
      $cropH = [int][Math]::Round($image.Width / $targetRatio)
    }
    $cropX = [int](($image.Width - $cropW) / 2)
    $cropY = [int](($image.Height - $cropH) / 2)

    $bitmap = New-Object System.Drawing.Bitmap($job.w, $job.h)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.DrawImage(
        $image,
        (New-Object System.Drawing.Rectangle(0, 0, $job.w, $job.h)),
        (New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)),
        [System.Drawing.GraphicsUnit]::Pixel
      )
    } finally { $graphics.Dispose() }

    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]84)
    $outPath = Join-Path $targetDir $job.out
    $bitmap.Save($outPath, $codec, $params)
    $bitmap.Dispose()

    $size = [Math]::Round((Get-Item $outPath).Length / 1KB)
    Write-Host ("{0} -> {1}x{2}, {3} КБ" -f $job.out, $job.w, $job.h, $size) -ForegroundColor Green
  } finally { $image.Dispose() }
}

Write-Host "`nГотово. Файлы в $Target"
