import { query } from '../config/database.js';

async function initPasswordResetTable() {
  try {
    console.log('🔧 Inicializando tabla password_resets...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        used_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_expires (expires_at),
        INDEX idx_user_id (user_id)
      )
    `;

    await query(createTableQuery);
    console.log('✅ Tabla password_resets creada exitosamente');

    // Verificar estructura de la tabla
    const describeTable = await query('DESCRIBE password_resets');
    console.log('📊 Estructura de la tabla password_resets:');
    console.table(describeTable);

    // Limpiar tokens expirados si existen
    const cleanupQuery = 'DELETE FROM password_resets WHERE expires_at < NOW()';
    const result = await query(cleanupQuery);
    console.log(`🧹 Tokens expirados eliminados: ${result.affectedRows}`);

    console.log('✅ Inicialización completada exitosamente');

  } catch (error) {
    console.error('❌ Error inicializando tabla password_resets:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initPasswordResetTable()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error ejecutando script:', error);
      process.exit(1);
    });
}

export default initPasswordResetTable;
