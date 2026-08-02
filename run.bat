@echo off
REM Smart Library Management System - Windows Run Script

echo ================================================
echo Smart Library Management System
echo ================================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.10 or higher.
    pause
    exit /b 1
)

REM Check if venv exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install requirements
echo Installing dependencies...
pip install -r requirements.txt

REM Check if .env exists
if not exist ".env" (
    echo.
    echo ^^!^! .env file not found!
    echo Please create a .env file with MongoDB connection string.
    echo Example:
    echo MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/library_db
    echo.
    pause
    exit /b 1
)

REM Run Flask application
echo.
echo Starting Flask application...
echo Access the application at http://localhost:5000
echo.
python app.py

pause
