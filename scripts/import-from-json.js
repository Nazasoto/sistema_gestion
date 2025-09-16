import { query } from '../backend/config/database.js';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

async function importFromJSON() {
  try {
    console.log('🔄 Iniciando importación desde archivos JSON...');
    
    // Crear tabla usuarios
    console.log('📋 Creando tabla usuarios...');
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(50) NOT NULL UNIQUE,
        role VARCHAR(20) NOT NULL DEFAULT 'usuario',
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        vigencia TINYINT(1) DEFAULT 1,
        estado ENUM('pendiente','activo','inactivo','rechazado') NOT NULL DEFAULT 'pendiente',
        token_confirmacion VARCHAR(255),
        auth_provider VARCHAR(20) DEFAULT 'local',
        motivo_rechazo TEXT,
        mail VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        telefono VARCHAR(20),
        nacimiento DATE,
        sucursal VARCHAR(10),
        localidad VARCHAR(100),
        provincia VARCHAR(50),
        INDEX idx_estado (estado),
        INDEX idx_token (token_confirmacion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Crear tabla tickets
    console.log('📋 Creando tabla tickets...');
    await query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        estado ENUM('nuevo', 'en_progreso', 'resuelto', 'cerrado', 'cancelado') NOT NULL DEFAULT 'nuevo',
        prioridad ENUM('baja', 'media', 'alta', 'urgente') NOT NULL DEFAULT 'media',
        categoria VARCHAR(100),
        usuario_id INT NOT NULL,
        usuario_asignado_id INT DEFAULT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        fecha_resolucion TIMESTAMP NULL,
        archivos_adjuntos JSON,
        estado_anterior VARCHAR(50),
        sucursal VARCHAR(100),
        fecha_limite_respuesta VARCHAR(50),
        informe_supervisor TEXT,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (usuario_asignado_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        INDEX idx_usuario_id (usuario_id),
        INDEX idx_estado (estado),
        INDEX idx_prioridad (prioridad),
        INDEX idx_categoria (categoria)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Leer y procesar usuarios
    console.log('👥 Importando usuarios...');
    const usersData = await fs.readFile(join(__dirname, '../backend/data/users.json'), 'utf8');
    const users = JSON.parse(usersData).users;
    
    for (const user of users) {
      // Hash simple de la contraseña (temporal)
      const hashedPassword = crypto.createHash('sha256').update(user.password).digest('hex');
      
      await query(`
        INSERT INTO usuarios (
          usuario, role, nombre, apellido, mail, password, estado
        ) VALUES (?, ?, ?, ?, ?, ?, 'activo')
        ON DUPLICATE KEY UPDATE
        role = VALUES(role),
        nombre = VALUES(nombre),
        apellido = VALUES(apellido)
      `, [
        user.email.split('@')[0], // usuario
        user.role,
        user.nombre,
        user.apellido || '',
        user.email,
        hashedPassword
      ]);
    }
    
    console.log(`✅ ${users.length} usuarios importados`);
    
    // Leer y procesar tickets
    console.log('🎫 Importando tickets...');
    const ticketsData = await fs.readFile(join(__dirname, '../backend/data/tickets.json'), 'utf8');
    const tickets = JSON.parse(ticketsData).tickets;
    
    let ticketsImportados = 0;
    for (const ticket of tickets) {
      // Validar que el ticket tenga los datos mínimos requeridos
      if (!ticket.titulo || !ticket.usuarioId) {
        console.log(`⚠️ Omitiendo ticket sin título o usuario_id:`, ticket);
        continue;
      }
      
      // Mapear estados del JSON a los estados de la nueva tabla
      let estadoMapeado = ticket.estado;
      switch (ticket.estado) {
        case 'abierto':
          estadoMapeado = 'nuevo';
          break;
        case 'en_progreso':
          estadoMapeado = 'en_progreso';
          break;
        case 'cerrado':
          estadoMapeado = 'resuelto';
          break;
        default:
          estadoMapeado = 'nuevo';
      }
      
      // Mapear prioridades del JSON a las prioridades de la nueva tabla
      let prioridadMapeada = ticket.prioridad;
      switch (ticket.prioridad) {
        case 'critica':
          prioridadMapeada = 'urgente';
          break;
        case 'baja':
        case 'media':
        case 'alta':
        case 'urgente':
          prioridadMapeada = ticket.prioridad;
          break;
        default:
          prioridadMapeada = 'media';
      }
      
      // Convertir fecha ISO a formato MySQL
      let fechaCreacion = new Date();
      if (ticket.fechaCreacion) {
        fechaCreacion = new Date(ticket.fechaCreacion);
      }
      const fechaMysql = fechaCreacion.toISOString().slice(0, 19).replace('T', ' ');
      
      await query(`
        INSERT INTO tickets (
          titulo, descripcion, estado, prioridad, usuario_id, usuario_asignado_id, fecha_creacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        ticket.titulo,
        ticket.descripcion || '',
        estadoMapeado,
        prioridadMapeada,
        ticket.usuarioId,
        ticket.asignadoA || null,
        fechaMysql
      ]);
      
      ticketsImportados++;
    }
    
    console.log(`✅ ${ticketsImportados} tickets importados de ${tickets.length} total`);
    
    // Crear tablas adicionales
    console.log('📋 Creando tablas adicionales...');
    
    // Tabla de historial de tickets
    await query(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        usuario_id INT NOT NULL,
        accion ENUM('creado', 'actualizado', 'asignado', 'reasignado', 'comentario', 'estado_cambiado', 'prioridad_cambiada', 'cerrado', 'reabierto') NOT NULL,
        descripcion TEXT,
        valor_anterior TEXT,
        valor_nuevo TEXT,
        fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_ticket_id (ticket_id),
        INDEX idx_fecha_accion (fecha_accion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Tabla de bitácora
    await query(`
      CREATE TABLE IF NOT EXISTS bitacora_eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        accion VARCHAR(100) NOT NULL,
        entidad VARCHAR(50) NOT NULL,
        entidad_id INT,
        detalles JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        INDEX idx_usuario_id (usuario_id),
        INDEX idx_accion (accion),
        INDEX idx_entidad (entidad),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Tabla de solicitudes de reset de contraseña
    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        nombre_completo VARCHAR(255) NOT NULL,
        sucursal VARCHAR(100),
        motivo TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pendiente', 'completado', 'rechazado') DEFAULT 'pendiente',
        handled_by INT NULL,
        handled_at TIMESTAMP NULL,
        admin_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (handled_by) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_requested_at (requested_at),
        INDEX idx_user_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Importación completada exitosamente');
    console.log('🔍 Verificando datos importados...');
    
    // Verificar usuarios
    const userCount = await query('SELECT COUNT(*) as total FROM usuarios');
    console.log(`👥 Total usuarios: ${userCount[0].total}`);
    
    // Verificar tickets
    const ticketCount = await query('SELECT COUNT(*) as total FROM tickets');
    console.log(`🎫 Total tickets: ${ticketCount[0].total}`);
    
    // Mostrar tablas creadas
    const tables = await query('SHOW TABLES');
    console.log('📋 Tablas creadas:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    process.exit(1);
  }
}

importFromJSON();
