import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Configuración de conexión sin especificar la base de datos primero
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  multipleStatements: true
};

// Scripts SQL para crear la base de datos y las tablas
const initScript = `
-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'ticket'}\`;

-- Usar la base de datos
USE \`${process.env.DB_NAME || 'ticket'}\`;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS \`usuarios\` (
  \`id_usuario\` INT AUTO_INCREMENT PRIMARY KEY,
  \`usuario\` VARCHAR(50) NOT NULL UNIQUE,
  \`role\` VARCHAR(20) NOT NULL,
  \`nombre\` VARCHAR(100) NOT NULL,
  \`apellido\` VARCHAR(100) NOT NULL,
  \`fecha_alta\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`vigencia\` TINYINT(1) DEFAULT 1,
  \`mail\` VARCHAR(100) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`telefono\` VARCHAR(20),
  \`nacimiento\` DATE,
  INDEX \`idx_usuario\` (\`usuario\`),
  INDEX \`idx_mail\` (\`mail\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de sucursales
CREATE TABLE IF NOT EXISTS \`sucursal\` (
  \`id_sucu\` INT AUTO_INCREMENT PRIMARY KEY,
  \`nombre\` VARCHAR(100) NOT NULL,
  \`localidad\` VARCHAR(100) NOT NULL,
  \`vicencia\` TINYINT(1) DEFAULT 1,
  \`mail\` VARCHAR(100),
  INDEX \`idx_nombre\` (\`nombre\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de tickets
DROP TABLE IF EXISTS \`ticket\`;

CREATE TABLE IF NOT EXISTS \`ticket\` (
  \`id_ticket\` INT AUTO_INCREMENT PRIMARY KEY,
  \`titulo\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`estado\` VARCHAR(50) NOT NULL DEFAULT 'abierto',
  \`prioridad\` VARCHAR(20) NOT NULL DEFAULT 'media',
  \`usuario_id\` INT,
  \`asignadoA\` INT,
  \`fecha_creacion\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`fecha_actualizacion\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  \`archivos\` TEXT,
  INDEX \`idx_estado\` (\`estado\`),
  INDEX \`idx_prioridad\` (\`prioridad\`),
  INDEX \`idx_usuario\` (\`usuario_id\`),
  INDEX \`idx_asignado\` (\`asignadoA\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de noticias
CREATE TABLE IF NOT EXISTS \`noticias\` (
  \`id_noticia\` INT AUTO_INCREMENT PRIMARY KEY,
  \`titulo\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`estado\` VARCHAR(50) NOT NULL,
  \`fecha_creacion\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_estado\` (\`estado\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function initializeDatabase() {
  let connection;
  try {
    // Conectar al servidor MySQL sin especificar la base de datos
    connection = await mysql.createConnection(config);
    
    console.log(' Conectado al servidor MySQL');
    
    // Ejecutar el script de inicialización
    await connection.query(initScript);
    
    console.log(' Base de datos y tablas creadas exitosamente');
    
    // Verificar si hay usuarios en la base de datos
    await connection.query(`USE \`${process.env.DB_NAME || 'ticket'}\``);
    const [users] = await connection.query('SELECT COUNT(*) as count FROM usuarios');
    
    if (users[0].count === 0) {
      // Insertar un usuario administrador por defecto
      const adminUser = {
        usuario: 'admin',
        role: 'admin',
        nombre: 'Administrador',
        apellido: 'Sistema',
        vigencia: 1,
        mail: 'admin@example.com',
        password: await bcrypt.hash('admin123', 10),
        telefono: '',
        nacimiento: '2000-01-01'
      };
      
      await connection.query(
        'INSERT INTO usuarios (usuario, role, nombre, apellido, vigencia, mail, password, telefono, nacimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          adminUser.usuario,
          adminUser.role,
          adminUser.nombre,
          adminUser.apellido,
          adminUser.vigencia,
          adminUser.mail,
          adminUser.password,
          adminUser.telefono,
          adminUser.nacimiento
        ]
      );
      
      console.log('\n Usuario administrador creado:');
      console.log(`   Usuario: ${adminUser.usuario}`);
      console.log(`   Email: ${adminUser.mail}`);
      console.log('   Contraseña por defecto: admin123');
      console.log('\n  ¡IMPORTANTE! Cambia esta contraseña después del primer inicio de sesión.');
    } else {
      console.log('ℹ️  La base de datos ya contiene usuarios. No se creó el usuario administrador por defecto.');
    }
    
    console.log('\n Inicialización completada exitosamente');
    
  } catch (error) {
    console.error('X Error al inicializar la base de datos:', error.message);
    if (error.sql) {
      console.error('Consulta SQL que falló:', error.sql);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
    process.exit();
  }
}

// Ejecutar la inicialización
initializeDatabase();
