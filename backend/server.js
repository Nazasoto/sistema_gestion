import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

// Importar servicios
import userService from './services/user.service.js';
import ticketService from './services/ticket.service.js';
import noticiasRouter from './noticias.routes.js';
import { authenticate, authorizeRoles, signToken } from './middlewares/auth.js';
import { testConnection } from './config/database.js';

// Importar las nuevas rutas de tickets
import ticketRoutes from './routes/ticketRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import authRoutes from './routes/authRoutes.js';
import passwordResetRoutes from './routes/passwordReset.routes.js';
import bitacoraRoutes from './routes/bitacoraRoutes.js';
import passwordResetRequestRepository from './repositories/passwordResetRequestRepository.js';

// Importar middleware de protección contra fuerza bruta
import { 
  bruteForceProtection, 
  recordFailedAttempt, 
  clearFailedAttempts,
  loginRateLimit,
  loginSlowDown,
  getBruteForceStats,
  clearAllBlocks
} from './middlewares/bruteForceProtection.js';

// Importar middleware de tracking de actividad
import { activityTracker, trackUserActivity } from './middleware/userActivity.js';

// Importar middlewares de seguridad avanzada
import {
  criticalApiLimiter,
  authApiLimiter,
  generalApiLimiter,
  apiSlowDown,
  validateSecurityHeaders,
  validateOrigin,
  detectAttackPatterns,
  adminEndpointProtection,
  enhancedSecurityHeaders
} from './middlewares/apiSecurity.js';

import { secureLogger } from './middlewares/secureLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configurar trust proxy para Railway de forma específica
app.set('trust proxy', 1);

// Middlewares
// Configuración de CORS simplificada
const allowedOrigins = [
  'https://soportepalmares.vercel.app',
  'https://soportepalmares-n9gnikcol-palmares-collins.vercel.app',
  'https://soporte-palmares.vercel.app',
  'https://soportepalmares-lake.vercel.app',
  'https://sistema-tickets-frontend.vercel.app',
  'https://sistema-tickets.vercel.app',
  'https://sistema-tickets-git-main-nazasoto.vercel.app',
  'https://sistema-tickets-nazasoto.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : [])
].filter(Boolean);

// Permitir cualquier subdominio de vercel.app y railway.app en producción
if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push(/\.vercel\.app$/);
  allowedOrigins.push(/\.railway\.app$/);
}

// console.log('Orígenes permitidos:', allowedOrigins);

// Middleware CORS personalizado
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isOriginAllowed = (origin) => {
    if (!origin) return false;
    if (allowedOrigins.includes('*')) return true;
    if (allowedOrigins.includes(origin)) return true;
    
    // Verificar patrones de expresión regular
    return allowedOrigins.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return false;
    });
  };
  
  // Configuración de encabezados CORS
  if (isOriginAllowed(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Request-ID, Accept, Cache-Control, Pragma, Expires');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Date, X-Request-ID');
    res.header('Access-Control-Max-Age', '86400');
  }
  
  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Aplicar headers de seguridad mejorados
app.use(enhancedSecurityHeaders);

// Aplicar rate limiting general y slowdown
app.use('/api', generalApiLimiter);
app.use('/api', apiSlowDown);

// Aplicar validaciones de seguridad básicas (solo para endpoints críticos)
app.use('/api/security', validateSecurityHeaders);
app.use('/api/password-reset', detectAttackPatterns);

app.use(express.json({ limit: '5mb' })); // Reducido de 10mb a 5mb
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Servir archivos estáticos del frontend en producción
const frontendPath = join(__dirname, '../sistema-gestion/dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendPath));
}

// Middleware para manejar rutas de API
// app.use('/api/noticias', noticiasRouter); // Comentado para evitar duplicación

// Crear directorio de datos si no existe
const dataDir = join(__dirname, 'data');
fs.mkdir(dataDir, { recursive: true }).catch(console.error);

// Middleware para logging de peticiones
app.use('/api/auth', (req, res, next) => {
  // console.log(`🌐 ${req.method} ${req.originalUrl} - Body:`, req.body);
  next();
});

// Rutas de autenticación con protección adicional
app.use('/api/auth', authApiLimiter);
app.use('/api/auth', validateOrigin);
app.use('/api/auth', authRoutes);

// Rutas de solicitudes de reset de contraseña con protección crítica
app.use('/api/password-reset', criticalApiLimiter);
app.use('/api/password-reset', validateOrigin);
app.use('/api/password-reset', passwordResetRoutes);

// Middleware para rastrear actividad de usuario en todas las rutas autenticadas
app.use('/api', (req, res, next) => {
  // Solo aplicar autenticación y tracking a rutas que no sean públicas
  if (req.path.includes('/auth/login') || req.path.includes('/auth/forgot-password') || req.path.includes('/auth/reset-password') || req.path.includes('/health')) {
    return next();
  }
  
  // Aplicar autenticación
  authenticate(req, res, (err) => {
    if (err) return next(err);
    
    // Si hay usuario autenticado, actualizar actividad automáticamente
    if (req.user && req.user.id) {
      activityTracker.updateActivity(req.user.id, req.user);
      // console.log(`🔄 Actividad actualizada automáticamente: ${req.user.nombre} - ${req.method} ${req.path}`);
    }
    
    next();
  });
});

// Endpoint para registrar actividad de usuario (heartbeat)
app.post('/api/users/heartbeat', (req, res) => {
  try {
    activityTracker.updateActivity(req.user.id, req.user);
    res.json({ success: true, message: 'Heartbeat registrado' });
  } catch (error) {
    console.error('Error en heartbeat:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para limpiar actividad al hacer logout
app.post('/api/users/logout-activity', (req, res, next) => {
  // console.log('🚪 Recibida petición de logout-activity');
  
  // Aplicar autenticación manualmente para este endpoint
  authenticate(req, res, (err) => {
    if (err) {
      console.error('❌ Error de autenticación en logout:', err);
      return next(err);
    }
    
    try {
      // console.log(`🚪 Limpiando actividad para usuario: ${req.user.nombre} (ID: ${req.user.id})`);
      const removed = activityTracker.removeActivity(req.user.id);
      
      if (removed) {
        // console.log(`✅ Usuario ${req.user.nombre} marcado como desconectado exitosamente`);
      } else {
        // console.log(`⚠️ No se encontró actividad para el usuario ${req.user.nombre}`);
      }
      
      res.json({ success: true, message: 'Actividad limpiada', removed });
    } catch (error) {
      console.error('❌ Error limpiando actividad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
});

// Endpoints de seguridad con protección administrativa
app.use('/api/security', adminEndpointProtection);

// Endpoint para estadísticas de seguridad (solo admin)
app.get('/api/security/brute-force-stats', authenticate, authorizeRoles('admin'), (req, res) => {
  try {
    const stats = getBruteForceStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de fuerza bruta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para limpiar bloqueos de fuerza bruta (desarrollo)
app.post('/api/security/clear-blocks', (req, res) => {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      error: 'Esta funcionalidad solo está disponible en desarrollo' 
    });
  }
  
  try {
    const result = clearAllBlocks();
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error limpiando bloqueos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para logs de seguridad (solo admin)
app.get('/api/security/logs', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await secureLogger.getSecurityLogs(limit);
    res.json({
      success: true,
      data: logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo logs de seguridad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar perfil del usuario con protección adicional
app.put('/api/auth/profile', criticalApiLimiter, authenticate, async (req, res) => {
  try {
    const { nombre, apellido, telefono, email } = req.body;
    
    // Validar que al menos un campo esté presente
    if (!nombre && !apellido && !telefono && !email) {
      return res.status(400).json({ error: 'Al menos un campo debe ser proporcionado' });
    }

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (apellido !== undefined) updates.apellido = apellido;
    if (telefono !== undefined) updates.telefono = telefono;
    if (email !== undefined) updates.email = email;

    const updatedUser = await userService.update(req.user.id, updates);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    if (error.message.includes('correo electrónico ya está en uso')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar contraseña con protección crítica
app.put('/api/auth/change-password', criticalApiLimiter, authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const result = await userService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    if (error.message.includes('contraseña actual es incorrecta')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de usuarios (MySQL)
app.get('/api/usuarios', authenticate, authorizeRoles('admin', 'supervisor', 'soporte', 'sucursal'), async (req, res, next) => {
  try {
    // Actualizar actividad del usuario que hace la petición
    activityTracker.updateActivity(req.user.id, req.user);
    
    const users = await userService.getAll();
    
    // Filtrar por rol si se especifica en query params
    const { role } = req.query;
    let filteredUsers = users;
    
    if (role) {
      filteredUsers = users.filter(user => user.role === role);
    }

    // Si se solicitan usuarios de soporte, agregar información de actividad
    if (role === 'soporte') {
      const activeUsers = activityTracker.getAllActiveUsers();
      
      // Obtener conteo real de tickets activos por usuario
      let ticketCounts = [];
      try {
        const { query } = await import('./config/database.js');
        const countResult = await query(`
          SELECT 
            usuario_asignado_id as id_usuario,
            COUNT(*) as tickets_asignados
          FROM tickets 
          WHERE usuario_asignado_id IS NOT NULL 
            AND estado IN ('nuevo', 'en_progreso')
          GROUP BY usuario_asignado_id
        `);
        ticketCounts = countResult;
      } catch (error) {
        console.error('Error obteniendo conteo de tickets:', error);
        ticketCounts = [];
      }
      
      // Combinar datos de usuarios con estado de actividad y conteo de tickets
      const usersWithActivity = filteredUsers.map(user => {
        const activityData = activeUsers.find(active => {
          return active.id_usuario === user.id;
        });
        
        // Buscar conteo de tickets para este usuario
        const userTicketCount = ticketCounts.find(count => count.id_usuario === user.id);
        const ticketsActivos = userTicketCount ? userTicketCount.tickets_asignados : 0;
        
        // Determinar carga de trabajo basada en tickets activos
        let cargaTrabajo;
        if (ticketsActivos === 0) {
          cargaTrabajo = { nivel: 'disponible', color: '#28a745', descripcion: 'Disponible' };
        } else if (ticketsActivos <= 3) {
          cargaTrabajo = { nivel: 'poco_ocupado', color: '#ffc107', descripcion: 'Poco ocupado' };
        } else if (ticketsActivos <= 6) {
          cargaTrabajo = { nivel: 'ocupado', color: '#fd7e14', descripcion: 'Ocupado' };
        } else {
          cargaTrabajo = { nivel: 'muy_ocupado', color: '#dc3545', descripcion: 'Muy ocupado' };
        }
        
        const result = {
          ...user,
          isOnline: activityData ? activityData.isOnline : false,
          lastSeen: activityData ? activityData.lastSeen : null,
          minutesAgo: activityData ? activityData.minutesAgo : null,
          ticketsAsignados: ticketsActivos,
          cargaTrabajo: cargaTrabajo
        };
        
        return result;
      });

      return res.json(usersWithActivity);
    }

    res.json(filteredUsers);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/usuarios', authenticate, authorizeRoles('admin'), async (req, res, next) => {
  try {
    // Asegurarse de que el campo sucursal esté incluido
    const userData = {
      ...req.body,
      sucursal: req.body.sucursal || null
    };
    const created = await userService.create(userData);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.get('/api/usuarios/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const user = await userService.getById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    // Asegurarse de que el campo sucursal esté incluido
    const userWithSucursal = {
      ...user,
      sucursal: user.sucursal || null
    };
    
    res.json(userWithSucursal);
  } catch (error) {
    next(error);
  }
});

app.put('/api/usuarios/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    // Solo los administradores pueden actualizar roles
    if (req.body.role && req.user.role !== 'admin') {
      delete req.body.role;
    }
    
    // Asegurarse de que el campo sucursal esté incluido
    const updateData = {
      ...req.body,
      sucursal: req.body.sucursal || null
    };
    
    const updated = await userService.update(req.params.id, updateData);
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    // Asegurarse de que el campo sucursal esté incluido en la respuesta
    const updatedWithSucursal = {
      ...updated,
      sucursal: updated.sucursal || null
    };
    
    res.json(updatedWithSucursal);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/usuarios/:id', authenticate, authorizeRoles('admin'), async (req, res, next) => {
  try {
    await userService.delete(parseInt(req.params.id));
    res.status(204).end();
  } catch (error) { next(error); }
});

// Alias en inglés para compatibilidad con el frontend
app.get('/api/users', authenticate, authorizeRoles('admin', 'supervisor'), async (req, res, next) => {
  try {
    const users = await userService.getAll();
    res.json(users);
  } catch (error) { next(error); }
});
app.get('/api/users/:id', authenticate, async (req, res, next) => {
  try {
    const user = await userService.getById(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    // Asegurarse de que el campo sucursal esté incluido
    const userWithSucursal = {
      ...user,
      sucursal: user.sucursal || null
    };
    res.json(userWithSucursal);
  } catch (error) {
    next(error);
  }
});

// Montar las rutas de tickets
app.use('/api/tickets', ticketRoutes);

// Montar las rutas de reportes
app.use('/api/reportes', reportRoutes);

// Montar las rutas de bitácora
app.use('/api/bitacora', bitacoraRoutes);

// Mantener compatibilidad con rutas existentes
app.get('/api/ticket', authenticate, async (req, res, next) => {
  try {
    const filters = {
      usuarioId: req.user.id, // Siempre filtrar por el usuario autenticado
      ...req.query // Mantener compatibilidad con filtros existentes
    };
    
    // Si el usuario es administrador y se especifica un usuarioId, usarlo
    if (req.user.role === 'admin' && req.query.usuarioId) {
      filters.usuarioId = req.query.usuarioId;
    }
    
    const tickets = await ticketService.getAll(filters);
    res.json(tickets);
  } catch (error) {
    next(error);
  }
});

// Ruta para crear un nuevo ticket (mantener compatibilidad)
app.post('/api/ticket', authenticate, async (req, res, next) => {
  try {
    const ticket = await ticketService.create(req.body, req.user.id);
    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
});

// Ruta para obtener un ticket por ID (mantener compatibilidad)
app.get('/api/ticket/:id', authenticate, async (req, res, next) => {
  try {
    const ticket = await ticketService.getById(parseInt(req.params.id), req.user.id);
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

// Ruta para actualizar un ticket (mantener compatibilidad)
app.put('/api/tickets/:id', authenticate, async (req, res, next) => {
  try {
    const updated = await ticketService.update(
      parseInt(req.params.id), 
      req.body, 
      req.user.id
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Ruta para eliminar un ticket (mantener compatibilidad)
app.delete('/api/tickets/:id', authenticate, async (req, res, next) => {
  try {
    await ticketService.delete(parseInt(req.params.id), req.user.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Ruta para cambiar el estado de un ticket (mantener compatibilidad)
app.patch('/api/tickets/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await ticketService.changeStatus(
      parseInt(req.params.id), 
      status, 
      req.user.id
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Ruta para asignar un ticket a un usuario (mantener compatibilidad)
app.post('/api/tickets/:id/assign', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.body;
    const updated = await ticketService.assignTo(
      parseInt(req.params.id), 
      userId, 
      req.user.id
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Ruta para obtener estadísticas de tickets (nueva ruta)
app.get('/api/tickets/estadisticas', authenticate, async (req, res, next) => {
  try {
    const stats = await ticketService.getStats(req.user.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Montar router de noticias (memoria por ahora; migrable a MySQL)
app.use('/api/noticias', noticiasRouter);

// Ruta de prueba
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API funcionando correctamente',
    rutas_disponibles: [
      'POST /api/auth/login',
      'POST /api/auth/register (admin)',
      'GET /api/auth/me',
      'GET /api/usuarios (admin)',
      'POST /api/usuarios (admin)',
      'PUT /api/usuarios/:id (admin o dueño)',
      'DELETE /api/usuarios/:id (admin)',
      'GET /api/tickets (auth)',
      'GET /api/tickets/:id (auth)',
      'POST /api/tickets (auth)',
      'PUT /api/tickets/:id (admin/soporte)',
      'PATCH /api/tickets/:id/status (admin/soporte)',
      'DELETE /api/tickets/:id (admin)'
    ]
  });
});

// Endpoint para obtener sucursales únicas
app.get('/api/sucursales', authenticate, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT sucursal 
      FROM usuarios 
      WHERE sucursal IS NOT NULL 
        AND sucursal != '' 
      ORDER BY sucursal ASC
    `;
    
    const { query: dbQuery } = await import('./config/database.js');
    const results = await dbQuery(query);
    
    const sucursales = results.map(row => ({
      id: row.sucursal,
      nombre: row.sucursal
    }));
    
    res.json(sucursales);
  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Healthcheck
app.get('/api/health', async (req, res) => {
  try {
    const dbOk = await testConnection();
    res.json({ ok: true, db: dbOk, time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Health check failed' });
  }
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  res.status(statusCode).json({ error: message });
});

// Middleware para manejar rutas de SPA en producción
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Solo servir index.html para rutas que no sean de API
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(frontendPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

// Inicializar tablas al iniciar servidor
async function initializeTables() {
  try {
    await passwordResetRequestRepository.createTable();
    // console.log('✅ Tabla password_reset_requests inicializada');
  } catch (error) {
    console.error('❌ Error inicializando tablas:', error);
  }
}

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  // console.log(`Server running on port ${PORT}`);
  // console.log(` Directorio de datos: ${dataDir}`);
  
  // Inicializar tablas
  await initializeTables();
  
  // console.log('\nEndpoints disponibles:');
  // console.log(`- POST   http://localhost:${PORT}/api/auth/login`);
  // console.log(`- POST   http://localhost:${PORT}/api/auth/forgot-password`);
  // console.log(`- POST   http://localhost:${PORT}/api/auth/reset-password`);
  // console.log(`- GET    http://localhost:${PORT}/api/usuarios`);
  // console.log(`- GET    http://localhost:${PORT}/api/usuarios/:id`);
  // console.log(`- GET    http://localhost:${PORT}/api/users`);
  // console.log(`- GET    http://localhost:${PORT}/api/users/:id`);
  // console.log(`- GET    http://localhost:${PORT}/api/tickets`);
  // console.log(`- POST   http://localhost:${PORT}/api/tickets\n`);
});
