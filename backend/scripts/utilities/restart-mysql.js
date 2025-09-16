import { query, testConnection } from './config/database.js';

async function restartMysqlConnections() {
  try {
    console.log('🔄 Reiniciando conexiones MySQL...');
    
    // Verificar conexión
    const connected = await testConnection();
    if (!connected) {
      throw new Error('No se pudo conectar a la base de datos');
    }
    
    // Matar procesos bloqueados (solo los que están en Sleep o esperando)
    console.log('📋 Verificando procesos activos...');
    const processes = await query('SHOW PROCESSLIST');
    
    console.log(`Encontrados ${processes.length} procesos activos`);
    
    // Liberar locks específicos
    console.log('🔓 Liberando locks...');
    await query('UNLOCK TABLES');
    
    // Verificar transacciones activas
    const transactions = await query(`
      SELECT trx_id, trx_state, trx_started, trx_mysql_thread_id 
      FROM INFORMATION_SCHEMA.INNODB_TRX
    `);
    
    console.log(`Transacciones activas: ${transactions.length}`);
    
    if (transactions.length > 0) {
      console.log('⚠️  Hay transacciones activas que pueden estar causando el bloqueo');
      transactions.forEach(trx => {
        console.log(`  - TRX ID: ${trx.trx_id}, Estado: ${trx.trx_state}, Thread: ${trx.trx_mysql_thread_id}`);
      });
    }
    
    console.log('✅ Proceso completado. Intenta aprobar el ticket nuevamente.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

restartMysqlConnections();
