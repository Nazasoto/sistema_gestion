@echo off
echo 🚀 EJECUTANDO MIGRACIÓN DE REASIGNACIÓN DE TICKETS
echo ================================================
echo.

cd /d "c:\Users\admconcordia\Desktop\Naza - Acceso directo\repos\sistema_tickets\backend"

echo 📁 Directorio: %CD%
echo 🔧 Ejecutando script de migración directa...
echo.

node run-migration-direct.js

echo.
echo ================================================
echo ✅ PROCESO COMPLETADO
echo ================================================
pause
