@echo off
REM File timestamp: 2026-09-09 20:22:20 +09:00
setlocal

set "PYTHON_COMMAND="
py --version >nul 2>&1
if not errorlevel 1 set "PYTHON_COMMAND=py"
if not defined PYTHON_COMMAND (
	python --version >nul 2>&1
	if not errorlevel 1 set "PYTHON_COMMAND=python"
)

if not defined PYTHON_COMMAND (
	echo Python is not installed or is not available in PATH.
	echo Install Python from https://www.python.org/downloads/ and enable "Add Python to PATH".
	pause
	exit /b 1
)

start "Handwritten Digit Web Server" /D "%~dp0.." %PYTHON_COMMAND% -m http.server 8000
timeout /t 1 /nobreak >nul
start "" "http://localhost:8000"
endlocal
