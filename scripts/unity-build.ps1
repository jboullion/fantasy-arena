param([switch]$ValidateOnly)
$ErrorActionPreference='Stop'
$arenaRoot=Split-Path $PSScriptRoot -Parent
$arenaSource=Join-Path $arenaRoot 'unity'
$arenaValidation=Join-Path $arenaRoot 'test-results\unity-validation'
$arenaLog=Join-Path $arenaRoot 'test-results\unity-parity-build.log'
New-Item -ItemType Directory -Force -Path $arenaValidation | Out-Null
# Copy authored inputs only; the validation copy owns its own Library and scene generation.
foreach($arenaFolder in @('Assets','Packages','ProjectSettings')) {
    & robocopy (Join-Path $arenaSource $arenaFolder) (Join-Path $arenaValidation $arenaFolder) /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if($LASTEXITCODE -gt 7){throw "Copy failed: $arenaFolder"}
}
$arenaMethod=if($ValidateOnly){'FantasyArena.Editor.ArenaParity.Validate'}else{'FantasyArena.Editor.ArenaBuild.ValidateAndBuild'}
$arenaArgs='-batchmode -nographics -quit -projectPath "'+$arenaValidation+'" -executeMethod '+$arenaMethod+' -logFile "'+$arenaLog+'"'
$arenaProcess=Start-Process -FilePath 'C:\Program Files\Unity\Hub\Editor\6000.6.0f1\Editor\Unity.exe' -ArgumentList $arenaArgs -WindowStyle Hidden -PassThru
$arenaProcess.WaitForExit()
if($arenaProcess.ExitCode -ne 0){throw "Unity failed. See $arenaLog"}
if(-not $ValidateOnly){
    $arenaOutput=Join-Path $arenaSource 'Builds\Windows'
    & robocopy (Join-Path $arenaValidation 'Builds\Windows') $arenaOutput /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if($LASTEXITCODE -gt 7){throw 'Build copy failed. Close the standalone game and retry.'}
}
Write-Output "Validation log: $arenaLog"
