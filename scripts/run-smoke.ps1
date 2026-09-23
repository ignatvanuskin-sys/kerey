# Поднимает production-сервер, прогоняет smoke-тест и останавливает сервер.
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/run-smoke.ps1
#
# ВНИМАНИЕ: перед запуском удаляются все записи, уведомления и счётчики ограничений
# (услуги, настройки, отзывы и фото сохраняются). Не запускайте на рабочей базе.
$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $root 'data\server.log'

Push-Location $root
try {
  & npx tsx scripts/reset-test-data.ts 2>&1 | Out-Null
} finally {
  Pop-Location
}

$proc = Start-Process -FilePath 'node' `
  -ArgumentList 'node_modules/next/dist/bin/next', 'start', '-p', '3000' `
  -WorkingDirectory $root -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $log -RedirectStandardError ($log + '.err')

Start-Sleep -Seconds 10

try {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $root 'scripts\smoke.ps1') 2>&1 | Out-String -Width 200
}
finally {
  & taskkill.exe /PID $proc.Id /F /T 2>&1 | Out-Null
}
