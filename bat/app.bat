@echo off
echo ===================================================
echo Lumina AI Chat - Starting Tauri Desktop Preview
echo ===================================================
cd /d "%~dp0.."
call npm run tauri:dev

