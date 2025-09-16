import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'nozomi.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT || '12624'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'amFgayKbDLBEvAKVRjOfPvDAvXWtGfWS',
  database: process.env.DB_NAME || 'railway',
  ssl: { rejectUnauthorized: false }
};

async function resetTicketsTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión exitosa a la base de datos\n');

    // Verificar estado actual de la tabla tickets
    console.log('📊 ESTADO ACTUAL DE LA TABLA TICKETS:');
    const [currentTickets] = await connection.query('SELECT COUNT(*) as total FROM tickets');
    console.log(`   Total de tickets actuales: ${currentTickets[0].total}`);

    if (currentTickets[0].total > 0) {
      // Crear backup con timestamp
      const timestamp = Date.now();
      const backupTableName = `tickets_backup_${timestamp}`;
      
      console.log(`\n💾 CREANDO BACKUP: ${backupTableName}`);
      
      // Crear tabla de backup con la misma estructura
      await connection.query(`CREATE TABLE ${backupTableName} LIKE tickets`);
      
      // Copiar todos los datos
      await connection.query(`INSERT INTO ${backupTableName} SELECT * FROM tickets`);
      
      // Verificar backup
      const [backupCount] = await connection.query(`SELECT COUNT(*) as total FROM ${backupTableName}`);
      console.log(`   ✅ Backup creado exitosamente: ${backupCount[0].total} registros copiados`);
    }

    // Mostrar algunos tickets antes de eliminar (para referencia)
    console.log('\n📋 ÚLTIMOS TICKETS ANTES DEL REINICIO:');
    const [lastTickets] = await connection.query(`
      SELECT id, titulo, estado, fecha_creacion, usuario_creador_id 
      FROM tickets 
      ORDER BY fecha_creacion DESC 
      LIMIT 5
    `);
    
    if (lastTickets.length > 0) {
      console.table(lastTickets);
    } else {
      console.log('   No hay tickets para mostrar');
    }

    // Reiniciar la tabla tickets
    console.log('\n🔄 REINICIANDO TABLA TICKETS...');
    
    // Opción 1: TRUNCATE (más rápido, reinicia AUTO_INCREMENT)
    await connection.query('TRUNCATE TABLE tickets');
    
    // Verificar que la tabla está vacía
    const [afterReset] = await connection.query('SELECT COUNT(*) as total FROM tickets');
    console.log(`   ✅ Tabla reiniciada: ${afterReset[0].total} registros`);

    // Verificar estructura de la tabla
    console.log('\n🔍 VERIFICANDO ESTRUCTURA DE LA TABLA:');
    const [structure] = await connection.query('DESCRIBE tickets');
    console.log('   Columnas disponibles:');
    structure.forEach(col => {
      console.log(`     - ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''}`);
    });

    // Verificar AUTO_INCREMENT
    const [autoIncrement] = await connection.query(`
      SELECT AUTO_INCREMENT 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets'
    `);
    console.log(`   AUTO_INCREMENT reiniciado a: ${autoIncrement[0].AUTO_INCREMENT}`);

    // También limpiar tabla ticket_history relacionada
    console.log('\n🧹 LIMPIANDO HISTORIAL DE TICKETS...');
    const [historyCount] = await connection.query('SELECT COUNT(*) as total FROM ticket_history');
    console.log(`   Registros en ticket_history antes: ${historyCount[0].total}`);
    
    if (historyCount[0].total > 0) {
      await connection.query('TRUNCATE TABLE ticket_history');
      console.log('   ✅ Historial de tickets limpiado');
    }

    console.log('\n📈 RESUMEN DEL REINICIO:');
    console.log('========================');
    console.log(`✅ Tabla tickets reiniciada exitosamente`);
    console.log(`💾 Backup creado: ${backupTableName || 'No necesario (tabla vacía)'}`);
    console.log(`🔢 AUTO_INCREMENT reiniciado a: ${autoIncrement[0].AUTO_INCREMENT}`);
    console.log(`🧹 Historial de tickets limpiado`);
    console.log(`📊 Registros actuales: 0`);
    
    console.log('\n🎉 ¡REINICIO COMPLETADO!');
    console.log('   - La tabla tickets está completamente vacía');
    console.log('   - Los IDs comenzarán desde 1');
    console.log('   - El historial también fue limpiado');
    console.log('   - Los datos anteriores están respaldados');

  } catch (error) {
    console.error('❌ Error durante el reinicio:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) await connection.end();
  }
}

resetTicketsTable();
