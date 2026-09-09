param([ValidateSet('offline','network','local')][string]$Mode = 'offline')
$ErrorActionPreference = 'Stop'
$arenaRoot = Split-Path $PSScriptRoot -Parent
$arenaExe = Join-Path $arenaRoot 'unity\Builds\Windows\FantasyArena.exe'
$arenaResults = Join-Path $arenaRoot ('test-results\unity-' + $Mode + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $arenaResults -Force | Out-Null
if (-not (Test-Path -LiteralPath $arenaExe)) { throw 'Build Fantasy Arena first.' }
$arenaRoles = if ($Mode -eq 'network') { @('host','guest') } else { @($Mode) }
$arenaJobs = @()
try {
    foreach ($arenaRole in $arenaRoles) {
        $arenaReport = Join-Path $arenaResults ($arenaRole + '.json')
        $arenaLog = Join-Path $arenaResults ($arenaRole + '.log')
        $arenaArgs = '-batchmode -nographics -arenaSmoke ' + $arenaRole + ' -arenaReport "' + $arenaReport + '" -logFile "' + $arenaLog + '"'
        $arenaJob = Start-Process -FilePath $arenaExe -ArgumentList $arenaArgs -WindowStyle Hidden -PassThru
        $arenaJobs += $arenaJob
        if ($arenaRole -eq 'host') { Start-Sleep -Seconds 3 }
    }
    foreach ($arenaJob in $arenaJobs) {
        if (-not $arenaJob.WaitForExit(110000)) { throw 'Unity smoke process timed out.' }
    }
    foreach ($arenaRole in $arenaRoles) {
        $arenaReport = Join-Path $arenaResults ($arenaRole + '.json')
        if (-not (Test-Path -LiteralPath $arenaReport)) { throw "Missing report: $arenaRole" }
        $arenaData = Get-Content -LiteralPath $arenaReport -Raw | ConvertFrom-Json
        if (-not $arenaData.pass) { throw "Smoke check failed: $arenaRole" }
        $arenaData | ConvertTo-Json -Compress
    }
    Write-Output "Reports: $arenaResults"
} finally {
    foreach ($arenaJob in $arenaJobs) { if (-not $arenaJob.HasExited) { $arenaJob.Kill() } }
}
