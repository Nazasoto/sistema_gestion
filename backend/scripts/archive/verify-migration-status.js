import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function verifyMigrationStatus() {
  let connection;
  
  try {
    console.log('🔍 Verificando estado de la migración...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('✅ Conexión establecida');
    
    // Verificar tickets con estado 'mal'
    const [ticketsMal] = await connection.execute(
      'SELECT COUNT(*) as count FROM tickets WHERE estado = ?',
      ['mal']
    );
    
    // Verificar tickets con estado 'pendiente'
    const [ticketsPendiente] = await connection.execute(
      'SELECT COUNT(*) as count FROM tickets WHERE estado = ?',
      ['pendiente']
    );
    
    // Verificar estructura de ENUM
    const [enumInfo] = await connection.execute(
      "SHOW COLUMNS FROM tickets WHERE Field = 'estado'"
    );
    
    console.log('\n📊 Estado actual:');
    console.log(`- Tickets con estado 'mal': ${ticketsMal[0].count}`);
    console.log(`- Tickets con estado 'pendiente': ${ticketsPendiente[0].count}`);
    console.log(`- ENUM actual: ${enumInfo[0].Type}`);
    
    // Verificar si 'pendiente' está en el ENUM
    const enumValues = enumInfo[0].Type;
    const tienePendiente = enumValues.includes('pendiente');
    const tieneMal = enumValues.includes('mal');
    
    console.log('\n🔍 Análisis:');
    console.log(`- ENUM incluye 'pendiente': ${tienePendiente ? '✅' : '❌'}`);
    console.log(`- ENUM incluye 'mal': ${tieneMal ? '⚠️  Sí (debe eliminarse)' : '✅ No'}`);
    
    if (ticketsMal[0].count === 0 && tienePendiente && !tieneMal) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
    } else if (tienePendiente && tieneMal) {
      console.log('\n⚠️  Migración parcial - ENUM actualizado pero aún contiene "mal"');
    } else {
      console.log('\n❌ Migración no ejecutada o fallida');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Sugerencia: Verificar que la base de datos esté accesible');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyMigrationStatus();
