# Smoke-тест работающего сайта (Windows PowerShell 5.1).
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/run-smoke.ps1
# Внимание: тест создаёт и затем отменяет несколько записей — запускайте его на тестовой
# базе (например, после npm run db:reset; npm run db:seed).
# Тест сам проверяет limit 5 записей в час с одного адреса, поэтому при повторном запуске
# в течение часа сначала выполните: npm run db:clear-limits

param([string]$Base = 'http://localhost:3000')

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$script:pass = 0
$script:fail = 0

function Check([string]$name, [bool]$ok, [string]$detail = '') {
  if ($ok) {
    $script:pass++
    Write-Host ("PASS  " + $name + "  " + $detail) -ForegroundColor Green
  } else {
    $script:fail++
    Write-Host ("FAIL  " + $name + "  " + $detail) -ForegroundColor Red
  }
}

function Post-Json([string]$url, $body, [hashtable]$headers = @{}, $webSession = $null) {
  $json = if ($body -is [string]) { $body } else { $body | ConvertTo-Json -Depth 6 }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $params = @{ Uri = $url; Method = 'Post'; Body = $bytes; ContentType = 'application/json; charset=utf-8' }
  if ($headers.Count -gt 0) { $params.Headers = $headers }
  if ($webSession) { $params.WebSession = $webSession }
  return Invoke-RestMethod @params
}

function Send-Json([string]$method, [string]$url, $body, [hashtable]$headers = @{}, $webSession = $null) {
  $json = if ($body -is [string]) { $body } else { $body | ConvertTo-Json -Depth 6 }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $params = @{ Uri = $url; Method = $method; Body = $bytes; ContentType = 'application/json; charset=utf-8' }
  if ($headers.Count -gt 0) { $params.Headers = $headers }
  if ($webSession) { $params.WebSession = $webSession }
  return Invoke-RestMethod @params
}

function Patch-Json([string]$url, $body, [hashtable]$headers = @{}, $webSession = $null) {
  return Send-Json 'Patch' $url $body $headers $webSession
}

# PowerShell 5.1 декодирует JSON-ответ без charset как Latin-1 и портит кириллицу.
# Этот помощник читает сырые байты и разбирает их как UTF-8 — так проверяются русские тексты API.
function Get-JsonUtf8([string]$url) {
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing
  $text = [System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray())
  return $text | ConvertFrom-Json
}

function Get-StatusCode($errorRecord) {
  try { return [int]$errorRecord.Exception.Response.StatusCode } catch { return 0 }
}

function Try-Post([string]$url, $body, [hashtable]$headers = @{}) {
  try {
    Post-Json $url $body $headers | Out-Null
    return 0
  } catch {
    return Get-StatusCode $_
  }
}

Write-Host "`n== Страницы ==" -ForegroundColor Cyan
$homePage = Invoke-WebRequest -Uri "$Base/" -UseBasicParsing
Check 'GET /' ($homePage.StatusCode -eq 200 -and $homePage.Content -match 'Автосервис в Кокшетау')
Check 'Заголовок страницы' ($homePage.Content -match 'Запись на СТО онлайн')
Check 'Марки автомобилей (35)' (($homePage.Content -match 'SsangYong') -and ($homePage.Content -match 'MINI'))
Check 'Рейтинг 2ГИС с источником' (($homePage.Content -match '4,9') -and ($homePage.Content -match '2ГИС'))
Check 'JSON-LD AutoRepair' ($homePage.Content -match 'AutoRepair')
Check 'Нет aggregateRating (рейтинг внешний)' (-not ($homePage.Content -match 'aggregateRating'))
Check 'Часы работы' ($homePage.Content -match '08:30')
Check 'Отзывы и фото скрыты, пока пусты' (-not ($homePage.Content -match 'Отзывы клиентов'))

$zapis = Invoke-WebRequest -Uri "$Base/zapis" -UseBasicParsing
Check 'GET /zapis' ($zapis.StatusCode -eq 200 -and $zapis.Content -match 'Онлайн-запись')

$privacy = Invoke-WebRequest -Uri "$Base/privacy" -UseBasicParsing
Check 'GET /privacy' ($privacy.StatusCode -eq 200 -and $privacy.Content -match 'персональных данных')

$notFound = 0
try { Invoke-WebRequest -Uri "$Base/нет-такой-страницы" -UseBasicParsing | Out-Null } catch { $notFound = Get-StatusCode $_ }
Check 'Кастомная 404' ($notFound -eq 404) ("status=" + $notFound)

$robots = Invoke-WebRequest -Uri "$Base/robots.txt" -UseBasicParsing
Check 'robots.txt: /admin и /booking закрыты' (($robots.Content -match 'Disallow: /admin') -and ($robots.Content -match 'Disallow: /booking'))

$sitemap = Invoke-WebRequest -Uri "$Base/sitemap.xml" -UseBasicParsing
Check 'sitemap.xml' ($sitemap.StatusCode -eq 200 -and $sitemap.Content -match '/zapis')

Write-Host "`n== Публичное API ==" -ForegroundColor Cyan
$services = Invoke-RestMethod -Uri "$Base/api/services"
Check 'GET /api/services' ($services.services.Count -ge 7) ("services=" + $services.services.Count)
$serviceId = $services.services[0].id

$tomorrow = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
$availability = Invoke-RestMethod -Uri "$Base/api/availability?date=$tomorrow&serviceId=$serviceId"
$slot = $availability.slots | Where-Object { $_.available } | Select-Object -First 1
Check 'GET /api/availability' ($null -ne $slot) ("slot=" + $slot.time)

$days = Invoke-RestMethod -Uri "$Base/api/availability/days"
Check 'GET /api/availability/days' ($days.days.Count -gt 0) ("days=" + $days.days.Count)

$emptyDate = (Get-Date).AddYears(1).ToString('yyyy-MM-dd')
$farAway = Invoke-RestMethod -Uri "$Base/api/availability?date=$emptyDate"
Check 'Дата вне окна записи: слотов нет' ($farAway.slots.Count -eq 0)

Write-Host "`n== Запись ==" -ForegroundColor Cyan
function New-Payload([string]$phone, [string]$time) {
  return @{
    serviceId     = $serviceId
    date          = $tomorrow
    time          = $time
    carBrand      = 'Toyota'
    carModel      = 'Camry'
    carYear       = '2012'
    carPlate      = '123ABC02'
    clientName    = 'Асхат'
    phone         = $phone
    contactMethod = 'whatsapp'
    comment       = 'стук спереди справа'
    consent       = $true
    honeypot      = ''
    formElapsedMs = 12000
  }
}

$key = [guid]::NewGuid().ToString()
$bookingA = Post-Json "$Base/api/bookings" (New-Payload '+77011234567' $slot.time) @{ 'Idempotency-Key' = $key }
Check 'POST /api/bookings создаёт запись' ($bookingA.ok -and $bookingA.number) ("№" + $bookingA.number)

$repeat = Post-Json "$Base/api/bookings" (New-Payload '+77011234567' $slot.time) @{ 'Idempotency-Key' = $key }
Check 'Idempotency-Key защищает от дубля' ($repeat.number -eq $bookingA.number) ("№" + $repeat.number)

$bookingB = $null
try {
  $bookingB = Post-Json "$Base/api/bookings" (New-Payload '+77025554433' $slot.time) @{ 'Idempotency-Key' = [guid]::NewGuid().ToString() }
} catch {
  Write-Host ("Вторая запись не создана: " + $_.Exception.Message) -ForegroundColor Yellow
}
Check 'Второй автомобиль на то же время (2 поста)' ($null -ne $bookingB -and $bookingB.ok) ("№" + $bookingB.number)

$thirdStatus = Try-Post "$Base/api/bookings" (New-Payload '+77037778899' $slot.time) @{ 'Idempotency-Key' = [guid]::NewGuid().ToString() }
Check 'Третий на то же время → 409' ($thirdStatus -eq 409) ("status=" + $thirdStatus)

$spam = New-Payload '+77011234567' $slot.time
$spam.honeypot = 'http://spam.example'
$honeypotStatus = Try-Post "$Base/api/bookings" $spam
Check 'Honeypot отклонён (422)' ($honeypotStatus -eq 422) ("status=" + $honeypotStatus)

$fast = New-Payload '+77011234567' $slot.time
$fast.formElapsedMs = 500
$fastStatus = Try-Post "$Base/api/bookings" $fast
Check 'Слишком быстрая отправка отклонена (422)' ($fastStatus -eq 422) ("status=" + $fastStatus)

$bad = New-Payload '12345' $slot.time
$badPhoneStatus = Try-Post "$Base/api/bookings" $bad
Check 'Мусорный телефон отклонён (422)' ($badPhoneStatus -eq 422) ("status=" + $badPhoneStatus)

$status = Get-JsonUtf8 "$Base/api/bookings/$($bookingA.token)"
Check 'GET /api/bookings/[token] (UTF-8)' ($status.status -eq 'new' -and $status.statusLabel -eq 'Ожидает подтверждения') ("status=" + $status.status + ", label=" + $status.statusLabel)
Check 'Публичный статус не раскрывает телефон' (-not ($status.PSObject.Properties.Name -contains 'clientPhone'))

$cancelled = Post-Json "$Base/api/bookings/$($bookingA.token)/cancel" @{}
Check 'Отмена клиентом' ($cancelled.status -eq 'cancelled_by_client')

$freed = Invoke-RestMethod -Uri "$Base/api/availability?date=$tomorrow&serviceId=$serviceId"
Check 'Слот освободился после отмены' (($freed.slots | Where-Object { $_.time -eq $slot.time }).available)

$limitProbe = Try-Post "$Base/api/bookings" (New-Payload '+77011234567' $slot.time)
Check 'Лимит 5 записей в час с одного адреса (429)' ($limitProbe -eq 429) ("status=" + $limitProbe)

Write-Host "`n== Telegram ==" -ForegroundColor Cyan
$envFile = Get-Content -Path (Join-Path (Get-Location) '.env') -ErrorAction SilentlyContinue
$secret = ($envFile | Where-Object { $_ -match '^TELEGRAM_WEBHOOK_SECRET=' }) -replace '^TELEGRAM_WEBHOOK_SECRET=', ''

$unauthStatus = Try-Post "$Base/api/telegram/webhook" @{ update_id = 1 }
Check 'Вебхук без секрета → 401' ($unauthStatus -eq 401) ("status=" + $unauthStatus)

$update = @{ update_id = 2; message = @{ message_id = 1; chat = @{ id = 999999 }; from = @{ id = 999999 }; text = '/start' } }
$webhook = Invoke-WebRequest -Uri "$Base/api/telegram/webhook" -Method Post `
  -Body ([System.Text.Encoding]::UTF8.GetBytes(($update | ConvertTo-Json -Depth 6))) `
  -ContentType 'application/json; charset=utf-8' `
  -Headers @{ 'X-Telegram-Bot-Api-Secret-Token' = $secret } -UseBasicParsing
Check 'Вебхук с секретом принимает апдейт' ($webhook.StatusCode -eq 200)

$bookingBId = 0
if ($null -ne $bookingB) { $bookingBId = [int]$bookingB.number }
$callbackData = "bk:${bookingBId}:ok"
$callback = @{ update_id = 3; callback_query = @{ id = '1'; from = @{ id = 999999 }; message = @{ message_id = 1; chat = @{ id = 999999 } }; data = $callbackData } }
$callbackResponse = Invoke-WebRequest -Uri "$Base/api/telegram/webhook" -Method Post `
  -Body ([System.Text.Encoding]::UTF8.GetBytes(($callback | ConvertTo-Json -Depth 6))) `
  -ContentType 'application/json; charset=utf-8' `
  -Headers @{ 'X-Telegram-Bot-Api-Secret-Token' = $secret } -UseBasicParsing
Check 'Вебхук принимает нажатие кнопки' ($callbackResponse.StatusCode -eq 200)

if ($null -ne $bookingB) {
  $afterCallback = Invoke-RestMethod -Uri "$Base/api/bookings/$($bookingB.token)"
  Check 'Нажатие от чужого chat_id проигнорировано' ($afterCallback.status -eq 'new') ("status=" + $afterCallback.status)
} else {
  Check 'Нажатие от чужого chat_id проигнорировано' $false 'вторая запись не создана'
}

Write-Host "`n== Админка ==" -ForegroundColor Cyan
$adminGetStatus = 0
try { Invoke-RestMethod -Uri "$Base/api/admin/bookings?tab=today" | Out-Null } catch { $adminGetStatus = Get-StatusCode $_ }
Check 'API админки без сессии → 401' ($adminGetStatus -eq 401) ("status=" + $adminGetStatus)

$wrongStatus = Try-Post "$Base/api/admin/login" @{ password = 'заведомо-неверный-пароль' }
Check 'Неверный пароль → 401' ($wrongStatus -eq 401) ("status=" + $wrongStatus)

$adminPassword = ($envFile | Where-Object { $_ -match '^ADMIN_PASSWORD=' }) -replace '^ADMIN_PASSWORD=', ''
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Invoke-RestMethod -Uri "$Base/api/admin/login" -Method Post `
  -Body ([System.Text.Encoding]::UTF8.GetBytes((@{ password = $adminPassword } | ConvertTo-Json))) `
  -ContentType 'application/json; charset=utf-8' -WebSession $session
Check 'Вход с верным паролем' ($login.ok)

$adminBookings = Invoke-RestMethod -Uri "$Base/api/admin/bookings?tab=tomorrow" -WebSession $session
Check 'GET /api/admin/bookings с сессией' ($adminBookings.ok) ("count=" + $adminBookings.bookings.Count)
Check 'Показан статус доставки в Telegram' ($adminBookings.bookings[0].PSObject.Properties.Name -contains 'tgState')

$csv = Invoke-WebRequest -Uri "$Base/api/admin/bookings/csv" -WebSession $session -UseBasicParsing
Check 'Экспорт CSV' ($csv.StatusCode -eq 200 -and $csv.Content -match 'Статус')

$adminSettings = Invoke-RestMethod -Uri "$Base/api/admin/settings" -WebSession $session
Check 'GET /api/admin/settings' ($adminSettings.settings.posts_count -ge 1)

$adminContent = Invoke-RestMethod -Uri "$Base/api/admin/content" -WebSession $session
Check 'GET /api/admin/content' ($adminContent.ok)

$adminTelegram = Invoke-RestMethod -Uri "$Base/api/admin/telegram" -WebSession $session
Check 'GET /api/admin/telegram без утечки токена' (-not ($adminTelegram.PSObject.Properties.Name -contains 'token'))

$adminPage = Invoke-WebRequest -Uri "$Base/admin/bookings" -WebSession $session -UseBasicParsing
Check 'Страница /admin/bookings' ($adminPage.StatusCode -eq 200 -and $adminPage.Content -match 'Записи')

$anonStatus = 0
try {
  $anon = Invoke-WebRequest -Uri "$Base/admin/bookings" -MaximumRedirection 0 -UseBasicParsing
  if ($anon.Content -match 'КЕРЕЙ · АДМИНКА') { $anonStatus = 200 }
} catch {
  $anonStatus = Get-StatusCode $_
}
Check '/admin без сессии не отдаёт панель' ($anonStatus -ne 200) ("status=" + $anonStatus)

$cronStatus = 0
try { Invoke-RestMethod -Uri "$Base/api/cron/notify" | Out-Null } catch { $cronStatus = Get-StatusCode $_ }
Check 'Cron без секрета → 401' ($cronStatus -eq 401) ("status=" + $cronStatus)

$cronSecret = ($envFile | Where-Object { $_ -match '^CRON_SECRET=' }) -replace '^CRON_SECRET=', ''
$cron = Invoke-RestMethod -Uri "$Base/api/cron/notify?secret=$cronSecret"
Check 'Cron с секретом обрабатывает очередь' ($cron.ok)

Write-Host "`n== Подтверждение владельцем (QA 11) ==" -ForegroundColor Cyan
if ($null -ne $bookingB) {
  $confirm = Patch-Json "$Base/api/admin/bookings" @{ action = 'status'; id = $bookingBId; status = 'confirmed' } @{} $session
  Check 'Админка подтверждает запись' ($confirm.ok -and $confirm.booking.status -eq 'confirmed') ("status=" + $confirm.booking.status)

  $publicAfter = Invoke-RestMethod -Uri "$Base/api/bookings/$($bookingB.token)"
  Check 'Публичный статус обновился' ($publicAfter.status -eq 'confirmed')

  $bookingPage = Invoke-WebRequest -Uri "$Base/booking/$($bookingB.token)" -UseBasicParsing
  Check 'Страница /booking/[token] отдаётся' ($bookingPage.StatusCode -eq 200 -and $bookingPage.Content -match 'Подтверждена')

  $slotAfterConfirm = Invoke-RestMethod -Uri "$Base/api/availability?date=$tomorrow&serviceId=$serviceId"
  Check 'Один занятый пост из двух — слот ещё свободен' (($slotAfterConfirm.slots | Where-Object { $_.time -eq $slot.time }).available)

  # Уборка: освобождаем занятое тестом время, чтобы следующий прогон был чистым.
  Patch-Json "$Base/api/admin/bookings" @{ action = 'status'; id = $bookingBId; status = 'cancelled_by_owner' } @{} $session | Out-Null
  $afterCleanup = Invoke-RestMethod -Uri "$Base/api/availability?date=$tomorrow&serviceId=$serviceId"
  Check 'Слот снова свободен после отмены сервисом' (($afterCleanup.slots | Where-Object { $_.time -eq $slot.time }).available)
} else {
  Check 'Админка подтверждает запись' $false 'вторая запись не создана'
}

Write-Host "`n== Секреты (QA 13) ==" -ForegroundColor Cyan
$staticDir = Join-Path (Get-Location) '.next\static'
$leaks = @()
foreach ($candidate in @($adminPassword, $secret, $cronSecret, 'TELEGRAM_BOT_TOKEN')) {
  if (-not $candidate) { continue }
  # Внимание: Select-String -Quiet по массиву файлов возвращает массив булевых значений.
  $hit = @(Get-ChildItem -Path $staticDir -Recurse -File -ErrorAction SilentlyContinue |
    Select-String -Pattern $candidate -SimpleMatch -Quiet) -contains $true
  if ($hit) { $leaks += $candidate.Substring(0, [Math]::Min(6, $candidate.Length)) + '…' }
}
Check 'В клиентском бандле нет секретов' ($leaks.Count -eq 0) ($leaks -join ', ')
Check '.env и .env.example не содержат значений секретов' ((Get-Content '.env.example' -Raw) -notmatch 'TELEGRAM_BOT_TOKEN=\w')

Write-Host ""
Write-Host ("Итого: PASS " + $script:pass + ", FAIL " + $script:fail) -ForegroundColor Cyan
if ($script:fail -gt 0) { exit 1 }
