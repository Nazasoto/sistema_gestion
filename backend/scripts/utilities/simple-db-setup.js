const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Configuración
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Eliminar la base de datos existente si existe
if (fs.existsSync(DB_PATH)) {
  console.log('Eliminando base de datos existente...');
  fs.unlinkSync(DB_PATH);
}

// Crear una nueva base de datos
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error al crear la base de datos:', err.message);
    process.exit(1);
  }
  console.log('Base de datos SQLite creada exitosamente');
  
  // Crear tablas
  db.serialize(() => {
    // Tabla de usuarios
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol TEXT CHECK(rol IN ('usuario', 'soporte', 'admin')) DEFAULT 'usuario',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error al crear tabla usuarios:', err.message);
      } else {
        console.log('Tabla de usuarios creada exitosamente');
      }
    });

    // Tabla de tickets
    db.run(`
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
    `, async (err) => {
      if (err) {
        console.error('Error al crear tabla tickets:', err.message);
      } else {
        console.log('Tabla de tickets creada exitosamente');
        
        // Crear usuario administrador
        db.get("SELECT * FROM usuarios WHERE email = 'admin@example.com'", async (err, row) => {
          if (err) {
            console.error('Error al verificar usuario administrador:', err.message);
            return;
          }
          
          if (!row) {
            console.log('Creando usuario administrador...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            db.run(
              'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
              ['Administrador', 'admin@example.com', hashedPassword, 'admin'],
              function(err) {
                if (err) {
                  console.error('Error al crear usuario administrador:', err.message);
                } else {
                  console.log('✅ Usuario administrador creado exitosamente');
                  console.log('   Email: admin@example.com');
                  console.log('   Contraseña: admin123');
                }
                
                // Cerrar la conexión
                db.close((err) => {
                  if (err) {
                    console.error('Error al cerrar la base de datos:', err.message);
                  } else {
                    console.log('\n🎉 ¡Configuración completada exitosamente!');
                    console.log(`Base de datos creada en: ${DB_PATH}`);
                    console.log('\nPuedes iniciar la aplicación con:');
                    console.log('   npm run dev\n');
                  }
                });
              }
            );
          } else {
            console.log('El usuario administrador ya existe');
            
            // Cerrar la conexión
            db.close();
          }
        });
      }
    });
  });
});
