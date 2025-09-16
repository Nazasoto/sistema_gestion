import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { activityTracker } from '../middleware/userActivity.js';
import { 
  bruteForceProtection, 
  recordFailedAttempt, 
  clearFailedAttempts 
} from '../middlewares/bruteForceProtection.js';
import { registrarEventoHelper } from '../controllers/bitacoraController.js';

const router = express.Router();

// Login existente (mantener)
router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    
    // console.log('🔍 LOGIN ATTEMPT:');
    // console.log('   Usuario recibido:', usuario);
    // console.log('   Password recibido:', password ? '[PRESENTE]' : '[FALTANTE]');

    if (!usuario || !password) {
      // console.log('❌ Faltan credenciales');
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Buscar usuario ACTIVO solamente (por usuario o email)
    // console.log('🔍 Buscando usuario en BD...');
    const users = await query(
      'SELECT * FROM usuarios WHERE (usuario = ? OR mail = ?) AND estado = "activo"',
      [usuario, usuario]
    );

    // console.log(`📊 Usuarios encontrados: ${users.length}`);
    
    if (users.length === 0) {
      // console.log('❌ Usuario no encontrado o no activo');
      // Buscar sin filtro de estado para debug
      const allUsers = await query(
        'SELECT usuario, mail, estado FROM usuarios WHERE (usuario = ? OR mail = ?)',
        [usuario, usuario]
      );
      // console.log('🔍 Usuarios con cualquier estado:', allUsers);
      return res.status(401).json({ error: 'Credenciales inválidas o cuenta no activada' });
    }

    const user = users[0];
    // console.log('✅ Usuario encontrado:', user.usuario, '| Estado:', user.estado);

    // Verificar contraseña con comparación directa (texto plano)
    // console.log('🔑 Verificando contraseña...');
    const isValidPassword = password === user.password;
    // console.log(`🔑 Verificación texto plano para ${user.role}: ${isValidPassword ? 'SÍ' : 'NO'}`);
    
    if (!isValidPassword) {
      // console.log('❌ Contraseña incorrecta');
      
      // Registrar intento de login fallido
      await registrarEventoHelper({
        tipo_evento: 'seguridad',
        descripcion: `Intento de login fallido para usuario: ${usuario}`,
        detalles: {
          usuario_intento: usuario,
          motivo: 'contraseña_incorrecta'
        },
        severidad: 'warning',
        usuario_id: null,
        sucursal: null,
        ip_address: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      });
      
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    // console.log('🎫 Generando token JWT...');
    
    // Configurar expiración según el rol del usuario
    const tokenExpiration = user.role === 'soporte' ? '30d' : '8h'; // 30 días para soporte, 8h para otros
    
    const token = jwt.sign(
      { 
        id: user.id_usuario, 
        usuario: user.usuario, 
        role: user.role,
        nombre: user.nombre,
        email: user.mail,
        sucursal: user.sucursal
      },
      process.env.JWT_SECRET || 'nazarepro',
      { expiresIn: tokenExpiration }
    );

    // console.log('✅ Login exitoso para:', user.usuario);
    
    // Registrar evento de login en bitácora
    await registrarEventoHelper({
      tipo_evento: 'login',
      descripcion: `Usuario ${user.usuario} (${user.nombre} ${user.apellido}) inició sesión`,
      detalles: {
        usuario_id: user.id_usuario,
        usuario: user.usuario,
        role: user.role,
        sucursal: user.sucursal
      },
      severidad: 'info',
      usuario_id: user.id_usuario,
      sucursal: user.sucursal,
      ip_address: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });
    
    return res.json({
      token,
      user: {
        id: user.id_usuario,
        usuario: user.usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.mail,
        role: user.role,
        sucursal: user.sucursal
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// MODIFICADO: Solicitud de registro (requiere aprobación)
router.post('/register', async (req, res) => {
  try {
    // console.log('🔍 REGISTRO - Datos recibidos:', req.body);
    // console.log('🔍 REGISTRO - Headers:', {
    //   origin: req.headers.origin,
    //   userAgent: req.headers['user-agent'],
    //   contentType: req.headers['content-type'],
    //   authorization: req.headers.authorization ? 'Present' : 'Not present'
    // });
    // console.log('🔍 REGISTRO - Environment:', {
    //   nodeEnv: process.env.NODE_ENV,
    //   dbHost: process.env.DB_HOST,
    //   dbName: process.env.DB_NAME
    // });
    const { nombre, apellido, usuario, password, sucursal, telefono } = req.body;

    // Validaciones básicas
    if (!nombre || !apellido || !password || !sucursal) {
      // console.log('❌ REGISTRO - Faltan campos requeridos');
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos: nombre, apellido, password, sucursal' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Verificar que la sucursal existe y obtener sus datos incluyendo email
    // console.log('🔍 REGISTRO - Verificando sucursal:', sucursal);
    // console.log('🔍 REGISTRO - Tipo de sucursal:', typeof sucursal);
    
    const sucursalData = await query(`
      SELECT nro_sucursal, nombre, localidad, provincia, mail 
      FROM sucursales 
      WHERE nro_sucursal = ? AND activa = TRUE
    `, [sucursal]);

    // console.log('📊 REGISTRO - Sucursal encontrada:', sucursalData);
    if (sucursalData.length === 0) {
      // console.log('❌ REGISTRO - Sucursal no válida');
      return res.status(400).json({ error: 'Sucursal no válida o inactiva' });
    }

    const { localidad, provincia, mail: sucursalEmail } = sucursalData[0];
    
    if (!sucursalEmail) {
      // console.log('❌ REGISTRO - Sucursal sin email configurado');
      return res.status(400).json({ error: 'La sucursal seleccionada no tiene email configurado' });
    }
    
    // console.log('✅ REGISTRO - Datos sucursal:', { localidad, provincia, email: sucursalEmail });

    // Generar usuario automáticamente si no se proporciona
    let finalUsuario = usuario;
    if (!finalUsuario) {
      const baseUsuario = (nombre.charAt(0) + apellido).toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let counter = 1;
      finalUsuario = baseUsuario;
      
      while (true) {
        const existingUser = await query('SELECT id_usuario FROM usuarios WHERE usuario = ?', [finalUsuario]);
        if (existingUser.length === 0) break;
        
        finalUsuario = `${baseUsuario}${counter}`;
        counter++;
      }
    }

    // Verificar que el usuario sea único (el email se asigna automáticamente por sucursal)
    // Nota: Múltiples usuarios pueden tener el mismo email de sucursal
    const existingUsuario = await query('SELECT id_usuario FROM usuarios WHERE usuario = ?', [finalUsuario]);
    if (existingUsuario.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    // Usar contraseña en texto plano para todos los usuarios
    const plainPassword = password;

    // Crear usuario con estado PENDIENTE incluyendo localidad y provincia
    const result = await query(`
      INSERT INTO usuarios (
        usuario, nombre, apellido, mail, password, telefono,
        role, estado, sucursal, localidad, provincia, vigencia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      finalUsuario, nombre, apellido, sucursalEmail, plainPassword, telefono || '',
      'sucursal', 'pendiente', sucursal, localidad, provincia, 1
    ]);

    res.status(201).json({
      message: 'Solicitud de registro enviada exitosamente. Tu cuenta será revisada por el equipo de soporte.',
      usuario: finalUsuario,
      estado: 'pendiente',
      sucursal: sucursal,
      localidad: localidad,
      provincia: provincia
    });

  } catch (error) {
    console.error('❌ ERROR COMPLETO EN REGISTRO:', error);
    console.error('Stack trace:', error.stack);
    console.error('Código de error:', error.code);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message,
      code: error.code 
    });
  }
});

// NUEVO: Obtener registros pendientes (solo soporte/admin)
router.get('/pending-registrations', authenticate, authorizeRoles('admin', 'soporte'), async (req, res) => {
  try {
    // console.log('🔍 Obteniendo registros pendientes...');
    // console.log('Usuario autenticado:', req.user);
    
    // Consulta básica para evitar errores de SQL
    const pendingUsers = await query(`
      SELECT id_usuario, usuario, nombre, apellido, mail, telefono, sucursal
      FROM usuarios 
      WHERE estado = ? 
      ORDER BY id_usuario DESC
    `, ['pendiente']);

    // console.log(`📊 Registros pendientes encontrados: ${pendingUsers.length}`);
    
    res.json(pendingUsers);
  } catch (error) {
    console.error('❌ Error completo obteniendo registros pendientes:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// NUEVO: Aprobar registro (solo soporte/admin)
router.put('/approve-registration/:id', authenticate, authorizeRoles('admin', 'soporte'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role = 'sucursal' } = req.body; // Role por defecto: sucursal

    // Verificar que el usuario existe y está pendiente
    const users = await query('SELECT * FROM usuarios WHERE id_usuario = ? AND estado = "pendiente"', [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado o ya procesado' });
    }

    // Activar usuario
    await query('UPDATE usuarios SET estado = "activo", role = ? WHERE id_usuario = ?', [role, id]);

    const user = users[0];
    res.json({
      message: `Usuario ${user.usuario} aprobado exitosamente`,
      user: {
        id: user.id_usuario,
        usuario: user.usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.mail,
        role: role,
        sucursal: user.sucursal
      }
    });

  } catch (error) {
    console.error('Error aprobando registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// NUEVO: Rechazar registro (solo soporte/admin)
router.delete('/reject-registration/:id', authenticate, authorizeRoles('admin', 'soporte'), async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    // Verificar que el usuario existe y está pendiente
    const users = await query('SELECT * FROM usuarios WHERE id_usuario = ? AND estado = "pendiente"', [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado o ya procesado' });
    }

    // Eliminar usuario rechazado
    await query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);

    res.json({
      message: `Registro de ${users[0].usuario} rechazado`,
      motivo: motivo || 'No especificado'
    });

  } catch (error) {
    console.error('Error rechazando registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener lista de sucursales disponibles
router.get('/sucursales', async (req, res) => {
  try {
    const sucursales = await query(`
      SELECT nro_sucursal, nombre, localidad, provincia, mail 
      FROM sucursales 
      WHERE activa = TRUE 
      ORDER BY nro_sucursal
    `);

    res.json(sucursales);
  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar disponibilidad de usuario
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const existing = await query('SELECT id_usuario FROM usuarios WHERE usuario = ?', [username]);
    
    res.json({
      available: existing.length === 0,
      username: username
    });
  } catch (error) {
    console.error('Error verificando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// NUEVO: Crear usuario de soporte (solo soporte/admin)
router.post('/create-support-user', authenticate, authorizeRoles('admin', 'soporte'), async (req, res) => {
  try {
    const { nombre, apellido, email, usuario, password, telefono, role = 'soporte' } = req.body;

    // console.log('🔍 CREAR USUARIO SOPORTE - Datos recibidos:', { nombre, apellido, email, usuario, role });

    // Validaciones básicas
    if (!nombre || !apellido || !email || !usuario || !password) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos: nombre, apellido, email, usuario, password' 
      });
    }

    // Validar que el role sea válido para creación por soporte
    const allowedRoles = ['soporte', 'supervisor'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Solo se pueden crear usuarios con role soporte o supervisor' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Verificar que email y usuario sean únicos
    const existingEmail = await query('SELECT id_usuario FROM usuarios WHERE mail = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const existingUsuario = await query('SELECT id_usuario FROM usuarios WHERE usuario = ?', [usuario]);
    if (existingUsuario.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    // Crear usuario directamente activo (sin necesidad de aprobación)
    const result = await query(`
      INSERT INTO usuarios (
        usuario, nombre, apellido, mail, password, telefono,
        role, estado, sucursal, localidad, provincia, vigencia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      usuario, nombre, apellido, email, password, telefono || '',
      role, 'activo', 'CENTRAL', 'CENTRAL', 'CENTRAL', 1
    ]);

    // console.log('✅ Usuario de soporte creado exitosamente:', usuario);

    res.status(201).json({
      message: `Usuario ${role} creado exitosamente`,
      user: {
        id: result.insertId,
        usuario: usuario,
        nombre: nombre,
        apellido: apellido,
        email: email,
        role: role,
        estado: 'activo'
      }
    });

  } catch (error) {
    console.error('❌ Error creando usuario de soporte:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// DEPRECATED: Old email-based password reset endpoints removed
// Password reset is now handled through support requests in /api/password-reset routes

// Endpoint para obtener información del usuario actual
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const users = await query(
      'SELECT id_usuario, usuario, nombre, apellido, mail, role, sucursal FROM usuarios WHERE id_usuario = ? AND estado = "activo"',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const user = users[0];
    res.json({
      id: user.id_usuario,
      usuario: user.usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.mail,
      role: user.role,
      sucursal: user.sucursal
    });
    
  } catch (error) {
    console.error('Error obteniendo información del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener usuarios conectados (solo soporte)
router.get('/active-users', authenticate, authorizeRoles('admin', 'soporte', 'supervisor'), async (req, res) => {
  try {
    const { role } = req.query;
    
    let activeUsers;
    if (role) {
      // Obtener usuarios activos por rol específico
      activeUsers = activityTracker.getActiveUsersByRole(role);
    } else {
      // Obtener todos los usuarios activos
      activeUsers = activityTracker.getAllActiveUsers();
    }
    
    // Filtrar solo usuarios online (activos en los últimos 5 minutos)
    const onlineUsers = activeUsers.filter(user => user.isOnline);
    
    res.json({
      users: onlineUsers,
      count: onlineUsers.length,
      totalTracked: activeUsers.length
    });
  } catch (error) {
    console.error('Error obteniendo usuarios activos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
