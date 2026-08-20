@echo off
echo ===================================================
echo Lumina AI Chat - Starting Tauri Desktop Preview
echo ===================================================

:: Add MSYS2 UCRT64 (Rust/GCC/lld) and usr/bin (bash) to PATH
set "PATH=D:\msys64\ucrt64\bin;D:\msys64\usr\bin;%PATH%"

cd /d "%~dp0.."
call npm run tauri:dev

