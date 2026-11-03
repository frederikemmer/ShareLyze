$ErrorActionPreference = "Stop"

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FrontendHost = if ($env:FRONTEND_HOST) { $env:FRONTEND_HOST } else { "127.0.0.1" }
$FrontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "5173" }
$ViteScript = Join-Path $RootDir "node_modules/vite/bin/vite.js"
$Node = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $Node) {
    Write-Error "Node.js 24 or newer is required. Install Node.js and run npm ci."
    exit 1
}
$NodeVersion = & $Node.Source --version
if ($LASTEXITCODE -ne 0 -or $NodeVersion -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 24) {
    Write-Error "Node.js 24 or newer is required."
    exit 1
}
if (-not (Test-Path -LiteralPath $ViteScript -PathType Leaf)) {
    Write-Error "Dependencies are missing. Run npm ci in $RootDir first."
    exit 1
}
$PortNumber = 0
if ($FrontendPort -notmatch '^\d+$' -or -not [int]::TryParse($FrontendPort, [ref]$PortNumber) -or $PortNumber -lt 1 -or $PortNumber -gt 65535) {
    Write-Error "FRONTEND_PORT must be a number between 1 and 65535."
    exit 1
}

Push-Location $RootDir
try {
    Write-Host "Starting frontend and backend in development mode. Press Ctrl+C to stop."
    & $Node.Source (Join-Path $RootDir "scripts/dev-run.mjs")
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
