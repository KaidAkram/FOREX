@echo off
title WARI Extraction Platform DEBUG

echo [1] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    pause
    exit
)

echo [2] Checking libraries...
python -c "import customtkinter, selenium, pandas, openpyxl"
if %errorlevel% neq 0 (
    echo Installing missing libraries...
    pip install customtkinter selenium pandas openpyxl
)

echo [3] Launching App...
:: We are using 'python' instead of 'start pythonw' so it prints errors to the screen
python wari_scraper_app.py

echo.
echo [App Closed or Crashed - Read the error above!]
pause