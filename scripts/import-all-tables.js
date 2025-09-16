import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function importAllTables() {
  console.log('🔄 Iniciando importación completa de TODAS las tablas...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('✅ Conexión establecida');
    
    // Leer el resumen de exportación
    const summaryData = JSON.parse(await fs.readFile('./exports/export_summary.json', 'utf8'));
    const tablesToImport = summaryData.tables_summary.filter(t => t.status === 'OK');
    
    console.log(`📋 Se importarán ${tablesToImport.length} tablas con ${summaryData.total_records} registros`);
    
    // Desactivar verificaciones de claves foráneas temporalmente
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    let totalImported = 0;
    
    // Importar cada tabla
    for (const tableInfo of tablesToImport) {
      const tableName = tableInfo.table;
      
      try {
        console.log(`\n📤 Importando tabla: ${tableName}`);
        
        // Leer datos de la tabla
        const tableData = JSON.parse(await fs.readFile(`./exports/${tableName}.json`, 'utf8'));
        const { structure, data } = tableData;
        
        if (!data || data.length === 0) {
          console.log(`  ⚠️ Tabla ${tableName} está vacía, omitiendo...`);
          continue;
        }
        
        // Crear la tabla basada en la estructura exportada
        console.log(`  🔧 Creando estructura de tabla ${tableName}...`);
        
        // Construir CREATE TABLE statement
        const columns = structure.map(col => {
          let columnDef = `${col.Field} ${col.Type}`;
          
          if (col.Null === 'NO') columnDef += ' NOT NULL';
          if (col.Default !== null && col.Default !== 'NULL') {
            if (col.Default === 'CURRENT_TIMESTAMP' || col.Default.includes('CURRENT_TIMESTAMP')) {
              columnDef += ` DEFAULT ${col.Default}`;
            } else {
              columnDef += ` DEFAULT '${col.Default}'`;
            }
          }
          if (col.Extra) columnDef += ` ${col.Extra}`;
          
          return columnDef;
        });
        
        const primaryKey = structure.find(col => col.Key === 'PRI');
        if (primaryKey) {
          columns.push(`PRIMARY KEY (${primaryKey.Field})`);
        }
        
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            ${columns.join(',\n            ')}
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(`DROP TABLE IF EXISTS ${tableName}`);
        await connection.execute(createTableSQL);
        
        // Insertar datos
        if (data.length > 0) {
          const firstRow = data[0];
          const columnNames = Object.keys(firstRow);
          const placeholders = columnNames.map(() => '?').join(', ');
          
          const insertSQL = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`;
          
          let insertedCount = 0;
          for (const row of data) {
            try {
              const values = columnNames.map(col => {
                let value = row[col];
                // Manejar valores JSON
                if (typeof value === 'object' && value !== null) {
                  value = JSON.stringify(value);
                }
                return value;
              });
              
              await connection.execute(insertSQL, values);
              insertedCount++;
            } catch (insertError) {
              console.log(`    ⚠️ Error insertando registro: ${insertError.message}`);
            }
          }
          
          console.log(`  ✅ ${insertedCount}/${data.length} registros importados`);
          totalImported += insertedCount;
        }
        
      } catch (error) {
        console.log(`  ❌ Error importando ${tableName}: ${error.message}`);
      }
    }
    
    // Reactivar verificaciones de claves foráneas
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    // Verificar importación
    console.log('\n🔍 Verificando importación...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📋 Tablas creadas: ${tables.length}`);
    
    // Mostrar conteo por tabla
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      try {
        const [count] = await connection.execute(`SELECT COUNT(*) as total FROM ${tableName}`);
        console.log(`  📊 ${tableName}: ${count[0].total} registros`);
      } catch (error) {
        console.log(`  ⚠️ ${tableName}: Error contando registros`);
      }
    }
    
    console.log('\n✅ Importación completa terminada!');
    console.log(`📊 Resumen:`);
    console.log(`   📋 Tablas procesadas: ${tablesToImport.length}`);
    console.log(`   📝 Registros importados: ${totalImported}`);
    console.log(`   📋 Tablas creadas: ${tables.length}`);
    
  } catch (error) {
    console.error('❌ Error durante la importación:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

importAllTables().catch(console.error);
