# Chrome Web Store'a yuklenecek zip'i olusturur.
# Kullanim:  powershell -ExecutionPolicy Bypass -File paketle.ps1
# Cikti:     dist\gemini-side-panel-<surum>.zip  (yalnizca eklentinin ihtiyac duydugu dosyalar)

$ErrorActionPreference = 'Stop'
$kok = $PSScriptRoot

# Eklentiye yeni bir dosya eklersen buraya da ekle.
$dosyalar = @(
    'manifest.json',
    'background.js',
    'content_script.js',
    'sidepanel.html',
    'sidepanel.js',
    'style.css',
    'rules.json',
    'icon.png'
)

foreach ($d in $dosyalar) {
    if (-not (Test-Path -LiteralPath (Join-Path $kok $d))) { throw "Eksik dosya: $d" }
}

$surum = (Get-Content -LiteralPath (Join-Path $kok 'manifest.json') -Raw | ConvertFrom-Json).version
$dist = Join-Path $kok 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$zip = Join-Path $dist "gemini-side-panel-$surum.zip"
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }

Compress-Archive -Path ($dosyalar | ForEach-Object { Join-Path $kok $_ }) -DestinationPath $zip
Write-Host "Olusturuldu: $zip"
