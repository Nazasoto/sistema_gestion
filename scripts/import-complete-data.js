import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

async function importCompleteData() {
  console.log('🔄 Iniciando importación completa de datos...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('✅ Conexión establecida');
    
    // Crear todas las tablas necesarias
    console.log('📋 Creando estructura de tablas...');
    
    // Tabla usuarios
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(50) NOT NULL UNIQUE,
        role VARCHAR(20) NOT NULL DEFAULT 'usuario',
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        vigencia TINYINT(1) DEFAULT 1,
        estado ENUM('pendiente', 'activo', 'inactivo', 'rechazado') NOT NULL DEFAULT 'pendiente',
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
        INDEX idx_usuario (usuario),
        INDEX idx_mail (mail),
        INDEX idx_estado (estado),
        INDEX idx_token (token_confirmacion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla tickets
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        estado ENUM('nuevo', 'en_progreso', 'pendiente_usuario', 'resuelto', 'cerrado', 'cancelado') NOT NULL DEFAULT 'nuevo',
        prioridad ENUM('baja', 'media', 'alta', 'urgente') NOT NULL DEFAULT 'media',
        categoria ENUM('problemas_con_el_sigeco', 'impresora_no_imprime', 'control_de_caja', 'problemas_en_otras_aplicaciones', 'otros') DEFAULT 'otros',
        usuario_creador_id INT,
        usuario_asignado_id INT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        fecha_cierre TIMESTAMP NULL,
        archivos_adjuntos JSON,
        comentarios TEXT,
        usuario_reasignado INT,
        fecha_reasignacion TIMESTAMP NULL,
        informe_supervisor TEXT,
        FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        FOREIGN KEY (usuario_asignado_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        FOREIGN KEY (usuario_reasignado) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        INDEX idx_estado (estado),
        INDEX idx_prioridad (prioridad),
        INDEX idx_categoria (categoria),
        INDEX idx_usuario_creador (usuario_creador_id),
        INDEX idx_usuario_asignado (usuario_asignado_id),
        INDEX idx_fecha_creacion (fecha_creacion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tablas adicionales
    await connection.execute(`
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

    await connection.execute(`
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

    await connection.execute(`
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

    console.log('✅ Estructura de tablas creada');

    // Leer datos exportados
    console.log('📖 Leyendo datos exportados...');
    const usuariosData = JSON.parse(await fs.readFile(join(__dirname, '../exports/usuarios.json'), 'utf8'));
    const ticketsData = JSON.parse(await fs.readFile(join(__dirname, '../exports/tickets.json'), 'utf8'));

    // Limpiar tablas existentes
    console.log('🧹 Limpiando datos existentes...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE ticket_history');
    await connection.execute('TRUNCATE TABLE bitacora_eventos');
    await connection.execute('TRUNCATE TABLE password_reset_requests');
    await connection.execute('TRUNCATE TABLE tickets');
    await connection.execute('TRUNCATE TABLE usuarios');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Importar usuarios
    console.log('👥 Importando usuarios...');
    for (const usuario of usuariosData.usuarios) {
      await connection.execute(`
        INSERT INTO usuarios (
          id_usuario, usuario, role, nombre, apellido, fecha_alta, fecha_solicitud,
          vigencia, estado, token_confirmacion, auth_provider, motivo_rechazo,
          mail, password, telefono, nacimiento, sucursal, localidad, provincia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        usuario.id_usuario, usuario.usuario, usuario.role, usuario.nombre, usuario.apellido,
        usuario.fecha_alta, usuario.fecha_solicitud, usuario.vigencia, usuario.estado,
        usuario.token_confirmacion, usuario.auth_provider, usuario.motivo_rechazo,
        usuario.mail, usuario.password, usuario.telefono, usuario.nacimiento,
        usuario.sucursal, usuario.localidad, usuario.provincia
      ]);
    }
    console.log(`✅ ${usuariosData.usuarios.length} usuarios importados`);

    // Importar tickets
    console.log('🎫 Importando tickets...');
    for (const ticket of ticketsData.tickets) {
      await connection.execute(`
        INSERT INTO tickets (
          id, titulo, descripcion, estado, prioridad, categoria,
          usuario_creador_id, usuario_asignado_id, fecha_creacion,
          fecha_actualizacion, fecha_cierre, archivos_adjuntos,
          comentarios, usuario_reasignado, fecha_reasignacion, informe_supervisor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ticket.id, ticket.titulo, ticket.descripcion, ticket.estado, ticket.prioridad,
        ticket.categoria, ticket.usuario_creador_id, ticket.usuario_asignado_id,
        ticket.fecha_creacion, ticket.fecha_actualizacion, ticket.fecha_cierre,
        JSON.stringify(ticket.archivos_adjuntos), ticket.comentarios,
        ticket.usuario_reasignado, ticket.fecha_reasignacion, ticket.informe_supervisor
      ]);
    }
    console.log(`✅ ${ticketsData.tickets.length} tickets importados`);

    // Verificar importación
    console.log('🔍 Verificando importación...');
    const [usuariosCount] = await connection.execute('SELECT COUNT(*) as total FROM usuarios');
    const [ticketsCount] = await connection.execute('SELECT COUNT(*) as total FROM tickets');
    
    console.log(`👥 Total usuarios en nueva DB: ${usuariosCount[0].total}`);
    console.log(`🎫 Total tickets en nueva DB: ${ticketsCount[0].total}`);

    console.log('\n✅ Importación completa exitosa!');
    console.log('📊 Resumen:');
    console.log(`   👥 Usuarios: ${usuariosCount[0].total}`);
    console.log(`   🎫 Tickets: ${ticketsCount[0].total}`);
    console.log('   📋 Tablas: usuarios, tickets, ticket_history, bitacora_eventos, password_reset_requests');

  } catch (error) {
    console.error('❌ Error durante la importación:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

importCompleteData().catch(console.error);
