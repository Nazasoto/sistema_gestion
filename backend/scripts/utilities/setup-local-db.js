import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Cargar variables de entorno locales
dotenv.config({ path: '.env.local' });

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_tickets_local',
  multipleStatements: true
};

// Mensajes de ayuda
const HELP_MESSAGE = `
Uso: node setup-local-db.js [opciones]

Opciones:
  --help     Muestra esta ayuda
  --reset    Elimina y recrea la base de datos
`;

// Mostrar ayuda si se solicita
if (process.argv.includes('--help')) {
  console.log(HELP_MESSAGE);
  process.exit(0);
}

const shouldReset = process.argv.includes('--reset');

async function createDatabase(connection) {
  try {
    if (shouldReset) {
      console.log('🔄 Eliminando base de datos existente...');
      await connection.query(`DROP DATABASE IF EXISTS ${dbConfig.database}`);
    }

    console.log(`🔧 Creando base de datos '${dbConfig.database}'...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.query(`USE ${dbConfig.database}`);
    console.log(`✅ Base de datos '${dbConfig.database}' lista`);
    return true;
  } catch (error) {
    console.error('❌ Error al crear la base de datos:', error.message);
    return false;
  }
}

async function createTables(connection) {
  try {
    console.log('📋 Creando tablas...');
    
    // Tabla de usuarios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol ENUM('usuario', 'soporte', 'admin') DEFAULT 'usuario',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabla de tickets
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        solucion TEXT,
        estado ENUM('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'cerrado', 'cancelado', 'err') DEFAULT 'nuevo',
        prioridad ENUM('baja', 'media', 'alta', 'urgente') DEFAULT 'media',
        categoria VARCHAR(100),
        usuario_creador_id INT NOT NULL,
        usuario_asignado_id INT,
        motivo_espera TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        fecha_espera DATETIME,
        fecha_resolucion DATETIME,
        FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (usuario_asignado_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Tablas creadas exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error al crear las tablas:', error.message);
    return false;
  }
}

async function createAdminUser(connection) {
  try {
    const [users] = await connection.query('SELECT * FROM usuarios WHERE email = ?', ['admin@example.com']);
    
    if (users.length === 0) {
      console.log('👤 Creando usuario administrador...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.query(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        ['Administrador', 'admin@example.com', hashedPassword, 'admin']
      );
      console.log('✅ Usuario administrador creado:');
      console.log('   Email: admin@example.com');
      console.log('   Contraseña: admin123');
    } else {
      console.log('ℹ️  El usuario administrador ya existe');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error al crear el usuario administrador:', error.message);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Iniciando configuración de la base de datos local\n');
  
  let connection;
  try {
    // Conectar sin especificar la base de datos primero
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Crear la base de datos
    if (!await createDatabase(connection)) {
      throw new Error('No se pudo crear la base de datos');
    }

    // Cerrar la conexión y volver a conectar a la base de datos específica
    await connection.end();
    connection = await mysql.createConnection(dbConfig);

    // Crear tablas
    if (!await createTables(connection)) {
      throw new Error('No se pudieron crear las tablas');
    }

    // Crear usuario administrador
    await createAdminUser(connection);

    console.log('\n🎉 ¡Configuración completada exitosamente!');
    console.log('\nPuedes iniciar la aplicación con:');
    console.log('   npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error durante la configuración:');
    console.error(`   ${error.message}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('No se pudo conectar al servidor de base de datos.');
      console.error('Por favor, asegúrate de que MySQL esté en ejecución y que las credenciales sean correctas.');
      console.log('\nPuedes configurar las credenciales en el archivo .env.local');
    }
    
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

// Ejecutar la configuración
setupDatabase();
