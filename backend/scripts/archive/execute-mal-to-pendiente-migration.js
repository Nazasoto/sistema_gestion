import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function executeMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    multipleStatements: true
  });

  try {
    console.log('🚀 Iniciando migración de "mal" a "pendiente"...\n');
    
    // Leer el archivo SQL de migración
    const migrationPath = path.join(process.cwd(), 'migrations', 'change_mal_to_pendiente.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Archivo de migración cargado');
    
    // Verificar estado actual antes de la migración
    console.log('🔍 Estado ANTES de la migración:');
    const [ticketsBefore] = await connection.execute(
      'SELECT estado, COUNT(*) as count FROM tickets GROUP BY estado ORDER BY estado'
    );
    console.table(ticketsBefore);
    
    const [historyBefore] = await connection.execute(
      'SELECT estado_nuevo, COUNT(*) as count FROM ticket_history GROUP BY estado_nuevo ORDER BY estado_nuevo'
    );
    console.log('\n📈 Historial antes:');
    console.table(historyBefore);
    
    // Ejecutar la migración
    console.log('\n⚡ Ejecutando migración...');
    await connection.query(migrationSQL);
    console.log('✅ Migración ejecutada exitosamente');
    
    // Verificar estado después de la migración
    console.log('\n🔍 Estado DESPUÉS de la migración:');
    const [ticketsAfter] = await connection.execute(
      'SELECT estado, COUNT(*) as count FROM tickets GROUP BY estado ORDER BY estado'
    );
    console.table(ticketsAfter);
    
    const [historyAfter] = await connection.execute(
      'SELECT estado_nuevo, COUNT(*) as count FROM ticket_history GROUP BY estado_nuevo ORDER BY estado_nuevo'
    );
    console.log('\n📈 Historial después:');
    console.table(historyAfter);
    
    // Verificar que no queden referencias a 'mal'
    const [remainingMal] = await connection.execute(
      'SELECT COUNT(*) as tickets_mal FROM tickets WHERE estado = "mal"'
    );
    
    const [remainingMalHistory] = await connection.execute(
      'SELECT COUNT(*) as history_mal FROM ticket_history WHERE estado_nuevo = "mal" OR estado_anterior = "mal"'
    );
    
    if (remainingMal[0].tickets_mal === 0 && remainingMalHistory[0].history_mal === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
      console.log('✅ No quedan referencias al estado "mal"');
      console.log('✅ Todos los datos han sido migrados a "pendiente"');
    } else {
      console.log('\n⚠️  Advertencia: Aún quedan referencias al estado "mal"');
      console.log(`   - Tickets: ${remainingMal[0].tickets_mal}`);
      console.log(`   - Historial: ${remainingMalHistory[0].history_mal}`);
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('📋 Detalles:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigration()
    .then(() => {
      console.log('\n🏁 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error.message);
      process.exit(1);
    });
}
