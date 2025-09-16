@echo off
echo ========================================
echo   PREPARANDO REPOSITORIO FRONTEND
echo ========================================
echo.

echo 1. Creando carpeta para nuevo repositorio...
mkdir "C:\Users\admconcordia\Desktop\frontend-repo" 2>nul

echo 2. Copiando archivos del frontend...
xcopy "sistema-gestion\*" "C:\Users\admconcordia\Desktop\frontend-repo\" /E /H /Y

echo 3. Copiando configuracion de Vercel...
copy "vercel.json" "C:\Users\admconcordia\Desktop\frontend-repo\"

echo 4. Creando package.json en la raiz...
echo { > "C:\Users\admconcordia\Desktop\frontend-repo\package.json"
echo   "name": "sistema-gestion-frontend", >> "C:\Users\admconcordia\Desktop\frontend-repo\package.json"
echo   "version": "1.0.0", >> "C:\Users\admconcordia\Desktop\frontend-repo\package.json"
echo   "scripts": { >> "C:\Users\admconcordia\Desktop\frontend-repo\package.json"
echo     "build": "npm run build", >> "C:\Users\admconcordia\Desktop\frontend-repo\package.json"
echo     "dev": "npm run dev", >> "C:\Users\admconcordia\Desktop\frontend-repo\package.json"
echo     "preview": "npm run preview" >> "C:\Users\admconcordia\Desktop\frontend-repo\package.json"
echo   } >> "C:\Users\admconcordia\Desktop\frontend-repo\package.json"
echo } >> "C:\Users\admconcordia\Desktop\frontend-repo\package.json"

echo.
echo ========================================
echo   REPOSITORIO PREPARADO EN:
echo   C:\Users\admconcordia\Desktop\frontend-repo
echo ========================================
echo.
echo PROXIMOS PASOS:
echo 1. Actualizar VITE_API_URL en .env con tu URL de Railway
echo 2. Crear nuevo repositorio en GitHub
echo 3. Subir archivos de frontend-repo
echo 4. Conectar con Vercel
echo 5. Configurar variables de entorno en Vercel
echo.
pause
