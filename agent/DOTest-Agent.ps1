# =====================================================================
#  DOTest Hardware Agent for Windows  —  v1.0
#  © Ahmed Al-Zahrani
#
#  Reads your PC hardware (READ-ONLY) and saves "DOTest-Report.json"
#  on your Desktop + copies it to the clipboard.
#  NOTHING is uploaded anywhere. Import the file into the DOTest site.
#
#  يقرأ مواصفات جهازك فقط (بدون أي تعديل) ويحفظ ملف DOTest-Report.json
#  على سطح المكتب وينسخه. ما يرسل أي شي لأي مكان.
#
#  Run: double-click "DOTest-Agent.bat"  (or right-click this file → Run with PowerShell)
# =====================================================================
$ErrorActionPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

function Q($class, $ns) {
  if (-not $ns) { $ns = 'root\cimv2' }
  try { return @(Get-CimInstance -ClassName $class -Namespace $ns -ErrorAction Stop) } catch { return @() }
}
function S($v) { if ($null -eq $v) { return $null }; $s = ($v.ToString()).Trim(); if ($s -eq '' -or $s -match '^(To Be Filled.*|Default string|None|0+|System Serial Number|Not Specified|Not Applicable|N/A|Unknown|Chassis Serial Number|Base Board Serial Number)$') { return $null }; return $s }
function D($v) { if ($v -is [datetime]) { return $v.ToString('s') }; return $null }
function Dec($arr) { if (-not $arr) { return $null }; $s = (($arr | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) -join '').Trim(); return (S $s) }
function First($a) { if ($a -and $a.Count -gt 0) { return $a[0] }; return $null }

Write-Host ''
Write-Host '  DOTest Hardware Agent — Ahmed Al-Zahrani' -ForegroundColor Cyan
Write-Host '  Reading hardware... / جاري قراءة العتاد...' -ForegroundColor Gray

$os    = First (Q 'Win32_OperatingSystem')
$cs    = First (Q 'Win32_ComputerSystem')
$csp   = First (Q 'Win32_ComputerSystemProduct')
$bios  = First (Q 'Win32_BIOS')
$bb    = First (Q 'Win32_BaseBoard')
$encl  = First (Q 'Win32_SystemEnclosure')
$cpus  = Q 'Win32_Processor'
$mem   = Q 'Win32_PhysicalMemory'
$marr  = First (Q 'Win32_PhysicalMemoryArray')
$gpus  = Q 'Win32_VideoController'
$disks = Q 'Win32_DiskDrive'
$vols  = Q 'Win32_LogicalDisk' | Where-Object { $_.DriveType -eq 3 }
$nics  = Q 'Win32_NetworkAdapterConfiguration' | Where-Object { $_.IPEnabled }
$nhw   = Q 'Win32_NetworkAdapter'
$mons  = Q 'WmiMonitorID' 'root\wmi'
$bat   = First (Q 'Win32_Battery')
$bDes  = First (Q 'BatteryStaticData' 'root\wmi')
$bFull = First (Q 'BatteryFullChargedCapacity' 'root\wmi')
$bCyc  = First (Q 'BatteryCycleCount' 'root\wmi')
$tpm   = First (Q 'Win32_Tpm' 'root\cimv2\Security\MicrosoftTpm')
$snd   = Q 'Win32_SoundDevice'
$pdisk = @()
try { $pdisk = @(Get-PhysicalDisk -ErrorAction Stop) } catch {}

# ---- lookup tables ----
$memType = @{ 20 = 'DDR'; 21 = 'DDR2'; 24 = 'DDR3'; 26 = 'DDR4'; 27 = 'LPDDR'; 28 = 'LPDDR2'; 29 = 'LPDDR3'; 30 = 'LPDDR4'; 34 = 'DDR5'; 35 = 'LPDDR5' }
$formF   = @{ 8 = 'DIMM'; 12 = 'SODIMM'; 13 = 'SRIMM' }
$pcType  = @{ 1 = 'Desktop'; 2 = 'Laptop'; 3 = 'Workstation'; 4 = 'Enterprise Server'; 5 = 'SOHO Server'; 7 = 'Performance Server'; 8 = 'Slate / Tablet' }
$media   = @{ '3' = 'HDD'; '4' = 'SSD'; '0' = 'Unspecified'; 'HDD' = 'HDD'; 'SSD' = 'SSD' }

# ---- real VRAM from registry (AdapterRAM is capped at 4 GB) ----
$vram = @{}
$classKey = 'HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}'
Get-ChildItem $classKey -ErrorAction SilentlyContinue | ForEach-Object {
  $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
  if ($p -and $p.DriverDesc) {
    $q = $p.'HardwareInformation.qwMemorySize'
    if (-not $q) { $q = $p.'HardwareInformation.MemorySize'; if ($q -is [byte[]]) { $q = [BitConverter]::ToUInt32($q, 0) } }
    if ($q) { $vram[$p.DriverDesc] = [int64]$q }
  }
}

$winVer = $null
try { $winVer = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction Stop) } catch {}
$secure = $null
try { $secure = Confirm-SecureBootUEFI -ErrorAction Stop } catch {}
$uefi = Test-Path 'HKLM:\System\CurrentControlSet\Control\SecureBoot\State'

$report = [ordered]@{
  agent     = 'DOTest-Agent'
  version   = '1.0'
  platform  = 'windows'
  generated = (Get-Date).ToString('s')
  system    = [ordered]@{
    name         = $env:COMPUTERNAME
    manufacturer = (S $cs.Manufacturer)
    model        = (S $cs.Model)
    family       = (S $cs.SystemFamily)
    sku          = (S $cs.SystemSKUNumber)
    type         = $pcType[[int]$cs.PCSystemType]
    serial       = (S $bios.SerialNumber)
    uuid         = (S $csp.UUID)
    chassisSerial = (S $encl.SerialNumber)
    assetTag     = (S $encl.SMBIOSAssetTag)
  }
  os        = [ordered]@{
    name           = (S $os.Caption)
    version        = (S $os.Version)
    build          = (S $os.BuildNumber)
    ubr            = $winVer.UBR
    displayVersion = (S $winVer.DisplayVersion)
    edition        = (S $winVer.EditionID)
    arch           = (S $os.OSArchitecture)
    installDate    = (D $os.InstallDate)
    lastBoot       = (D $os.LastBootUpTime)
    uptimeHours    = $(if ($os.LastBootUpTime) { [math]::Round(((Get-Date) - $os.LastBootUpTime).TotalHours, 1) } else { $null })
    user           = $env:USERNAME
    productId      = (S $winVer.ProductId)
  }
  cpu       = @($cpus | ForEach-Object { [ordered]@{
    name           = (S $_.Name)
    manufacturer   = (S $_.Manufacturer)
    cores          = $_.NumberOfCores
    threads        = $_.NumberOfLogicalProcessors
    maxClockMHz    = $_.MaxClockSpeed
    currentClockMHz = $_.CurrentClockSpeed
    l2KB           = $_.L2CacheSize
    l3KB           = $_.L3CacheSize
    socket         = (S $_.SocketDesignation)
    processorId    = (S $_.ProcessorId)
    serial         = (S $_.SerialNumber)
    virtualization = $_.VirtualizationFirmwareEnabled
    loadPercent    = $_.LoadPercentage
    description    = (S $_.Description)
  } })
  ram       = [ordered]@{
    totalBytes  = [int64]$cs.TotalPhysicalMemory
    installedBytes = [int64](($mem | Measure-Object -Property Capacity -Sum).Sum)
    slots       = $marr.MemoryDevices
    maxBytes    = $(if ($marr.MaxCapacityEx) { [int64]$marr.MaxCapacityEx * 1024 } else { $null })
    modules     = @($mem | ForEach-Object { [ordered]@{
      slot          = (S $_.DeviceLocator)
      bank          = (S $_.BankLabel)
      capacityBytes = [int64]$_.Capacity
      speedMHz      = $_.Speed
      configuredMHz = $_.ConfiguredClockSpeed
      type          = $memType[[int]$_.SMBIOSMemoryType]
      formFactor    = $formF[[int]$_.FormFactor]
      manufacturer  = (S $_.Manufacturer)
      partNumber    = (S $_.PartNumber)
      serial        = (S $_.SerialNumber)
      voltageMV     = $_.ConfiguredVoltage
    } })
  }
  gpu       = @($gpus | ForEach-Object {
    $v = $vram[$_.Name]; if (-not $v) { $v = [int64]$_.AdapterRAM }
    [ordered]@{
      name        = (S $_.Name)
      vendor      = (S $_.AdapterCompatibility)
      vramBytes   = $v
      driver      = (S $_.DriverVersion)
      driverDate  = (D $_.DriverDate)
      resolution  = $(if ($_.CurrentHorizontalResolution) { "$($_.CurrentHorizontalResolution) x $($_.CurrentVerticalResolution)" } else { $null })
      refreshHz   = $_.CurrentRefreshRate
      pnpId       = (S $_.PNPDeviceID)
    } })
  motherboard = [ordered]@{
    manufacturer = (S $bb.Manufacturer)
    product      = (S $bb.Product)
    version      = (S $bb.Version)
    serial       = (S $bb.SerialNumber)
  }
  bios      = [ordered]@{
    vendor     = (S $bios.Manufacturer)
    version    = (S $bios.SMBIOSBIOSVersion)
    date       = (D $bios.ReleaseDate)
    serial     = (S $bios.SerialNumber)
    mode       = $(if ($uefi) { 'UEFI' } else { 'Legacy' })
    secureBoot = $secure
  }
  disks     = @($disks | ForEach-Object {
    $d = $_; $pd = $pdisk | Where-Object { "$($_.DeviceId)" -eq "$($d.Index)" } | Select-Object -First 1
    [ordered]@{
      model     = (S $d.Model)
      sizeBytes = [int64]$d.Size
      serial    = (S $d.SerialNumber)
      firmware  = (S $d.FirmwareRevision)
      interface = (S $d.InterfaceType)
      bus       = $(if ($pd) { "$($pd.BusType)" } else { $null })
      media     = $(if ($pd) { $media["$($pd.MediaType)"] } else { $null })
      health    = $(if ($pd) { "$($pd.HealthStatus)" } else { (S $d.Status) })
      partitions = $d.Partitions
    } })
  volumes   = @($vols | ForEach-Object { [ordered]@{ drive = $_.DeviceID; label = (S $_.VolumeName); fs = (S $_.FileSystem); sizeBytes = [int64]$_.Size; freeBytes = [int64]$_.FreeSpace; serial = (S $_.VolumeSerialNumber) } })
  network   = @($nics | ForEach-Object {
    $c = $_; $hw = $nhw | Where-Object { $_.Index -eq $c.Index } | Select-Object -First 1
    [ordered]@{
      name     = (S $c.Description)
      conn     = $(if ($hw) { S $hw.NetConnectionID } else { $null })
      mac      = (S $c.MACAddress)
      ipv4     = @($c.IPAddress | Where-Object { $_ -match '^\d+\.' })
      ipv6     = @($c.IPAddress | Where-Object { $_ -match ':' })
      subnet   = @($c.IPSubnet | Where-Object { $_ -match '^\d+\.' })
      gateway  = @($c.DefaultIPGateway)
      dns      = @($c.DNSServerSearchOrder)
      dhcp     = $c.DHCPEnabled
      speedMbps = $(if ($hw -and $hw.Speed) { [math]::Round([double]$hw.Speed / 1e6) } else { $null })
    } })
  monitors  = @($mons | ForEach-Object { [ordered]@{
    manufacturer = (Dec $_.ManufacturerName)
    model        = (Dec $_.UserFriendlyName)
    productCode  = (Dec $_.ProductCodeID)
    serial       = (Dec $_.SerialNumberID)
    year         = $_.YearOfManufacture
  } })
  battery   = $(if ($bat) { [ordered]@{
    name          = (S $bat.Name)
    chargePercent = $bat.EstimatedChargeRemaining
    status        = $bat.BatteryStatus
    designMWh     = $bDes.DesignedCapacity
    fullMWh       = $bFull.FullChargedCapacity
    cycles        = $bCyc.CycleCount
    serial        = (S $bDes.SerialNumber)
    manufacturer  = (S $bDes.ManufactureName)
    healthPercent = $(if ($bDes.DesignedCapacity -and $bFull.FullChargedCapacity) { [math]::Round(100 * $bFull.FullChargedCapacity / $bDes.DesignedCapacity, 1) } else { $null })
  } } else { $null })
  tpm       = $(if ($tpm) { [ordered]@{ present = $true; enabled = $tpm.IsEnabled_InitialValue; version = (S $tpm.SpecVersion); manufacturer = (S $tpm.ManufacturerIdTxt) } } else { $null })
  audio     = @($snd | ForEach-Object { S $_.Name } | Where-Object { $_ })
}

$json = $report | ConvertTo-Json -Depth 8
$desk = [Environment]::GetFolderPath('Desktop'); if (-not $desk) { $desk = $PWD.Path }
$path = Join-Path $desk 'DOTest-Report.json'
[IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding $false))
$copied = $false
try { Set-Clipboard -Value $json -ErrorAction Stop; $copied = $true } catch {}

Write-Host ''
Write-Host "  Done ✓  Saved: $path" -ForegroundColor Green
if ($copied) { Write-Host '  Also copied to clipboard — paste it in DOTest → Hardware Report.' -ForegroundColor Green }
Write-Host '  تم ✓ ارفع الملف أو الصقه في موقع DOTest (تبويب تقرير العتاد)' -ForegroundColor Green
Write-Host ''
