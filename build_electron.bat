@echo off
REM ====================================================================
REM  ALPHA CREATIVE CRM - 1-CLICK ELECTRON WINDOWS INSTALLER BUILDER
REM ====================================================================
echo.
echo ====================================================================
echo    Alpha Creative CRM / ERP - Electron Desktop Builder
echo    Connected to: https://alpha.hkdigiverse.com
echo ====================================================================
echo.

cd /d "%~dp0"

REM Check Node.js
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in your system PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/2] Installing build dependencies...
call npm install

echo.
echo [2/2] Packaging Windows Installer (.exe) with electron-builder...
call npx electron-builder --win nsis portable

echo.
echo ====================================================================
echo 🎉 Electron Build Complete!
echo Check 'dist-electron' folder for your Windows Installers:
echo   - AlphaCreativeCRM-Setup-1.0.0.exe
echo   - AlphaCreativeCRM-1.0.0-portable.exe
echo ====================================================================
pause
