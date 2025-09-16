import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function exportAllTables() {
  console.log('🔄 Exportando TODAS las tablas de la base de datos...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Crear directorio
    await fs.mkdir('./exports', { recursive: true });
    
    // Obtener todas las tablas
    console.log('📋 Obteniendo lista de todas las tablas...');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    console.log(`📊 Encontradas ${tableNames.length} tablas:`);
    tableNames.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });
    
    const exportedData = {};
    let totalRecords = 0;
    
    // Exportar cada tabla
    for (const tableName of tableNames) {
      try {
        console.log(`\n📤 Exportando tabla: ${tableName}`);
        
        // Obtener estructura de la tabla
        const [structure] = await connection.execute(`DESCRIBE ${tableName}`);
        
        // Obtener datos de la tabla
        const [data] = await connection.execute(`SELECT * FROM ${tableName}`);
        
        exportedData[tableName] = {
          structure: structure,
          data: data,
          count: data.length
        };
        
        totalRecords += data.length;
        console.log(`  ✅ ${data.length} registros exportados`);
        
        // Guardar cada tabla en archivo separado
        await fs.writeFile(
          `./exports/${tableName}.json`,
          JSON.stringify({
            table_name: tableName,
            structure: structure,
            data: data,
            export_date: new Date().toISOString()
          }, null, 2)
        );
        
      } catch (error) {
        console.log(`  ⚠️ Error exportando ${tableName}: ${error.message}`);
        exportedData[tableName] = {
          error: error.message,
          count: 0
        };
      }
    }
    
    // Crear archivo maestro con todo
    const masterExport = {
      export_info: {
        export_date: new Date().toISOString(),
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        total_tables: tableNames.length,
        total_records: totalRecords
      },
      tables: exportedData
    };
    
    await fs.writeFile(
      './exports/complete_database_export.json',
      JSON.stringify(masterExport, null, 2)
    );
    
    // Crear resumen
    const summary = {
      export_date: new Date().toISOString(),
      tables_exported: tableNames.length,
      total_records: totalRecords,
      tables_summary: Object.keys(exportedData).map(tableName => ({
        table: tableName,
        records: exportedData[tableName].count || 0,
        status: exportedData[tableName].error ? 'ERROR' : 'OK'
      }))
    };
    
    await fs.writeFile(
      './exports/export_summary.json',
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n✅ Exportación completa terminada!');
    console.log(`📊 Resumen:`);
    console.log(`   📋 Tablas exportadas: ${tableNames.length}`);
    console.log(`   📝 Total registros: ${totalRecords}`);
    console.log(`   📁 Archivos creados: ${tableNames.length + 2}`);
    
    console.log('\n📋 Detalle por tabla:');
    Object.keys(exportedData).forEach(tableName => {
      const table = exportedData[tableName];
      const status = table.error ? '❌' : '✅';
      const count = table.count || 0;
      console.log(`   ${status} ${tableName}: ${count} registros`);
    });
    
  } finally {
    await connection.end();
  }
}

exportAllTables().catch(console.error);
