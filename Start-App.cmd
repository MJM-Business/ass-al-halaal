@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22.5 or newer, then run this file again.
  pause
  exit /b 1
)
echo.
echo KABSH NAJD
 echo Store: http://127.0.0.1:5173
 echo Admin: http://127.0.0.1:5173/#admin
 echo Local admin PIN: 2468
 echo Keep this window open while using the application.
echo.
node scripts/serve.mjs
pause
