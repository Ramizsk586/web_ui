Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
  [string]$RepoUrl = 'https://github.com/Ramizsk586/llama.git',
  [string]$Branch = '',
  [string]$InstallDir = "$env:LOCALAPPDATA\Programs\llama-bridge",
  [switch]$KeepTemp,
  [switch]$DryRun
)

$MinPythonMajor = 3
$MinPythonMinor = 11
$SetupRoot = Join-Path $env:TEMP 'llama-bridge-setup'
$LockFile = Join-Path $SetupRoot 'setup.lock'
$TempRoot = Join-Path $SetupRoot ("run-" + [guid]::NewGuid().ToString('N'))
$SourceDir = Join-Path $TempRoot 'source'
$VenvDir = Join-Path $TempRoot 'venv'
$StagingDir = Join-Path $TempRoot 'package'
$BackupDir = "$InstallDir.backup"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Info {
  param([string]$Message)
  Write-Host "  - $Message" -ForegroundColor Gray
}

function Write-Ok {
  param([string]$Message)
  Write-Host "  OK $Message" -ForegroundColor Green
}

function Test-Command {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Action
  )

  Write-Step $Label
  & $Action
}

function Invoke-External {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$Label
  )

  Write-Info $Label
  Write-Host "    $FilePath $($Arguments -join ' ')" -ForegroundColor DarkGray

  if ($DryRun) {
    Write-Ok "Dry run only, skipped command"
    return
  }

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

function Get-PythonCommand {
  foreach ($candidate in @('py', 'python')) {
    if (Test-Command $candidate) {
      return $candidate
    }
  }

  throw 'Python 3.11+ is required but was not found on PATH.'
}

function Assert-NormalUser {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this installer as a normal user, not as Administrator.'
  }
}

function Assert-PythonVersion {
  param([string]$PythonCommand)

  $output = & $PythonCommand -c "import sys; print(f'{sys.version_info[0]}.{sys.version_info[1]}')" 2>$null
  if (-not $output) {
    throw 'Unable to read the Python version.'
  }

  $parts = $output.Trim().Split('.')
  $major = [int]$parts[0]
  $minor = [int]$parts[1]

  if ($major -lt $MinPythonMajor -or ($major -eq $MinPythonMajor -and $minor -lt $MinPythonMinor)) {
    throw "Python $MinPythonMajor.$MinPythonMinor or newer is required. Found $output."
  }
}

function Ensure-SetupRoot {
  if (-not (Test-Path $SetupRoot)) {
    New-Item -ItemType Directory -Path $SetupRoot | Out-Null
  }
}

function Acquire-Lock {
  Ensure-SetupRoot

  if (Test-Path $LockFile) {
    $existingPid = Get-Content $LockFile -ErrorAction SilentlyContinue
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
      throw "Another llama bridge setup appears to be running with PID $existingPid."
    }

    Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
  }

  if (-not $DryRun) {
    Set-Content -Path $LockFile -Value $PID -NoNewline
  }
}

function Release-Lock {
  if (Test-Path $LockFile) {
    Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
  }
}

function Cleanup-TempRoot {
  if ($KeepTemp -or $DryRun) {
    return
  }

  if (Test-Path $TempRoot) {
    Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Get-VenvPython {
  return Join-Path $VenvDir 'Scripts\python.exe'
}

function Set-UserEnv {
  param(
    [string]$Name,
    [string]$Value
  )

  if ($DryRun) {
    Write-Info "Would set user environment variable $Name"
    return
  }

  [Environment]::SetEnvironmentVariable($Name, $Value, 'User')
}

function Add-ToUserPath {
  param([string]$PathToAdd)

  $current = [Environment]::GetEnvironmentVariable('Path', 'User')
  $parts = @()
  if ($current) {
    $parts = $current.Split(';', [System.StringSplitOptions]::RemoveEmptyEntries)
  }

  if ($parts -contains $PathToAdd) {
    Write-Ok 'Install directory already exists in user PATH'
    return
  }

  $newParts = @($parts + $PathToAdd)
  $newPath = ($newParts -join ';')
  Set-UserEnv -Name 'Path' -Value $newPath
  Write-Ok 'Updated user PATH'
}

function Invoke-SmokeTest {
  $exePath = Join-Path $InstallDir 'llama-bridge.exe'
  if (-not (Test-Path $exePath)) {
    throw "Installed executable not found: $exePath"
  }

  Write-Info 'Running smoke test: llama-bridge.exe --help'
  if ($DryRun) {
    Write-Ok 'Dry run only, skipped smoke test'
    return
  }

  & $exePath --help | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'Smoke test failed. The bridge executable returned a non-zero exit code.'
  }

  Write-Ok 'Smoke test passed'
}

function Copy-RuntimeFiles {
  $distDir = Join-Path $SourceDir 'dist\llama-bridge'
  $exePath = Join-Path $distDir 'llama-bridge.exe'

  if (-not (Test-Path $distDir)) {
    throw "Expected build output directory was not created: $distDir"
  }

  if (-not (Test-Path $exePath)) {
    throw "Expected executable was not created: $exePath"
  }

  if ($DryRun) {
    Write-Info "Would replace $InstallDir with $distDir"
    return
  }

  if (Test-Path $StagingDir) {
    Remove-Item -LiteralPath $StagingDir -Recurse -Force
  }

  Copy-Item -LiteralPath $distDir -Destination $StagingDir -Recurse

  if (Test-Path $BackupDir) {
    Remove-Item -LiteralPath $BackupDir -Recurse -Force
  }

  if (Test-Path $InstallDir) {
    Move-Item -LiteralPath $InstallDir -Destination $BackupDir
  }

  try {
    Move-Item -LiteralPath $StagingDir -Destination $InstallDir
    if (Test-Path $BackupDir) {
      Remove-Item -LiteralPath $BackupDir -Recurse -Force
    }
  } catch {
    if (Test-Path $InstallDir) {
      Remove-Item -LiteralPath $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $BackupDir) {
      Move-Item -LiteralPath $BackupDir -Destination $InstallDir -Force
    }
    throw
  }

  Write-Ok "Installed runtime into $InstallDir"
}

try {
  Invoke-Step 'Checking prerequisites' {
    Assert-NormalUser
    if (-not (Test-Command 'git')) {
      throw 'Git is required but was not found on PATH.'
    }

    $pythonCommand = Get-PythonCommand
    Assert-PythonVersion -PythonCommand $pythonCommand
    Write-Ok "Python command: $pythonCommand"

    if (-not (Test-Path $InstallDir)) {
      Write-Info "Install directory will be created: $InstallDir"
    } else {
      Write-Info "Install directory exists and will be updated: $InstallDir"
    }
  }

  Invoke-Step 'Preparing workspace' {
    Acquire-Lock

    if (-not $DryRun) {
      New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
    }

    Write-Ok "Workspace ready at $TempRoot"
  }

  Invoke-Step 'Cloning llama repository' {
    $cloneArgs = @('clone', '--depth', '1')
    if ($Branch) {
      $cloneArgs += @('--branch', $Branch)
    }
    $cloneArgs += @($RepoUrl, $SourceDir)

    Invoke-External -FilePath 'git' -Arguments $cloneArgs -Label 'Cloning repository'
    Write-Ok 'Repository cloned'
  }

  Invoke-Step 'Creating virtual environment' {
    $pythonCommand = Get-PythonCommand
    Invoke-External -FilePath $pythonCommand -Arguments @('-m', 'venv', $VenvDir) -Label 'Creating virtual environment'
    Write-Ok 'Virtual environment created'
  }

  Invoke-Step 'Installing build dependencies' {
    $venvPython = Get-VenvPython
    Invoke-External -FilePath $venvPython -Arguments @('-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel', 'pyinstaller', 'fastapi', 'httpx', 'pydantic', 'uvicorn', 'pyyaml') -Label 'Installing build dependencies'
    Invoke-External -FilePath $venvPython -Arguments @('-m', 'pip', 'install', '-e', $SourceDir) -Label 'Installing llama package'
    Write-Ok 'Dependencies installed'
  }

  Invoke-Step 'Building llama bridge runtime' {
    $venvPython = Get-VenvPython
    $entrypoint = Join-Path $SourceDir 'llama_bridge\__main__.py'
    if (-not $DryRun -and -not (Test-Path $entrypoint)) {
      throw "Bridge entrypoint was not found: $entrypoint"
    }

    $pyInstallerArgs = @(
      '-m', 'PyInstaller',
      '--noconfirm',
      '--onedir',
      '--clean',
      '--name', 'llama-bridge',
      '--distpath', (Join-Path $SourceDir 'dist'),
      '--workpath', (Join-Path $SourceDir 'build'),
      '--specpath', (Join-Path $SourceDir 'build')
    )

    if (-not $DryRun) {
      $pyInstallerArgs += $entrypoint
    } else {
      $pyInstallerArgs += '.\llama_bridge\__main__.py'
    }

    Invoke-External -FilePath $venvPython -Arguments $pyInstallerArgs -Label 'Building llama-bridge.exe'
    Write-Ok 'Bridge build completed'
  }

  Invoke-Step 'Installing runtime files' {
    Copy-RuntimeFiles
  }

  Invoke-Step 'Updating environment' {
    Set-UserEnv -Name 'LLAMA_BRIDGE_HOME' -Value $InstallDir
    Add-ToUserPath -PathToAdd $InstallDir
    Write-Ok 'Environment updated'
  }

  Invoke-Step 'Running smoke test' {
    Invoke-SmokeTest
  }

  Write-Host ""
  Write-Host "Llama Bridge setup completed." -ForegroundColor Green
  Write-Host "Install Dir: $InstallDir" -ForegroundColor Gray
  Write-Host "Bridge Home: $InstallDir" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Next steps:" -ForegroundColor Cyan
  Write-Host "  1. Start llama-bridge.exe from the install directory." -ForegroundColor Gray
  Write-Host "  2. In Lumina, open Settings -> Llama Bridge." -ForegroundColor Gray
  Write-Host "  3. Test the bridge URL and then load models/tools." -ForegroundColor Gray
}
catch {
  Write-Host ""
  Write-Host "Llama Bridge setup failed." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
finally {
  Release-Lock
  Cleanup-TempRoot
}
