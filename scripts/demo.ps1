# Подготовка и запуск сайта для показа клиенту.
# Запуск: npm run demo
#
# Что делает: очищает заявки, собирает свежую версию, поднимает сервер на 3000
# и печатает адрес для телефона (клиент может открыть сайт на своём телефоне,
# если он в той же сети Wi-Fi). Остановить — Ctrl+C.

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8NoBom

Write-Host "`n=== Подготовка демонстрации ===" -ForegroundColor Cyan

if (-not (Test-Path '.env')) {
  Write-Host 'Создаю .env со случайным паролем...' -ForegroundColor Yellow
  & npm run env:init | Out-Null
}

Write-Host '1/3 Очищаю список заявок...' -ForegroundColor Gray
& npm run reset | Out-Null

Write-Host '2/3 Собираю свежую версию сайта...' -ForegroundColor Gray
& npm run build 2>&1 | Select-String -Pattern 'Compiled successfully|error' | ForEach-Object { "    $_" }

$password = (Get-Content '.env' | Where-Object { $_ -match '^ADMIN_PASSWORD=' }) -replace '^ADMIN_PASSWORD=', ''
# Адрес для телефона: берём только домашние/офисные сети (192.168/10/172.16-31),
# иначе можно случайно показать адрес VPN- или виртуального адаптера.
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -match '^192\.168\.' -or
    $_.IPAddress -match '^10\.' -or
    $_.IPAddress -match '^172\.(1[6-9]|2\d|3[01])\.'
  } |
  Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host "`n=== Готово к показу ===" -ForegroundColor Green
Write-Host "  Сайт на этом компьютере:  http://localhost:3000"
if ($lanIp) {
  Write-Host "  Сайт для телефона клиента: http://${lanIp}:3000  (та же сеть Wi-Fi)" -ForegroundColor Yellow
}
Write-Host "  Панель заявок:            http://localhost:3000/admin"
Write-Host "  Пароль панели:            $password"
Write-Host ''
Write-Host '  Сценарий показа:' -ForegroundColor Cyan
Write-Host '   1. Откройте сайт на телефоне — покажите первый экран, услуги, отзывы, карту.'
Write-Host '   2. Нажмите «Записаться онлайн» и пройдите 5 шагов (это ~40 секунд).'
Write-Host '   3. Откройте http://localhost:3000/admin — заявка уже в списке.'
Write-Host '   4. Поменяйте статус заявки — так владелец будет отмечать работу.'
Write-Host '   5. Покажите раздел «Услуги»: цены и названия правятся без программиста.'
Write-Host ''
Write-Host '  Остановить сервер: Ctrl+C' -ForegroundColor Gray
Write-Host ''

& node node_modules/next/dist/bin/next start -p 3000
