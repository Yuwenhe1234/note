@echo off
setlocal
title MemoAgent Desktop Launcher

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] 未找到 Node.js / npm。
    echo 请先安装 Node.js：https://nodejs.org/
    echo.
    pause
    exit /b 1
)

where cargo >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] 未检测到 Rust 工具链 ^(cargo^)。
    echo 原生桌面窗口需要 Rust，请先安装：https://rustup.rs
    echo 安装完成后关闭并重新打开本机终端，再运行本脚本。
    echo.
    pause
    exit /b 1
)

set "VS_INSTALL_ROOT=D:\Software\_compliation\_environment"
set "VSDEVCMD=%VS_INSTALL_ROOT%\Common7\Tools\VsDevCmd.bat"
if not exist "%VSDEVCMD%" set "VSDEVCMD=%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
if not exist "%VSDEVCMD%" (
    echo.
    echo [ERROR] 未找到 Visual Studio C++ 编译环境。
    echo 请在 Visual Studio Installer 中安装“使用 C++ 的桌面开发”和 Windows SDK。
    echo.
    pause
    exit /b 1
)

call "%VSDEVCMD%" -arch=x64 -host_arch=x64 >nul
if errorlevel 1 (
    echo.
    echo [ERROR] 加载 Visual Studio C++ 编译环境失败。
    echo.
    pause
    exit /b 1
)

where cl.exe >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Visual Studio C++ 编译工具未安装或未加载。
    echo 请在 Visual Studio Installer 中安装“使用 C++ 的桌面开发”。
    echo.
    pause
    exit /b 1
)

where link.exe >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Windows C++ 链接器未找到。
    echo 请安装 Windows 10/11 SDK，并重新运行本脚本。
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [MemoAgent] 首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install 失败，请检查网络后重试。
        echo.
        pause
        exit /b 1
    )
)

echo [MemoAgent] 正在启动 Tauri 桌面应用（首次会编译 Rust，请耐心等待）...
call npm run tauri dev

endlocal
exit /b 0
