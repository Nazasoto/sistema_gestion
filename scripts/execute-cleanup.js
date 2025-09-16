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

async function executeCleanup() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión exitosa a la base de datos\n');

    // Verificar conexión y base de datos actual
    const [dbInfo] = await connection.query('SELECT DATABASE() as current_database, NOW() as execution_time');
    console.log('📋 Información de la base de datos:');
    console.log(`   Base de datos: ${dbInfo[0].current_database}`);
    console.log(`   Hora de ejecución: ${dbInfo[0].execution_time}\n`);

    // Mostrar tablas antes de la limpieza
    console.log('📊 TABLAS ANTES DE LA LIMPIEZA:');
    const [tablesBefore] = await connection.query('SHOW TABLES');
    console.log(`   Total de tablas: ${tablesBefore.length}`);
    tablesBefore.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.Tables_in_railway}`);
    });

    console.log('\n🗑️ INICIANDO LIMPIEZA DE TABLAS VACÍAS...\n');

    // Tablas a eliminar (solo las vacías para mayor seguridad)
    const tablasAEliminar = [
      'old_tickets_backup_final',
      'ticket_approvals_backup_final', 
      'tickets_backup_1757003045508'
    ];

    let tablasEliminadas = 0;
    let errores = 0;

    for (const tabla of tablasAEliminar) {
      try {
        // Verificar si la tabla existe y está vacía
        const [exists] = await connection.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() AND table_name = ?
        `, [tabla]);

        if (exists[0].count > 0) {
          // Verificar que esté vacía
          const [count] = await connection.query(`SELECT COUNT(*) as total FROM ${tabla}`);
          
          if (count[0].total === 0) {
            // Eliminar tabla vacía
            await connection.query(`DROP TABLE IF EXISTS \`${tabla}\``);
            console.log(`   ✅ Eliminada: ${tabla} (0 registros)`);
            tablasEliminadas++;
          } else {
            console.log(`   ⚠️  Omitida: ${tabla} (${count[0].total} registros - no vacía)`);
          }
        } else {
          console.log(`   ℹ️  No existe: ${tabla}`);
        }
      } catch (error) {
        console.log(`   ❌ Error eliminando ${tabla}: ${error.message}`);
        errores++;
      }
    }

    console.log('\n📊 TABLAS DESPUÉS DE LA LIMPIEZA:');
    const [tablesAfter] = await connection.query('SHOW TABLES');
    console.log(`   Total de tablas: ${tablesAfter.length}`);
    tablesAfter.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.Tables_in_railway}`);
    });

    console.log('\n🔍 VERIFICACIÓN DE TABLAS PRINCIPALES:');
    const verificacionQuery = `
      SELECT 'tickets' as tabla, COUNT(*) as registros FROM tickets
      UNION ALL
      SELECT 'usuarios' as tabla, COUNT(*) as registros FROM usuarios  
      UNION ALL
      SELECT 'sucursales' as tabla, COUNT(*) as registros FROM sucursales
      UNION ALL
      SELECT 'ticket_history' as tabla, COUNT(*) as registros FROM ticket_history
      UNION ALL
      SELECT 'password_resets' as tabla, COUNT(*) as registros FROM password_resets
      UNION ALL
      SELECT 'noticias' as tabla, COUNT(*) as registros FROM noticias
    `;
    
    const [verificacion] = await connection.query(verificacionQuery);
    verificacion.forEach(row => {
      console.log(`   ✅ ${row.tabla}: ${row.registros} registros`);
    });

    console.log('\n📈 RESUMEN DE LA LIMPIEZA:');
    console.log('==========================');
    console.log(`✅ Tablas eliminadas: ${tablasEliminadas}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📊 Tablas antes: ${tablesBefore.length}`);
    console.log(`📊 Tablas después: ${tablesAfter.length}`);
    console.log(`🎯 Reducción: ${tablesBefore.length - tablesAfter.length} tablas`);
    
    if (tablasEliminadas > 0) {
      console.log('\n🎉 ¡Limpieza completada exitosamente!');
      console.log('   - Se eliminaron solo tablas vacías');
      console.log('   - Todas las tablas principales están intactas');
      console.log('   - El sistema funcionará normalmente');
    } else {
      console.log('\n ℹ️  No se eliminaron tablas (posiblemente ya estaban limpias)');
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

executeCleanup();
