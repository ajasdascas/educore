@echo off
echo ========================================
echo  DEPLOY A PRODUCCION - EDUCORE
echo ========================================

echo.
echo [1/4] Creando build de produccion...
cd frontend
call npm run build

if %ERRORLEVEL% neq 0 (
    echo ERROR: El build fallo
    pause
    exit /b 1
)

echo [2/4] Build completado exitosamente

echo.
echo [3/4] Los archivos del build estan en ./frontend/.next/
echo Para hacer deploy a produccion:
echo.
echo   1. Subir el contenido de ./frontend/.next/ a tu servidor
echo   2. Asegurate que el backend este corriendo en Railway
echo   3. Verificar que la URL del API sea correcta en api.ts

echo.
echo [4/4] Deploy manual requerido
echo URL de produccion: https://onlineu.mx/educore/
echo Backend Railway: https://educore-production-beef.up.railway.app
echo.

cd ..

echo ========================================
echo  BUILD COMPLETADO - DEPLOY MANUAL
echo ========================================
echo.
echo Presiona cualquier tecla para continuar...
pause >nul