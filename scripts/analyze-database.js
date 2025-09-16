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

async function analyzeDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión exitosa a la base de datos\n');

    // Obtener todas las tablas
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 TABLAS EXISTENTES EN LA BASE DE DATOS:');
    console.log('==========================================');
    
    const tableAnalysis = [];
    
    for (const tableRow of tables) {
      const tableName = tableRow.Tables_in_railway;
      
      try {
        // Obtener información de la tabla
        const [tableInfo] = await connection.query(`
          SELECT 
            TABLE_NAME,
            TABLE_ROWS,
            DATA_LENGTH,
            INDEX_LENGTH,
            CREATE_TIME,
            UPDATE_TIME
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `, [dbConfig.database, tableName]);
        
        // Obtener estructura de columnas
        const [columns] = await connection.query(`DESCRIBE ${tableName}`);
        
        // Contar registros reales
        const [count] = await connection.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        
        const analysis = {
          name: tableName,
          rows: count[0].total,
          columns: columns.length,
          size: tableInfo[0]?.DATA_LENGTH || 0,
          created: tableInfo[0]?.CREATE_TIME,
          updated: tableInfo[0]?.UPDATE_TIME,
          structure: columns.map(col => ({
            field: col.Field,
            type: col.Type,
            null: col.Null,
            key: col.Key,
            default: col.Default
          }))
        };
        
        tableAnalysis.push(analysis);
        
        console.log(`\n🔍 ${tableName.toUpperCase()}`);
        console.log(`   Registros: ${analysis.rows}`);
        console.log(`   Columnas: ${analysis.columns}`);
        console.log(`   Tamaño: ${(analysis.size / 1024).toFixed(2)} KB`);
        console.log(`   Creada: ${analysis.created || 'N/A'}`);
        console.log(`   Actualizada: ${analysis.updated || 'N/A'}`);
        
        // Mostrar estructura básica
        console.log('   Columnas principales:');
        analysis.structure.slice(0, 5).forEach(col => {
          console.log(`     - ${col.field} (${col.type}) ${col.key ? '[' + col.key + ']' : ''}`);
        });
        if (analysis.structure.length > 5) {
          console.log(`     ... y ${analysis.structure.length - 5} más`);
        }
        
      } catch (error) {
        console.log(`\n❌ Error analizando tabla ${tableName}: ${error.message}`);
      }
    }
    
    // Resumen final
    console.log('\n\n📊 RESUMEN DE ANÁLISIS:');
    console.log('=======================');
    console.log(`Total de tablas: ${tableAnalysis.length}`);
    
    // Tablas con datos
    const tablesWithData = tableAnalysis.filter(t => t.rows > 0);
    console.log(`Tablas con datos: ${tablesWithData.length}`);
    tablesWithData.forEach(t => {
      console.log(`  - ${t.name}: ${t.rows} registros`);
    });
    
    // Tablas vacías
    const emptyTables = tableAnalysis.filter(t => t.rows === 0);
    console.log(`\nTablas vacías: ${emptyTables.length}`);
    emptyTables.forEach(t => {
      console.log(`  - ${t.name}`);
    });
    
    // Guardar análisis completo
    const fs = await import('fs');
    fs.writeFileSync('database-analysis.json', JSON.stringify(tableAnalysis, null, 2));
    console.log('\n💾 Análisis completo guardado en database-analysis.json');
    
  } catch (error) {
    console.error('❌ Error al analizar la base de datos:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

analyzeDatabase();
