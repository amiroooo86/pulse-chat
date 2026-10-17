@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo        PULSE CHAT - LOCAL SERVER
echo ========================================


:check_node
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found.
  echo Install Node.js 24 LTS/current and run this file again.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODE_MAJOR=%%v
if not "%NODE_MAJOR%"=="24" (
  echo.
  echo This project is configured for Node.js 24.x.
  echo Detected Node.js: %NODE_MAJOR%
  echo Please install/use Node.js 24.x.
  pause
  exit /b 1
)

echo Node.js 24 detected.

if not exist "server\.env" (
  copy "server\.env.example" "server\.env" >nul
  echo Created server\.env
)

if not exist "server\node_modules\express" if not exist "server\node_modules\sql.js" if not exist "server\node_modules\dotenv" (
  echo.
  echo Installing server dependencies...
  call npm install --prefix server
  if errorlevel 1 (
    echo.
    echo Server dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "client\node_modules\vite" if not exist "client\node_modules\react" if not exist "client\node_modules\axios" (
  echo.
  echo Installing client dependencies...
  call npm install --prefix client
  if errorlevel 1 (
    echo.
    echo Client dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "server\uploads" mkdir "server\uploads"
if not exist "server\data" mkdir "server\data"

echo.
echo Starting backend on http://localhost:3000 ...
start "Pulse Chat Server" cmd /k "cd /d "%~dp0server" && npm run dev"

echo Starting frontend on http://localhost:5173 ...
start "Pulse Chat Client" cmd /k "cd /d "%~dp0client" && npm run dev"

timeout /t 4 /nobreak >nul
start http://localhost:5173

endlocal
exit /b 0
