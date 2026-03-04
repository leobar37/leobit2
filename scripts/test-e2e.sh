#!/bin/bash

# Script para ejecutar tests E2E completos
# Uso: bun run test:e2e

set -e

echo "🚀 Iniciando tests E2E..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🧹 Limpiando procesos..."
    pkill -f "bun run dev" 2>/dev/null || true
    pkill -f "react-router dev" 2>/dev/null || true
    echo "✅ Procesos limpiados"
}

# Registrar cleanup al salir
trap cleanup EXIT

# PASO 1: Resetear base de datos
echo "🔄 PASO 1: Resetear base de datos..."
cd packages/backend
bun run db:reset
cd ../..
echo -e "${GREEN}✅ Base de datos lista${NC}"
echo ""

# PASO 2: Iniciar backend
echo "🔧 PASO 2: Iniciar backend..."
cd packages/backend
bun run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd ../..
echo "Backend PID: $BACKEND_PID"

# Esperar a que backend esté listo
echo "⏳ Esperando backend..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1 || curl -s http://localhost:5201/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend listo${NC}"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# PASO 3: Iniciar frontend
echo "🎨 PASO 3: Iniciar frontend..."
cd packages/app
VITE_E2E_MODE=true bun run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..
echo "Frontend PID: $FRONTEND_PID"

# Esperar a que frontend esté listo
echo "⏳ Esperando frontend..."
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ | grep -q "200"; then
        echo -e "${GREEN}✅ Frontend listo${NC}"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# PASO 4: Ejecutar tests
echo "🧪 PASO 4: Ejecutar tests..."
echo ""
cd packages/app

# Verificar si se pasó argumento --headed
if [ "$1" == "--headed" ]; then
    bun run test:e2e flujo-vendedor flujo-admin --headed
else
    bun run test:e2e flujo-vendedor flujo-admin
fi

TEST_RESULT=$?
cd ../..

# Resultado final
echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}🎉 TODOS LOS TESTS PASARON${NC}"
else
    echo -e "${RED}❌ ALGUNOS TESTS FALLARON${NC}"
fi

echo ""
echo "📊 Reporte disponible en: packages/app/e2e/playwright-report/index.html"

exit $TEST_RESULT
