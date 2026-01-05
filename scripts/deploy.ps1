param(
  [ValidateSet("all","simulator","tv")]
  [string]$Target = "all",
  [string]$DeviceTv = "tv",
  [string]$SimulatorVersion = "24",
  [string]$SimulatorPath = "",
  [string]$AppId = "",
  [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' not found on PATH. Install webOS CLI or add it to PATH."
  }
}

function Get-ProjectRoot([string]$RootArg) {
  if ($RootArg) { return (Resolve-Path $RootArg).Path }
  return (Resolve-Path (Join-Path $PSScriptRoot ".." )).Path
}

function Get-AppId([string]$Root, [string]$Override) {
  if ($Override) { return $Override }
  $appinfoPath = Join-Path $Root "appinfo.json"
  if (-not (Test-Path $appinfoPath)) { throw "appinfo.json not found at $appinfoPath" }
  $json = Get-Content $appinfoPath -Raw | ConvertFrom-Json
  if (-not $json.id) { throw "appinfo.json missing id" }
  return $json.id
}

function Get-DeviceNames() {
  $output = ares-setup-device -list 2>$null
  if (-not $output) { return @() }
  $names = @()
  foreach ($line in $output) {
    if ($line -match "^\s*name\s*:\s*(\S+)\s*$") { $names += $matches[1] }
  }
  return $names
}

function Assert-Device([string]$Name, [string[]]$Known) {
  if ($Known -notcontains $Name) {
    throw "Device '$Name' not found. Run: ares-setup-device -add and ensure it appears in ares-setup-device -list."
  }
}

function Package-App([string]$Root) {
  $outDir = Join-Path $Root "dist"
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
  ares-package -o $outDir $Root | Out-Null
  $ipk = Get-ChildItem -Path $outDir -Filter *.ipk | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $ipk) { throw "IPK not found in $outDir" }
  return $ipk.FullName
}

function Deploy([string]$Device, [string]$Ipk, [string]$AppId) {
  Write-Host "Installing to $Device..."
  ares-install -d $Device $Ipk | Out-Null
  Write-Host "Launching $AppId on $Device..."
  ares-launch -d $Device $AppId | Out-Null
}

Require-Command "ares-launch"
$needsTv = $Target -in @("tv","all")
$needsSimulator = $Target -in @("simulator","all")

if ($needsTv) {
  Require-Command "ares-package"
  Require-Command "ares-install"
  Require-Command "ares-setup-device"
}

if ($env:GITHUB_ACTIONS -eq "true") {
  Write-Host "GitHub Actions detected. Ensure this runner is self-hosted with webOS CLI installed and devices preconfigured."
}

$root = Get-ProjectRoot $ProjectRoot
$appIdResolved = Get-AppId $root $AppId
$devices = @()
$ipk = $null

if ($needsTv) {
  $devices = Get-DeviceNames
  $ipk = Package-App $root
}

switch ($Target) {
  "simulator" {
    Write-Host "Launching on webOS TV Simulator $SimulatorVersion..."
    if ($SimulatorPath) {
      ares-launch -s $SimulatorVersion -sp $SimulatorPath $root | Out-Null
    } else {
      ares-launch -s $SimulatorVersion $root | Out-Null
    }
  }
  "tv" {
    Assert-Device $DeviceTv $devices
    Deploy $DeviceTv $ipk $appIdResolved
  }
  "all" {
    Assert-Device $DeviceTv $devices
    Write-Host "Launching on webOS TV Simulator $SimulatorVersion..."
    if ($SimulatorPath) {
      ares-launch -s $SimulatorVersion -sp $SimulatorPath $root | Out-Null
    } else {
      ares-launch -s $SimulatorVersion $root | Out-Null
    }
    Deploy $DeviceTv $ipk $appIdResolved
  }
}
