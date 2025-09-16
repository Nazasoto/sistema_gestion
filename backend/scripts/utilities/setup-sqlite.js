import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Crear una conexión a la base de datos SQLite
function createConnection() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error al conectar a la base de datos:', err.message);
      process.exit(1);
    }
    console.log('🔌 Conectado a la base de datos SQLite');
  });
}

// Promisificar los métodos de la base de datos
function promisifyDb(db) {
  return {
    run: promisify(db.run.bind(db)),
    get: promisify(db.get.bind(db)),
    all: promisify(db.all.bind(db)),
    exec: promisify(db.exec.bind(db)),
    close: promisify(db.close.bind(db))
  };
}

async function setupDatabase() {
  console.log('🚀 Configurando base de datos SQLite...');
  
  const db = createConnection();
  const dbAsync = promisifyDb(db);
  
  try {
    // Crear tabla de usuarios
    await dbAsync.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol TEXT CHECK(rol IN ('usuario', 'soporte', 'admin')) DEFAULT 'usuario',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de tickets
    await dbAsync.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        solucion TEXT,
        estado TEXT CHECK(estado IN ('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'cerrado', 'cancelado', 'err')) DEFAULT 'nuevo',
        prioridad TEXT CHECK(prioridad IN ('baja', 'media', 'alta', 'urgente')) DEFAULT 'media',
        categoria TEXT,
        usuario_creador_id INTEGER NOT NULL,
        usuario_asignado_id INTEGER,
        motivo_espera TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_espera TIMESTAMP,
        fecha_resolucion TIMESTAMP,
        FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (usuario_asignado_id) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
      )
    `);

    console.log('✅ Tablas creadas exitosamente');

    // Verificar si el usuario administrador ya existe
    const adminUser = await dbAsync.get('SELECT * FROM usuarios WHERE email = ?', ['admin@example.com']);
    
    if (!adminUser) {
      console.log('👤 Creando usuario administrador...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await dbAsync.run(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        ['Administrador', 'admin@example.com', hashedPassword, 'admin']
      );
      console.log('✅ Usuario administrador creado:');
      console.log('   Email: admin@example.com');
      console.log('   Contraseña: admin123');
    } else {
      console.log('ℹ️  El usuario administrador ya existe');
    }

    console.log('\n🎉 ¡Configuración completada exitosamente!');
    console.log(`Base de datos creada en: ${DB_PATH}`);
    console.log('\nPuedes iniciar la aplicación con:');
    console.log('   npm run dev\n');

  } catch (error) {
    console.error('❌ Error durante la configuración:');
    console.error(error);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error al cerrar la conexión:', err.message);
      }
    });
  }
}

// Ejecutar la configuración
setupDatabase();
