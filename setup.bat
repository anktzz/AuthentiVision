@echo off
echo Setting up the environment...

REM Create the virtual environment[cite: 1]
python -m venv venv

REM Activate the virtual environment[cite: 1]
call venv\Scripts\activate.bat

REM Upgrade pip (using python -m to avoid permission errors)[cite: 1]
python -m pip install --upgrade pip

REM Install backend dependencies[cite: 1]
pip install -r backend\requirements.txt

REM Install facenet-pytorch without dependencies[cite: 1]
pip install --no-deps facenet-pytorch==2.6.0

REM Move to frontend, install, and build[cite: 1]
cd frontend
call npm install
call npm run build
cd ..

REM Print completion message[cite: 1]
echo.
echo =======================================================
echo Setup complete. 
echo.
echo To run the application, execute the following commands:
echo venv\Scripts\activate.bat
echo cd backend
echo uvicorn main:app --reload
echo =======================================================
pause