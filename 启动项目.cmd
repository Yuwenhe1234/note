@echo off
setlocal
title MemoAgent Launcher

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js and npm were not found.
    echo Install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [MemoAgent] Installing dependencies for the first run...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed. Check your network and try again.
        pause
        exit /b 1
    )
)

set "MEMO_PORT="
for /f %%P in ('powershell -NoProfile -Command "$port = 5173; while ($port -le 65535) { $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port); try { $listener.Start(); $listener.Stop(); Write-Output $port; break } catch { $port++ } }"') do set "MEMO_PORT=%%P"

if not defined MEMO_PORT (
    echo [ERROR] No available local port could be found.
    pause
    exit /b 1
)

echo [MemoAgent] Starting the local server at http://127.0.0.1:%MEMO_PORT%/ ...
start "MemoAgent Server" cmd.exe /d /k "cd /d ""%~dp0"" && npm run dev -- --host 127.0.0.1 --port %MEMO_PORT% --strictPort"

powershell -NoProfile -Command "$url = 'http://127.0.0.1:%MEMO_PORT%/'; for ($i = 0; $i -lt 30; $i++) { try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 300 } }; exit 1"
if errorlevel 1 (
    echo [ERROR] The local server did not become ready. Check the MemoAgent Server window.
    pause
    exit /b 1
)

start "" "http://127.0.0.1:%MEMO_PORT%/"

endlocal
exit /b 0
