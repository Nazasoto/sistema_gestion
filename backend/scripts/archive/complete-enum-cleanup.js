import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function completeEnumCleanup() {
  let connection;
  
  try {
    console.log('🧹 Completando limpieza del ENUM...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('✅ Conexión establecida');
    
    // Eliminar 'mal' del ENUM de la tabla tickets
    console.log('🔧 Actualizando ENUM de tabla tickets...');
    await connection.execute(`
      ALTER TABLE tickets 
      MODIFY COLUMN estado ENUM('nuevo', 'en_progreso', 'resuelto', 'pendiente', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') 
      NOT NULL DEFAULT 'nuevo'
    `);
    
    // Eliminar 'mal' del ENUM de la tabla ticket_history
    console.log('🔧 Actualizando ENUM de tabla ticket_history...');
    await connection.execute(`
      ALTER TABLE ticket_history 
      MODIFY COLUMN estado_anterior ENUM('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'pendiente', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') NULL
    `);
    
    await connection.execute(`
      ALTER TABLE ticket_history 
      MODIFY COLUMN estado_nuevo ENUM('nuevo', 'en_espera', 'en_progreso', 'resuelto', 'pendiente', 'cerrado', 'cancelado', 'pendiente_aprobacion', 'aprobado', 'rechazado') NOT NULL
    `);
    
    // Verificar el resultado
    const [enumInfo] = await connection.execute(
      "SHOW COLUMNS FROM tickets WHERE Field = 'estado'"
    );
    
    console.log('\n📊 Resultado:');
    console.log(`ENUM actualizado: ${enumInfo[0].Type}`);
    
    const enumValues = enumInfo[0].Type;
    const tieneMal = enumValues.includes('mal');
    const tienePendiente = enumValues.includes('pendiente');
    
    if (!tieneMal && tienePendiente) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
      console.log('✅ Estado "mal" eliminado del ENUM');
      console.log('✅ Estado "pendiente" disponible');
    } else {
      console.log('\n⚠️  Algo salió mal en la actualización');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

completeEnumCleanup();
