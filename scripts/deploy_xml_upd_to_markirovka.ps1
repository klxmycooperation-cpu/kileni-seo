param(
    [string]$RuntimeDir = 'D:\Markirovka',
    [string]$IntegrationRoot = 'D:\CodexWork\Validation\XML_UPD_INTEGRATION_20260803',
    [string]$XmlUpdRoot = 'D:\CodexWork\Validation\XML_UPD_TEST_20260803'
)

$ErrorActionPreference = 'Stop'

if (Get-Process -Name Markirovka -ErrorAction SilentlyContinue) {
    throw 'Close Markirovka before deployment.'
}

$sourceExe = Join-Path $IntegrationRoot 'out\Markirovka\Markirovka.exe'
$sourceXmlUpd = Join-Path $XmlUpdRoot 'out\XmlUpd.dll'
$sourceIni = Join-Path $XmlUpdRoot 'out\XmlUpd.ini'
$sourceUdl = Join-Path $XmlUpdRoot 'out\XmlUpd.Test.udl'
$targetExe = Join-Path $RuntimeDir 'Markirovka.exe'
$backupDir = Join-Path $RuntimeDir 'backup_xmlupd_20260803_1620'

foreach ($path in @($sourceExe, $sourceXmlUpd, $sourceIni, $sourceUdl,
    $targetExe)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required file not found: $path"
    }
}

if (Test-Path -LiteralPath $backupDir) {
    throw "Backup directory already exists: $backupDir"
}

New-Item -ItemType Directory -Path $backupDir | Out-Null
Copy-Item -LiteralPath $targetExe -Destination $backupDir

foreach ($name in @('XmlUpd.dll', 'XmlUpd.ini', 'XmlUpd.Test.udl')) {
    $existing = Join-Path $RuntimeDir $name
    if (Test-Path -LiteralPath $existing -PathType Leaf) {
        Copy-Item -LiteralPath $existing -Destination $backupDir
    }
}

Copy-Item -LiteralPath $sourceExe -Destination $targetExe -Force
Copy-Item -LiteralPath $sourceXmlUpd -Destination $RuntimeDir -Force
Copy-Item -LiteralPath $sourceIni -Destination $RuntimeDir -Force
Copy-Item -LiteralPath $sourceUdl -Destination $RuntimeDir -Force

$installed = @(
    $targetExe,
    (Join-Path $RuntimeDir 'XmlUpd.dll'),
    (Join-Path $RuntimeDir 'XmlUpd.ini'),
    (Join-Path $RuntimeDir 'XmlUpd.Test.udl')
)

foreach ($path in $installed) {
    $file = Get-Item -LiteralPath $path
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLower()
    Write-Output ('INSTALLED path={0} bytes={1} sha256={2}' -f
        $file.FullName, $file.Length, $hash)
}
Write-Output "BACKUP path=$backupDir"
