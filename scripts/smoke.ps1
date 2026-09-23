# Проверка работающего сайта: страницы, запись, панель заявок.
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/run-smoke.ps1
# Внимание: тест создаёт одну реальную заявку в хранилище — после него выполните npm run reset.

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

function Get-Json([string]$url, $session = $null) {
  $params = @{ Uri = $url; UseBasicParsing = $true }
  if ($session) { $params.WebSession = $session }
  $response = Invoke-WebRequest @params
  $text = [System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray())
  return $text | ConvertFrom-Json
}

function Send-Json([string]$method, [string]$url, $body, [hashtable]$headers = @{}, $session = $null) {
  $json = if ($body -is [string]) { $body } else { $body | ConvertTo-Json -Depth 6 }
  $params = @{
    Uri         = $url
    Method      = $method
    Body        = [System.Text.Encoding]::UTF8.GetBytes($json)
    ContentType = 'application/json; charset=utf-8'
    UseBasicParsing = $true
  }
  if ($headers.Count -gt 0) { $params.Headers = $headers }
  if ($session) { $params.WebSession = $session }
  return Invoke-WebRequest @params
}

function Get-Status($errorRecord) {
  try { return [int]$errorRecord.Exception.Response.StatusCode } catch { return 0 }
}

function Try-Send([string]$method, [string]$url, $body, [hashtable]$headers = @{}, $session = $null) {
  try {
    Send-Json $method $url $body $headers $session | Out-Null
    return 0
  } catch {
    return Get-Status $_
  }
}

Write-Host "`n== Главная страница ==" -ForegroundColor Cyan
# Внимание: $home — зарезервированная переменная PowerShell, использовать её нельзя.
$homePage = Invoke-WebRequest -Uri "$Base/" -UseBasicParsing
$html = $homePage.Content
Check 'GET / отдаётся' ($homePage.StatusCode -eq 200)
Check 'Заголовок H1 про ходовую и двигатель' ($html -match 'ходовой' -and $html -match 'записью онлайн')
Check 'Рейтинг 2ГИС и число оценок' ($html -match '4,9' -and $html -match '201')
Check 'Адрес и часы работы' ($html -match 'Шокана Уалиханова, 94' -and $html -match '08:30')
Check 'Услуги из рубрик 2ГИС' (($html -match 'Ремонт ходовой части') -and ($html -match 'Развал-схождение'))
Check 'Нет выдуманных цен' ($html -notmatch 'от \d[\d\s]*₸')
Check 'Отзывы из 2ГИС с критическими' (($html -match 'Жандос Казбеков') -and ($html -match 'Сауле Инар'))
Check 'Способы оплаты из карточки' ($html -match 'Оплата по QR-коду')
Check 'Марки автомобилей' (($html -match 'SsangYong') -and ($html -match 'Mercedes-Benz'))
Check 'Разметка LocalBusiness' ($html -match 'AutoRepair')
Check 'Нет aggregateRating (рейтинг внешний)' ($html -notmatch 'aggregateRating')
Check 'Телефон из карточки' ($html -match '705 206 21 64')
Check 'Панель записи встроена в страницу' ($html -match 'Записаться онлайн')

$bookingPage = Invoke-WebRequest -Uri "$Base/booking" -UseBasicParsing
Check 'GET /booking' ($bookingPage.StatusCode -eq 200 -and $bookingPage.Content -match 'Записаться в')

$privacy = Invoke-WebRequest -Uri "$Base/privacy" -UseBasicParsing
Check 'GET /privacy' ($privacy.StatusCode -eq 200 -and $privacy.Content -match 'персональных данных')

$notFound = 0
try { Invoke-WebRequest -Uri "$Base/нет-такой-страницы" -UseBasicParsing | Out-Null } catch { $notFound = Get-Status $_ }
Check 'Кастомная 404' ($notFound -eq 404) ("status=" + $notFound)

$robots = Invoke-WebRequest -Uri "$Base/robots.txt" -UseBasicParsing
Check 'robots.txt закрывает /admin' ($robots.Content -match 'Disallow: /admin')
$sitemap = Invoke-WebRequest -Uri "$Base/sitemap.xml" -UseBasicParsing
Check 'sitemap.xml' ($sitemap.StatusCode -eq 200 -and $sitemap.Content -match '/booking')
$manifest = Invoke-WebRequest -Uri "$Base/manifest.webmanifest" -UseBasicParsing
Check 'manifest.webmanifest' ($manifest.StatusCode -eq 200)

# Картинка для соцсетей: путь в метаданных должен совпадать с реальным файлом.
if ($html -match 'property="og:image" content="([^"]+)"') {
  $ogPath = $Matches[1] -replace '^https?://[^/]+', ''
  $og = 0
  try { $og = (Invoke-WebRequest -Uri "$Base$ogPath" -UseBasicParsing).StatusCode } catch { $og = Get-Status $_ }
  Check 'og:image отдаётся по указанному пути' ($og -eq 200) ($ogPath + " -> " + $og)
} else {
  Check 'og:image отдаётся по указанному пути' $false 'в разметке нет og:image'
}

Write-Host "`n== Доступное время ==" -ForegroundColor Cyan
$days = Get-Json "$Base/api/availability"
Check 'GET /api/availability (дни)' ($days.days.Count -gt 0) ("дней=" + $days.days.Count)

$freeDay = ($days.days | Where-Object { $_.hasFreeSlots } | Select-Object -First 1).date
$slots = Get-Json "$Base/api/availability?date=$freeDay&service=suspension"
$freeSlot = ($slots.slots | Where-Object { $_.available } | Select-Object -First 1).time
Check 'GET /api/availability (слоты)' ($null -ne $freeSlot) ("дата=$freeDay время=$freeSlot")

$outOfRange = Get-Json "$Base/api/availability?date=2030-01-01&service=suspension"
Check 'Дата вне горизонта записи: слотов нет' ($outOfRange.slots.Count -eq 0)

Write-Host "`n== Оформление заявки ==" -ForegroundColor Cyan
function New-Booking([hashtable]$override = @{}) {
  $body = @{
    serviceSlug = 'suspension'
    date        = $freeDay
    time        = $freeSlot
    carBrand    = 'Toyota'
    carModel    = 'Camry'
    carYear     = '2012'
    carPlate    = '123ABC02'
    name        = 'Тестовая Заявка'
    phone       = '+7 (705) 111-22-33'
    comment     = 'Проверка формы записи'
    consent     = $true
    trap        = ''
    elapsedMs   = 9000
    utm         = @{ source = '2gis' }
  }
  foreach ($key in $override.Keys) { $body[$key] = $override[$key] }
  return $body
}

$created = Send-Json 'Post' "$Base/api/bookings" (New-Booking)
$createdJson = [System.Text.Encoding]::UTF8.GetString($created.RawContentStream.ToArray()) | ConvertFrom-Json
Check 'POST /api/bookings создаёт заявку' ($created.StatusCode -eq 201 -and $createdJson.booking.number -gt 0) ("номер №" + $createdJson.booking.number)
Check 'Заявка сохранена без уведомления (Telegram не настроен)' ($null -ne $createdJson.booking.date)

$takenStatus = Try-Send 'Post' "$Base/api/bookings" (New-Booking @{ phone = '+7 (705) 222-33-44' })
Check 'Повтор на занятое время → 409' ($takenStatus -eq 409) ("status=" + $takenStatus)

$badPhone = Try-Send 'Post' "$Base/api/bookings" (New-Booking @{ time = '20:00'; phone = '12345' })
Check 'Мусорный телефон → 422' ($badPhone -eq 422) ("status=" + $badPhone)

$noConsent = Try-Send 'Post' "$Base/api/bookings" (New-Booking @{ time = '20:00'; consent = $false })
Check 'Без согласия на обработку данных → 422' ($noConsent -eq 422) ("status=" + $noConsent)

$bot = Try-Send 'Post' "$Base/api/bookings" (New-Booking @{ time = '20:00'; trap = 'spam.example' })
Check 'Скрытое поле-приманка → 422' ($bot -eq 422) ("status=" + $bot)

$emptyName = Try-Send 'Post' "$Base/api/bookings" (New-Booking @{ time = '20:00'; name = '' })
Check 'Пустое имя → 422' ($emptyName -eq 422) ("status=" + $emptyName)

Write-Host "`n== Панель заявок ==" -ForegroundColor Cyan
$noAuth = 0
try { Get-Json "$Base/api/bookings" | Out-Null } catch { $noAuth = Get-Status $_ }
Check 'API заявок без сессии → 401' ($noAuth -eq 401) ("status=" + $noAuth)

$anonAdmin = 0
try {
  $response = Invoke-WebRequest -Uri "$Base/admin" -MaximumRedirection 0 -UseBasicParsing
  if ($response.Content -match 'Панель заявок') { $anonAdmin = 200 }
} catch { $anonAdmin = Get-Status $_ }
Check '/admin без сессии не отдаёт панель' ($anonAdmin -ne 200) ("status=" + $anonAdmin)

$wrongPassword = Try-Send 'Post' "$Base/api/admin/login" @{ password = 'заведомо-неверный-пароль' }
Check 'Неверный пароль → 401' ($wrongPassword -eq 401) ("status=" + $wrongPassword)

$envFile = Get-Content -Path (Join-Path (Get-Location) '.env') -ErrorAction SilentlyContinue
$adminPassword = ($envFile | Where-Object { $_ -match '^ADMIN_PASSWORD=' }) -replace '^ADMIN_PASSWORD=', ''
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Send-Json 'Post' "$Base/api/admin/login" @{ password = $adminPassword } @{} $session
Check 'Вход с верным паролем' ($login.StatusCode -eq 200)

$list = Get-Json "$Base/api/bookings" $session
Check 'Список заявок доступен владельцу' ($list.bookings.Count -ge 1) ("заявок=" + $list.bookings.Count)

$testBooking = $list.bookings | Where-Object { $_.name -eq 'Тестовая Заявка' } | Select-Object -First 1
Check 'Созданная заявка видна в панели' ($null -ne $testBooking) ("id=" + $testBooking.id)
Check 'У заявки статус NEW' ($testBooking.status -eq 'NEW')
Check 'Телефон нормализован' ($testBooking.phone -eq '+77051112233')
Check 'Источник UTM сохранён' ($testBooking.utm.source -eq '2gis')

$patch = Send-Json 'Patch' "$Base/api/bookings/$($testBooking.id)" @{ status = 'CONFIRMED' } @{} $session
$patchJson = [System.Text.Encoding]::UTF8.GetString($patch.RawContentStream.ToArray()) | ConvertFrom-Json
Check 'Смена статуса на CONFIRMED' ($patchJson.booking.status -eq 'CONFIRMED')

$afterPatch = Get-Json "$Base/api/bookings" $session
$updated = $afterPatch.bookings | Where-Object { $_.id -eq $testBooking.id }
Check 'Статус сохранился' ($updated.status -eq 'CONFIRMED')

$badStatus = Try-Send 'Patch' "$Base/api/bookings/$($testBooking.id)" @{ status = 'СТРАННЫЙ' } @{} $session
Check 'Неизвестный статус → 422' ($badStatus -eq 422) ("status=" + $badStatus)

$emptyState = Get-Json "$Base/api/bookings?status=COMPLETED" $session
Check 'Фильтр по статусу работает' ($emptyState.bookings.Count -eq 0) ("выполненных=" + $emptyState.bookings.Count)

$adminPage = Invoke-WebRequest -Uri "$Base/admin" -WebSession $session -UseBasicParsing
Check 'Страница /admin открывается с сессией' ($adminPage.StatusCode -eq 200 -and $adminPage.Content -match 'Заявки')

$logout = Send-Json 'Post' "$Base/api/admin/logout" @{} @{} $session
Check 'Выход из панели' ($logout.StatusCode -eq 200)

Write-Host ""
Write-Host ("Итого: PASS " + $script:pass + ", FAIL " + $script:fail) -ForegroundColor Cyan
if ($script:fail -gt 0) { exit 1 }
