@echo off
echo ===================================================
echo Lumina AI Chat - Building Project
echo ===================================================
cd /d "%~dp0.."
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
echo [SUCCESS] Build completed successfully.
