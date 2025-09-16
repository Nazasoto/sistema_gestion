# Sistema de Gestión - Frontend

Frontend del sistema de gestión de tickets desarrollado con React + Vite.

## 🚀 Despliegue en Vercel

Este frontend está configurado para desplegarse en Vercel y conectarse con el backend en Railway.

### Variables de Entorno Requeridas

Configura estas variables en tu proyecto de Vercel:

```env
VITE_API_URL=https://sistemagestion-production.up.railway.app
REACT_APP_USE_SESSION_STORAGE=true
REACT_APP_TOKEN_EXPIRATION=7200000
REACT_APP_ENABLE_DEBUG_LOGS=false
```

### Configuración Local

1. Copia `.env.example` a `.env`
2. Actualiza `VITE_API_URL` con tu URL de Railway
3. Instala dependencias: `npm install`
4. Ejecuta en desarrollo: `npm run dev`

### Build para Producción

```bash
npm run build
```

## 🔧 Configuración de Vercel

El archivo `vercel.json` está configurado para:
- Servir el frontend desde Vercel
- Hacer proxy de las llamadas `/api/*` al backend en Railway
- Build automático con Vite

## 📁 Estructura del Proyecto

```
src/
├── components/     # Componentes React
├── config/        # Configuración de la app
├── assets/        # Recursos estáticos
└── ...
```

## 🔗 Backend

El backend está desplegado en Railway. Ver documentación del backend para más detalles.
