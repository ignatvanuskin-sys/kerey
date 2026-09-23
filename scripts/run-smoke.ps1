# Поднимает собранный сайт, прогоняет проверки и останавливает сервер.
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/run-smoke.ps1
$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $root 'data\server.log'

if (-not (Test-Path (Join-Path $root 'data'))) { New-Item -ItemType Directory -Force -Path (Join-Path $root 'data') | Out-Null }

$proc = Start-Process -FilePath 'node' `
  -ArgumentList 'node_modules/next/dist/bin/next', 'start', '-p', '3000' `
  -WorkingDirectory $root -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $log -RedirectStandardError ($log + '.err')

Start-Sleep -Seconds 9

try {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $root 'scripts\smoke.ps1') 2>&1 | Out-String -Width 200
}
finally {
  & taskkill.exe /PID $proc.Id /F /T 2>&1 | Out-Null
}
