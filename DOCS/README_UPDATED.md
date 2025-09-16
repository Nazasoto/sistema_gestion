# Sistema de Gestión de Tickets - Palmares y Collins S.A.

[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql)](https://mysql.com/)
[![Express](https://img.shields.io/badge/Express-4.18+-000000?logo=express)](https://expressjs.com/)
[![Security](https://img.shields.io/badge/Security-Enterprise-red?logo=shield)]()

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Características Principales](#características-principales)
- [Arquitectura y Tecnologías](#arquitectura-y-tecnologías)
- [Seguridad](#seguridad)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Configuración del Entorno](#configuración-del-entorno)
- [Roles de Usuario](#roles-de-usuario)
- [Funcionalidades por Rol](#funcionalidades-por-rol)
- [API Documentation](#api-documentation)
- [Despliegue](#despliegue)
- [Changelog](#changelog)

## Descripción General

Sistema de Gestión de Tickets es una aplicación web empresarial diseñada específicamente para Palmares y Collins S.A. Permite la gestión integral de tickets de soporte técnico con un flujo de trabajo optimizado, seguimiento en tiempo real, reportes avanzados y un sistema de seguridad robusto. La aplicación maneja múltiples sucursales, usuarios con diferentes roles y proporciona herramientas de análisis para mejorar la eficiencia del soporte técnico.

### Características Destacadas
- ✅ **Sistema de tickets completo** con estados, prioridades y categorías
- ✅ **Gestión de usuarios multi-rol** (Admin, Supervisor, Soporte, Sucursal)
- ✅ **Dashboard en tiempo real** con métricas y estadísticas
- ✅ **Sistema de reasignación** de tickets con historial completo
- ✅ **Reportes profesionales** con gráficos y exportación
- ✅ **Seguridad empresarial** con rate limiting y protección contra ataques
- ✅ **Gestión de archivos adjuntos** con validación de seguridad
- ✅ **Sistema de recuperación de contraseñas** por email
- ✅ **Actividad de usuarios en tiempo real** con indicadores online/offline
- ✅ **Configuración dinámica** de perfiles de usuario

## Características Principales

### 🎫 **Gestión Avanzada de Tickets**
- Creación, asignación y seguimiento completo de tickets
- Estados: Nuevo → En Progreso → Resuelto → Cerrado/Cancelado
- Sistema de prioridades (Baja, Media, Alta, Crítica)
- Categorías personalizables (Hardware, Software, Red, etc.)
- Reasignación de tickets con historial completo
- Archivos adjuntos con validación de seguridad
- Comentarios y seguimiento de cambios

### 👥 **Sistema Multi-Rol**
- **Admin**: Control total del sistema, gestión de usuarios
- **Supervisor**: Monitoreo completo, reportes avanzados
- **Soporte**: Gestión de tickets asignados, bandeja de entrada
- **Sucursal**: Creación de tickets, seguimiento de estado

### 📊 **Reportes y Analytics**
- Dashboard profesional con métricas en tiempo real
- Reportes por usuario, sucursal, categoría y período
- Gráficos interactivos con ECharts
- Exportación a Excel/PDF
- Análisis de rendimiento y SLA

### 🔒 **Seguridad Empresarial**
- Rate limiting inteligente (desarrollo/producción)
- Protección contra fuerza bruta
- Validación y sanitización de datos
- Headers de seguridad (Helmet)
- Logging de seguridad con rotación automática
- JWT con configuración segura

### 📧 **Sistema de Comunicación**
- Recuperación de contraseñas por email
- Notificaciones automáticas
- Templates de email profesionales
- Configuración SMTP flexible

## Arquitectura y Tecnologías

### Frontend
- **React 19.1.0** - Framework principal
- **Vite 7.0.4** - Build tool y dev server
- **React Router DOM 7.7.1** - Enrutamiento SPA
- **ECharts** - Gráficos y visualizaciones
- **FontAwesome** - Iconografía
- **Axios** - Cliente HTTP
- **Date-fns** - Manejo de fechas con timezone Argentina
- **JWT** - Autenticación y autorización
- **React Hook Form** - Manejo de formularios
- **Yup** - Validación de esquemas
- **Tailwind CSS** - Estilos

### Backend
- **Node.js 18+** - Runtime de JavaScript
- **Express.js** - Framework web
- **MySQL 8.0+** - Base de datos principal
- **JWT** - Autenticación y autorización
- **Bcrypt** - Hash de contraseñas
- **Nodemailer** - Envío de emails
- **Winston** - Logging avanzado

### Seguridad
- **Express Rate Limit** - Rate limiting
- **Express Slow Down** - Ralentización progresiva
- **Helmet** - Headers de seguridad
- **Joi** - Validación de esquemas
- **DOMPurify** - Sanitización XSS

## Seguridad

### Protección contra Ataques
- **Rate Limiting**: Configuración diferenciada para desarrollo/producción
- **Brute Force Protection**: Bloqueo automático por intentos fallidos
- **XSS Prevention**: Sanitización de entradas con DOMPurify
- **SQL Injection**: Consultas parametrizadas
- **CSRF Protection**: Headers y validación de origen

### Configuración de Seguridad
```javascript
// Desarrollo
MAX_ATTEMPTS: 50
BLOCK_DURATION: 1 minuto
RATE_LIMIT: 1000 requests/minuto

// Producción
MAX_ATTEMPTS: 5
BLOCK_DURATION: 15 minutos
RATE_LIMIT: 20 requests/15 minutos
```

### Logging de Seguridad
- Eventos de seguridad con severidad (CRITICAL, HIGH, MEDIUM, LOW)
- Rotación automática de logs (10MB, 5 archivos)
- Limpieza automática (30 días)
- Sanitización de datos sensibles

## Estructura del Proyecto

```
sistema_tickets/
├── backend/                     # Backend Node.js/Express
│   ├── config/                  # Configuraciones
│   │   └── database.js         # Configuración MySQL
│   ├── controllers/            # Controladores de API
│   │   ├── authController.js   # Autenticación
│   │   ├── ticketController.js # Gestión de tickets
│   │   ├── userController.js   # Gestión de usuarios
│   │   └── reportController.js # Reportes
│   ├── middlewares/            # Middlewares personalizados
│   │   ├── bruteForceProtection.js # Protección contra fuerza bruta
│   │   ├── rateLimiting.js     # Rate limiting
│   │   ├── validation.js       # Validación de datos
│   │   └── secureLogger.js     # Logging seguro
│   ├── repositories/           # Capa de datos
│   │   ├── ticketRepository.js # Operaciones de tickets
│   │   ├── userRepository.js   # Operaciones de usuarios
│   │   └── reportRepository.js # Operaciones de reportes
│   ├── routes/                 # Rutas de API
│   ├── services/               # Servicios de negocio
│   └── server.js              # Punto de entrada
│
├── sistema-gestion/            # Frontend React
│   ├── src/
│   │   ├── components/         # Componentes reutilizables
│   │   │   ├── auth/          # Componentes de autenticación
│   │   │   ├── dashboard/     # Dashboards por rol
│   │   │   ├── tickets/       # Gestión de tickets
│   │   │   └── common/        # Componentes comunes
│   │   ├── pages/             # Páginas principales
│   │   │   ├── admin/         # Páginas de administrador
│   │   │   ├── supervisor/    # Páginas de supervisor
│   │   │   ├── soporte/       # Páginas de soporte
│   │   │   └── sucursal/      # Páginas de sucursal
│   │   ├── services/          # Servicios de API
│   │   ├── context/           # Contextos de React
│   │   └── utils/             # Utilidades
│   └── public/                # Archivos estáticos
│
└── DOCS/                      # Documentación
    ├── README.md              # Este archivo
    ├── API.md                 # Documentación de API
    └── CHANGELOG.md           # Historial de cambios
```

## Configuración del Entorno

### Variables de Entorno Backend (.env)

```bash
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sistema_tickets
DB_USER=root
DB_PASSWORD=password

# JWT
JWT_SECRET=nazarepro
JWT_EXPIRES_IN=38hs


# Configuración
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:5173,https://your-frontend-domain.com

# Frontend URL para emails
FRONTEND_URL=http://localhost:5173
```

### Variables de Entorno Frontend (.env)

```bash
# API URL
VITE_API_URL=http://localhost:3001
```

## Roles de Usuario

### 🟡 **Supervisor**
- **Acceso**: Monitoreo y reportes
- **Permisos**: Ver todos los tickets, generar reportes
- **Dashboard**: Estadísticas completas, análisis de rendimiento
- **Funciones**: Supervisión de equipo, reportes avanzados

### 🟢 **Soporte**
- **Acceso**: Tickets asignados y bandeja general
- **Permisos**: Tomar tickets, cambiar estados, reasignar
- **Dashboard**: Métricas personales, tickets activos
- **Funciones**: Resolución de tickets, gestión de carga de trabajo

### 🔵 **Sucursal**
- **Acceso**: Crear tickets y ver historial propio
- **Permisos**: Crear tickets, ver estado, cancelar tickets nuevos
- **Dashboard**: Estado del equipo de soporte, tickets propios
- **Funciones**: Reportar incidencias, seguimiento de tickets

## Funcionalidades por Rol

### Supervisor
- ✅ Monitoreo de todos los tickets
- ✅ Reportes avanzados con filtros
- ✅ Análisis de rendimiento por técnico
- ✅ Estadísticas de SLA
- ✅ Exportación de datos
- ✅ Dashboard con métricas en tiempo real

### Soporte
- ✅ Bandeja de tickets nuevos
- ✅ Historial de tickets asignados
- ✅ Sistema de "Tomar ticket"
- ✅ Cambio de estados de tickets
- ✅ Reasignación de tickets
- ✅ Gestión de archivos adjuntos
- ✅ Indicadores de carga de trabajo

### Sucursal
- ✅ Creación de tickets con categorías
- ✅ Adjuntar archivos a tickets
- ✅ Ver historial de tickets propios
- ✅ Cancelar tickets en estado "nuevo"
- ✅ Dashboard con estado del equipo de soporte
- ✅ Indicadores online/offline de técnicos

## API Documentation

### Autenticación

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "usuario": "user@example.com",
  "password": "password123"
}
```

### Tickets

#### Obtener Tickets
```http
GET /api/tickets
Authorization: Bearer <token>
Query Parameters:
  - estado: nuevo|en_progreso|resuelto|cerrado|cancelado
  - prioridad: baja|media|alta|critica
  - usuario: user_id
  - sucursal: sucursal_id
```

#### Crear Ticket
```http
POST /api/tickets
Authorization: Bearer <token>
Content-Type: application/json

{
  "asunto": "Problema con impresora",
  "descripcion": "La impresora no responde",
  "prioridad": "media",
  "categoria": "hardware"
}
```

#### Reasignar Ticket
```http
POST /api/tickets/:id/reasignar
Authorization: Bearer <token>
Content-Type: application/json

{
  "nuevoUsuarioId": 123,
  "comentario": "Reasignando por especialización"
}
```

### Reportes

#### Obtener Reportes
```http
GET /api/reportes
Authorization: Bearer <token>
Query Parameters:
  - fechaInicio: YYYY-MM-DD
  - fechaFin: YYYY-MM-DD
  - usuarioAsignado: user_id
  - estado: ticket_status
```

### Seguridad

#### Limpiar Bloqueos (Solo Desarrollo)
```http
POST /api/security/clear-blocks
```

#### Estadísticas de Seguridad
```http
GET /api/security/brute-force-stats
Authorization: Bearer <token>
```

## Despliegue

### Desarrollo Local

1. **Clonar repositorio**
```bash
git clone https://github.com/Nazasoto/sistema_tickets.git
cd sistema_tickets
npm install 
```

2. **Configurar Backend**
```bash
cd backend
npm install
cp .env.example .env
# Configurar variables de entorno
npm run dev
```

3. **Configurar Frontend**
```bash
cd ../sistema-gestion
npm install
cp .env.example .env
# Configurar VITE_API_URL
npm run dev
```

### Producción

#### Railway (Backend)
- Base de datos MySQL en Railway
- Variables de entorno configuradas
- Deploy automático desde GitHub (https://github.com/Nazasoto/sistema_tickets.git) / Si se desea que el proyecto en otro repositorio, se debe configurar el deploy manualmente

#### Vercel (Frontend)
- Deploy automático desde GitHub (https://github.com/Nazasoto/sistema_tickets.git) / Si se desea que el proyecto en otro repositorio, se debe configurar el deploy manualmente
- Variables de entorno  
- Rewrites para SPA routing

### Docker (Opcional)
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    
  frontend:
    build: ./sistema-gestion
    ports:
      - "80:80"
```

## Changelog

### v2.5.0 (Enero 2025)
- ✅ Sistema de seguridad empresarial completo
- ✅ Rate limiting inteligente desarrollo/producción
- ✅ Protección contra fuerza bruta
- ✅ Logging de seguridad con rotación automática
- ✅ Headers de seguridad con Helmet
- ✅ Validación y sanitización robusta

### v2.4.0 (Diciembre 2024)
- ✅ Sistema de recuperación de contraseñas por email
- ✅ Templates de email profesionales
- ✅ Configuración dinámica de perfiles de usuario
- ✅ Mejoras en la interfaz de configuración

### v2.3.0 (Noviembre 2024)
- ✅ Reportes profesionales con gráficos ECharts
- ✅ Dashboard avanzado para supervisores
- ✅ Métricas en tiempo real
- ✅ Exportación a Excel/PDF

### v2.2.0 (Octubre 2024)
- ✅ Sistema de reasignación de tickets
- ✅ Historial completo de cambios
- ✅ Indicadores de carga de trabajo
- ✅ Actividad de usuarios en tiempo real

### v2.1.0 (Septiembre 2024)
- ✅ Migración a MySQL desde JSON
- ✅ Sistema de archivos adjuntos
- ✅ Mejoras en la interfaz de usuario
- ✅ Optimización de rendimiento

### v2.0.0 (Agosto 2024)
- ✅ Refactorización completa de la arquitectura
- ✅ Sistema multi-rol implementado
- ✅ Dashboard específico por rol
- ✅ API RESTful completa

## Contribución

### Flujo de Desarrollo
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Estándares de Código
- ESLint para JavaScript
- Prettier para formato
- Conventional Commits
- Testing con Jest (backend) y React Testing Library (frontend)

### Estructura de Commits
```
feat: agregar nueva funcionalidad
fix: corregir bug
docs: actualizar documentación
style: cambios de formato
refactor: refactorización de código
test: agregar o modificar tests
chore: tareas de mantenimiento
```

---
