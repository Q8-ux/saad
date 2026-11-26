$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'out'
$appData = Join-Path $env:LOCALAPPDATA 'Mirsad'
$installDir = Join-Path $env:LOCALAPPDATA 'Programs\Mirsad'
$exe = Join-Path $out 'Mirsad-Setup.exe'
$process = Start-Process -FilePath $exe -ArgumentList '--headless' -PassThru
try {
  $runtime = Join-Path $appData ('runtime-' + $process.Id + '.json')
  $deadline = (Get-Date).AddSeconds(15)
  while (!(Test-Path -LiteralPath $runtime)) {
    if ((Get-Date) -gt $deadline) { throw 'Local application did not start' }
    Start-Sleep -Milliseconds 150
  }
  $info = Get-Content -LiteralPath $runtime -Raw | ConvertFrom-Json
  $uri = [uri]$info.url
  $origin = $uri.GetLeftPart([System.UriPartial]::Authority)
  $null = Invoke-WebRequest -Uri $info.url -SessionVariable session -UseBasicParsing
  $cfg = Invoke-RestMethod -Uri ($origin + '/api/config') -WebSession $session
  $headers = @{ Origin=$origin; 'X-Mirsad-CSRF'=$cfg.csrf }
  function Post-Local($path, $body) {
    Invoke-RestMethod -Uri ($origin+$path) -Method Post -Headers $headers -WebSession $session -ContentType 'application/json' -Body ($body|ConvertTo-Json -Compress)
  }
  $null = Post-Local '/api/scan' @{ section='all'; active=$false }
  $deadline = (Get-Date).AddSeconds(65)
  do {
    Start-Sleep -Milliseconds 500
    $state = Invoke-RestMethod -Uri ($origin+'/api/state') -WebSession $session
    $running = @($state.sections.PSObject.Properties | Where-Object {$_.Value.status -eq 'running'})
    if ((Get-Date) -gt $deadline) { throw 'Scan did not finish in the expected time' }
  } while ($running.Count -gt 0)
  foreach ($id in @('system','adapters','ports','hardware','traffic','security','serial')) {
    if ($state.sections.$id.status -ne 'ready') { throw ('Built-in collector failed: '+$id+': '+$state.sections.$id.message) }
  }
  # Radio absence in a CI virtual machine is an explicit unavailable result, not a fabricated success.
  foreach ($id in @('wifi','bluetooth')) {
    if ($state.sections.$id.status -notin @('ready','error')) { throw ('Invalid radio result: '+$id) }
  }
  $null = Post-Local '/api/install' @{}
  $installed = Join-Path $installDir 'Mirsad.exe'
  if (!(Test-Path -LiteralPath $installed)) { throw 'Installed executable is missing' }
  if ((Get-FileHash -LiteralPath $installed).Hash -ne (Get-FileHash -LiteralPath $exe).Hash) { throw 'Installed bytes do not match the verified executable' }
  $w = New-Object -ComObject WScript.Shell
  $desktopPath = $w.SpecialFolders.Item('Desktop')
  $shortcut = Join-Path $desktopPath ([string]::Concat([char]0x645,[char]0x631,[char]0x635,[char]0x62f,' ',[char]0x627,[char]0x644,[char]0x643,[char]0x645,[char]0x628,[char]0x64a,[char]0x648,[char]0x62a,[char]0x631,'.lnk'))
  if (!(Test-Path -LiteralPath $shortcut)) { throw 'Arabic desktop shortcut is missing' }
  if (!(Test-Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\MirsadDesktop')) { throw 'Windows uninstall registration is missing' }
  $registration = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\MirsadDesktop'
  $expectedTitle = (Split-Path -Leaf $shortcut) -replace '\.lnk$',''
  if ($registration.DisplayName -ne $expectedTitle) { throw 'Arabic program name was not preserved in Windows registration' }
  foreach ($format in @('html','json','csv')) {
    $path = Join-Path $out ('validation-report.'+$format)
    Invoke-WebRequest -Uri ($origin+'/api/export?format='+$format) -WebSession $session -UseBasicParsing -OutFile $path
    if ((Get-Item -LiteralPath $path).Length -lt 100) { throw ('Empty export: '+$format) }
    Remove-Item -LiteralPath $path
  }
  $null = Post-Local '/api/save' @{}
  $saved = Invoke-RestMethod -Uri ($origin+'/api/sessions') -WebSession $session
  if (@($saved).Count -lt 1) { throw 'Saved scan is missing' }
  $summary = @{ checkedAt=(Get-Date).ToUniversalTime().ToString('o'); result='passed'; installer='passed'; exports='passed'; collectors=@{} }
  foreach ($p in $state.sections.PSObject.Properties) { $summary.collectors[$p.Name]=$p.Value.status }
  $summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $out 'windows-validation.json') -Encoding UTF8
  $null = Post-Local '/api/quit' @{}
  if (!$process.WaitForExit(10000)) { throw 'Application did not stop cleanly' }
  Write-Host 'Windows executable, native collectors, installer, shortcuts, exports, and archive passed.'
} catch {
  $diag = Join-Path $appData 'install-diagnostic.txt'
  if (Test-Path -LiteralPath $diag) { Get-Content -LiteralPath $diag | ForEach-Object { Write-Host $_ } }
  throw
} finally {
  if (!$process.HasExited) { Stop-Process -Id $process.Id -Force }
}
