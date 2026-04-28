@echo off
echo ========================================
echo  INICIANDO SERVIDORES DE DESARROLLO
echo ========================================

echo.
echo [1/3] Verificando dependencias...

REM Verificar si existe el directorio del backend
if not exist "backend\" (
    echo ERROR: No se encontro el directorio backend
    pause
    exit /b 1
)

REM Verificar si existe el directorio del frontend
if not exist "frontend\" (
    echo ERROR: No se encontro el directorio frontend
    pause
    exit /b 1
)

echo [2/3] Iniciando backend (Go)...
start "Backend Server" cmd /k "cd backend && go run cmd/server/main.go"

echo [3/3] Esperando 3 segundos e iniciando frontend (Next.js)...
timeout /t 3 /nobreak >nul
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo  SERVIDORES INICIADOS
echo ========================================
echo.
echo Backend:  http://localhost:8082
echo Frontend: http://localhost:3000
echo.
echo Presiona cualquier tecla para cerrar este terminal...
pause >nul