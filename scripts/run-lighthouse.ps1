# Поднимает собранный сайт и снимает Lighthouse (мобильный и десктопный профили).
# Запуск: powershell -ExecutionPolicy Bypass -File scripts/run-lighthouse.ps1
param([string]$Base = 'http://localhost:3000')

$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $root 'data\server.log'
if (-not (Test-Path (Join-Path $root 'data'))) { New-Item -ItemType Directory -Force -Path (Join-Path $root 'data') | Out-Null }

$proc = Start-Process -FilePath 'node' `
  -ArgumentList 'node_modules/next/dist/bin/next', 'start', '-p', '3000' `
  -WorkingDirectory $root -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $log -RedirectStandardError ($log + '.err')

Start-Sleep -Seconds 9
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'

try {
  foreach ($mode in @('mobile', 'desktop')) {
    $out = Join-Path $root ("data\lighthouse-" + $mode + ".json")
    # Внимание: $args — автоматическая переменная PowerShell, своё имя обязательно.
    $lighthouseArgs = @('--yes', 'lighthouse', $Base, '--quiet', '--output=json', "--output-path=$out",
      '--chrome-flags=--headless=new --disable-gpu --no-sandbox --disable-dev-shm-usage')
    if ($mode -eq 'desktop') { $lighthouseArgs += '--preset=desktop' }

    Write-Host ("`n== Lighthouse: " + $mode + " ==") -ForegroundColor Cyan
    & npx @lighthouseArgs 2>&1 | Select-Object -Last 3 | Out-Null

    if (Test-Path $out) {
      node -e "const r=require(process.argv[1]);const c=r.categories;const p=k=>Math.round((c[k]?.score??0)*100);console.log('Performance '+p('performance')+', Accessibility '+p('accessibility')+', Best Practices '+p('best-practices')+', SEO '+p('seo'));" $out
    } else {
      Write-Host 'Lighthouse не создал отчёт.' -ForegroundColor Red
    }
  }
} finally {
  & taskkill.exe /PID $proc.Id /F /T 2>&1 | Out-Null
}
