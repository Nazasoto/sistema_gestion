import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function importFixed() {
  console.log('🔄 Importando con correcciones de sintaxis...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('✅ Conexión establecida');
    
    // Desactivar verificaciones de claves foráneas
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Limpiar base de datos
    console.log('🧹 Limpiando base de datos...');
    const [existingTables] = await connection.execute('SHOW TABLES');
    for (const table of existingTables) {
      const tableName = Object.values(table)[0];
      await connection.execute(`DROP TABLE IF EXISTS ${tableName}`);
    }
    
    // Crear tablas principales con sintaxis corregida
    console.log('📋 Creando estructura de tablas...');
    
    // Tabla usuarios
    await connection.execute(`
      CREATE TABLE usuarios (
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
        INDEX idx_usuario (usuario),
        INDEX idx_mail (mail),
        INDEX idx_estado (estado),
        INDEX idx_token (token_confirmacion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla sucursales
    await connection.execute(`
      CREATE TABLE sucursales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(10) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        direccion VARCHAR(255),
        telefono VARCHAR(20),
        email VARCHAR(100),
        ciudad VARCHAR(100),
        provincia VARCHAR(50),
        codigo_postal VARCHAR(10),
        activo TINYINT(1) DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_codigo (codigo),
        INDEX idx_activo (activo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabla tickets
    await connection.execute(`
      CREATE TABLE tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        estado ENUM('nuevo','en_progreso','pendiente_usuario','resuelto','cerrado','cancelado') NOT NULL DEFAULT 'nuevo',
        prioridad ENUM('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
        categoria ENUM('problemas_con_el_sigeco','impresora_no_imprime','control_de_caja','problemas_en_otras_aplicaciones','otros') DEFAULT 'otros',
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
        INDEX idx_estado (estado),
        INDEX idx_prioridad (prioridad),
        INDEX idx_categoria (categoria),
        INDEX idx_usuario_creador (usuario_creador_id),
        INDEX idx_usuario_asignado (usuario_asignado_id),
        INDEX idx_fecha_creacion (fecha_creacion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Otras tablas importantes
    await connection.execute(`
      CREATE TABLE ticket_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        usuario_id INT NOT NULL,
        accion ENUM('creado','actualizado','asignado','reasignado','comentario','estado_cambiado','prioridad_cambiada','cerrado','reabierto') NOT NULL,
        descripcion TEXT,
        valor_anterior TEXT,
        valor_nuevo TEXT,
        fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ticket_id (ticket_id),
        INDEX idx_fecha_accion (fecha_accion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE bitacora_eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        accion VARCHAR(100) NOT NULL,
        entidad VARCHAR(50) NOT NULL,
        entidad_id INT,
        detalles JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usuario_id (usuario_id),
        INDEX idx_accion (accion),
        INDEX idx_entidad (entidad),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE password_reset_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        nombre_completo VARCHAR(255) NOT NULL,
        sucursal VARCHAR(100),
        motivo TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pendiente','completado','rechazado') DEFAULT 'pendiente',
        handled_by INT NULL,
        handled_at TIMESTAMP NULL,
        admin_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_requested_at (requested_at),
        INDEX idx_user_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE noticias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        contenido TEXT,
        fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo TINYINT(1) DEFAULT 1,
        autor_id INT,
        INDEX idx_activo (activo),
        INDEX idx_fecha (fecha_publicacion)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Estructura de tablas creada');

    // Importar datos principales
    console.log('📤 Importando datos...');

    // Función para convertir fechas ISO a MySQL
    function convertDate(isoDate) {
      if (!isoDate) return null;
      return new Date(isoDate).toISOString().slice(0, 19).replace('T', ' ');
    }

    // Función para manejar valores undefined
    function handleValue(value) {
      return value === undefined ? null : value;
    }

    // Importar usuarios
    const usuariosData = JSON.parse(await fs.readFile('./exports/usuarios.json', 'utf8'));
    for (const usuario of usuariosData.data) {
      await connection.execute(`
        INSERT INTO usuarios (
          id_usuario, usuario, role, nombre, apellido, fecha_alta, fecha_solicitud,
          vigencia, estado, token_confirmacion, auth_provider, motivo_rechazo,
          mail, password, telefono, nacimiento, sucursal, localidad, provincia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        handleValue(usuario.id_usuario), handleValue(usuario.usuario), handleValue(usuario.role), 
        handleValue(usuario.nombre), handleValue(usuario.apellido),
        convertDate(usuario.fecha_alta), convertDate(usuario.fecha_solicitud), 
        handleValue(usuario.vigencia), handleValue(usuario.estado),
        handleValue(usuario.token_confirmacion), handleValue(usuario.auth_provider), 
        handleValue(usuario.motivo_rechazo), handleValue(usuario.mail), handleValue(usuario.password), 
        handleValue(usuario.telefono), convertDate(usuario.nacimiento),
        handleValue(usuario.sucursal), handleValue(usuario.localidad), handleValue(usuario.provincia)
      ]);
    }
    console.log(`✅ ${usuariosData.data.length} usuarios importados`);

    // Importar sucursales
    const sucursalesData = JSON.parse(await fs.readFile('./exports/sucursales.json', 'utf8'));
    for (const sucursal of sucursalesData.data) {
      await connection.execute(`
        INSERT INTO sucursales (
          id, codigo, nombre, direccion, telefono, email, ciudad, provincia,
          codigo_postal, activo, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        handleValue(sucursal.id), handleValue(sucursal.codigo), handleValue(sucursal.nombre), 
        handleValue(sucursal.direccion), handleValue(sucursal.telefono), handleValue(sucursal.email), 
        handleValue(sucursal.ciudad), handleValue(sucursal.provincia),
        handleValue(sucursal.codigo_postal), handleValue(sucursal.activo), 
        convertDate(sucursal.fecha_creacion), convertDate(sucursal.fecha_actualizacion)
      ]);
    }
    console.log(`✅ ${sucursalesData.data.length} sucursales importadas`);

    // Importar tickets
    const ticketsData = JSON.parse(await fs.readFile('./exports/tickets.json', 'utf8'));
    for (const ticket of ticketsData.data) {
      // Manejar archivos_adjuntos como JSON
      let archivosAdjuntos = ticket.archivos_adjuntos;
      if (typeof archivosAdjuntos !== 'string') {
        archivosAdjuntos = JSON.stringify(archivosAdjuntos || []);
      }
      
      await connection.execute(`
        INSERT INTO tickets (
          id, titulo, descripcion, estado, prioridad, categoria,
          usuario_creador_id, usuario_asignado_id, fecha_creacion,
          fecha_actualizacion, fecha_cierre, archivos_adjuntos,
          comentarios, usuario_reasignado, fecha_reasignacion, informe_supervisor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        handleValue(ticket.id), handleValue(ticket.titulo), handleValue(ticket.descripcion), 
        handleValue(ticket.estado), handleValue(ticket.prioridad), handleValue(ticket.categoria), 
        handleValue(ticket.usuario_creador_id), handleValue(ticket.usuario_asignado_id),
        convertDate(ticket.fecha_creacion), convertDate(ticket.fecha_actualizacion), convertDate(ticket.fecha_cierre),
        archivosAdjuntos, handleValue(ticket.comentarios), handleValue(ticket.usuario_reasignado),
        convertDate(ticket.fecha_reasignacion), handleValue(ticket.informe_supervisor)
      ]);
    }
    console.log(`✅ ${ticketsData.data.length} tickets importados`);

    // Importar otras tablas importantes
    try {
      const ticketHistoryData = JSON.parse(await fs.readFile('./exports/ticket_history.json', 'utf8'));
      for (const history of ticketHistoryData.data) {
        await connection.execute(`
          INSERT INTO ticket_history (
            id, ticket_id, usuario_id, accion, descripcion,
            valor_anterior, valor_nuevo, fecha_accion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          history.id, history.ticket_id, history.usuario_id, history.accion,
          history.descripcion, history.valor_anterior, history.valor_nuevo,
          convertDate(history.fecha_accion)
        ]);
      }
      console.log(`✅ ${ticketHistoryData.data.length} registros de historial importados`);
    } catch (error) {
      console.log('⚠️ Error importando ticket_history:', error.message);
    }

    // Reactivar verificaciones de claves foráneas
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Verificar importación
    console.log('\n🔍 Verificación final...');
    const [tables] = await connection.execute('SHOW TABLES');
    
    let totalRecords = 0;
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [count] = await connection.execute(`SELECT COUNT(*) as total FROM ${tableName}`);
      const recordCount = count[0].total;
      totalRecords += recordCount;
      console.log(`  📊 ${tableName}: ${recordCount} registros`);
    }

    console.log('\n✅ Importación completada exitosamente!');
    console.log(`📊 Resumen final:`);
    console.log(`   📋 Tablas creadas: ${tables.length}`);
    console.log(`   📝 Total registros: ${totalRecords}`);

  } catch (error) {
    console.error('❌ Error durante la importación:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

importFixed().catch(console.error);
