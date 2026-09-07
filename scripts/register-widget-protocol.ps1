param(
  [Parameter(Mandatory = $true)]
  [string]$ExecutablePath
)

$resolvedExecutable = (Resolve-Path -LiteralPath $ExecutablePath -ErrorAction Stop).Path
$protocolRoot = "HKCU:\Software\Classes\memoagent"
$commandKey = Join-Path $protocolRoot "shell\open\command"

New-Item -Path $commandKey -Force | Out-Null
Set-Item -Path $protocolRoot -Value "URL:MemoAgent Desktop Widget"
New-ItemProperty -Path $protocolRoot -Name "URL Protocol" -Value "" -PropertyType String -Force | Out-Null
Set-Item -Path $commandKey -Value ('"' + $resolvedExecutable + '" "%1"')

Write-Output "Registered memoagent:// for $resolvedExecutable"
