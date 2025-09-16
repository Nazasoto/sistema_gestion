@echo off
echo 🚀 Ejecutando migración de reasignación de tickets...
echo.

cd /d "c:\Users\admconcordia\Desktop\Naza - Acceso directo\repos\sistema_tickets\backend"

echo 📁 Directorio actual: %CD%
echo.

echo 🔧 Ejecutando migración...
node run-migration.js

echo.
echo ✅ Migración completada
pause
