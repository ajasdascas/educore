#!/bin/bash

echo "========================================"
echo " INICIANDO SERVIDORES DE DESARROLLO"
echo "========================================"

echo
echo "[1/3] Verificando dependencias..."

# Verificar directorios
if [ ! -d "backend" ]; then
    echo "ERROR: No se encontró el directorio backend"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "ERROR: No se encontró el directorio frontend"
    exit 1
fi

echo "[2/3] Iniciando backend (Go)..."
cd backend
gnome-terminal --tab --title="Backend Server" -- bash -c "go run cmd/server/main.go; exec bash" 2>/dev/null || \
osascript -e 'tell application "Terminal" to do script "cd '$(pwd)' && go run cmd/server/main.go"' 2>/dev/null || \
echo "Ejecuta manualmente: cd backend && go run cmd/server/main.go"

cd ..

echo "[3/3] Esperando 3 segundos e iniciando frontend (Next.js)..."
sleep 3
cd frontend
gnome-terminal --tab --title="Frontend Server" -- bash -c "npm run dev; exec bash" 2>/dev/null || \
osascript -e 'tell application "Terminal" to do script "cd '$(pwd)' && npm run dev"' 2>/dev/null || \
echo "Ejecuta manualmente: cd frontend && npm run dev"

cd ..

echo
echo "========================================"
echo " SERVIDORES INICIADOS"
echo "========================================"
echo
echo "Backend:  http://localhost:8082"
echo "Frontend: http://localhost:3000"
echo